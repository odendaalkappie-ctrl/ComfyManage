import { GoogleGenAI, Type } from "@google/genai";
import { ScannedItem, EnrichedResource, ResourceType } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing in environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeResourcesWithGemini = async (items: ScannedItem[]): Promise<EnrichedResource[]> => {
  const ai = getClient();
  const model = "gemini-2.5-flash"; // Good balance of speed and reasoning for this task

  // Split into chunks to avoid token limits if the workflow is huge
  const BATCH_SIZE = 20;
  const chunks = [];
  
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    chunks.push(items.slice(i, i + BATCH_SIZE));
  }

  let allEnriched: EnrichedResource[] = [];

  for (const chunk of chunks) {
    const prompt = `
      You are an expert in Stable Diffusion and ComfyUI.
      I have a list of filenames and node class types extracted from a ComfyUI workflow.
      
      Your task is:
      1. Identify the resource type (Checkpoint, LoRA, VAE, ControlNet, Upscaler, Custom Node, etc.).
      2. Suggest the standard installation path relative to the ComfyUI root folder.
      3. Suggest a likely download URL.
         - For models (Checkpoint, LoRA, VAE, etc.): **Strictly prioritize direct download links** from platforms like Civitai, Hugging Face, or official project pages. The URL should point directly to the model file if possible, or its Civitai/Hugging Face page.
         - For custom nodes: **Always provide the full GitHub repository URL**.
         - **Fallback Strategy**: If a direct download URL for a model or a main repository URL for a custom node is not immediately obvious, provide a highly relevant Google search query or a general landing page where the resource is likely found. Indicate if this is a fallback by starting the downloadUrl with 'SEARCH: ' or 'PAGE: ' respectively.
      4. Classify the system requirement: 'GPU' for heavy model files (checkpoints, loras, vae, controlnet) that use VRAM, or 'CPU' for custom nodes/scripts that run on logic.
      5. Estimate the file size (e.g., "2GB" for checkpoints, "144MB" for LoRAs, "50KB" for nodes).
      
      Input Items:
      ${JSON.stringify(chunk.map(i => ({ rawName: i.rawName, isNode: i.isNode })))}
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              rawName: { type: Type.STRING, description: "The original name provided in input" },
              name: { type: Type.STRING, description: "Clean, readable name of the resource" },
              type: { 
                type: Type.STRING, 
                enum: [
                  ResourceType.CHECKPOINT, ResourceType.LORA, ResourceType.VAE, 
                  ResourceType.EMBEDDING, ResourceType.CONTROLNET, ResourceType.UPSCALER, 
                  ResourceType.CUSTOM_NODE, ResourceType.UNKNOWN
                ] 
              },
              targetPath: { type: Type.STRING, description: "The recommended installation path relative to the ComfyUI root." },
              computeType: {
                type: Type.STRING,
                enum: ['GPU', 'CPU'],
                description: "GPU for model files (VRAM heavy), CPU for code/nodes."
              },
              fileSize: { 
                type: Type.STRING, 
                description: "Estimated file size (e.g. '2GB', '150MB', '5KB'). Use 'N/A' if unknown." 
              },
              description: { type: Type.STRING, description: "Brief description of what this model/node does" },
              downloadUrl: { type: Type.STRING, description: "Direct download link or repository URL, prioritizing direct links for models and GitHub repo for custom nodes." },
            },
            required: ["rawName", "name", "type", "targetPath", "downloadUrl", "computeType", "fileSize"]
          }
        }
      }
    });

    if (response.text) {
      try {
        const jsonResponse = JSON.parse(response.text);
        
        // Merge AI response with original IDs
        const mergedChunk = jsonResponse.map((res: any) => {
          const original = chunk.find(c => c.rawName === res.rawName);
          return {
            id: original ? original.id : crypto.randomUUID(),
            rawName: res.rawName,
            isNode: original ? original.isNode : false,
            name: res.name,
            type: res.type as ResourceType,
            description: res.description,
            targetPath: res.targetPath,
            downloadUrl: res.downloadUrl,
            computeType: res.computeType || (res.type === ResourceType.CUSTOM_NODE ? 'CPU' : 'GPU'),
            fileSize: res.fileSize || 'N/A',
            confidence: 0.9 // Static confidence for this demo
          };
        });
        
        allEnriched = [...allEnriched, ...mergedChunk];
      } catch (e) {
        console.error("Failed to parse Gemini response chunk", e);
      }
    }
  }

  return allEnriched;
};