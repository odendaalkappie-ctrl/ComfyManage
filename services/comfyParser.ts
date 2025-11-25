import { ScannedItem } from '../types';

/**
 * Parses a raw JSON string from a ComfyUI workflow (API format or Saved format)
 * and extracts unique node types and referenced filenames.
 */
export const parseWorkflowData = (jsonString: string): ScannedItem[] => {
  let data: any;
  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    throw new Error("Invalid JSON format");
  }

  const items: Map<string, ScannedItem> = new Map();

  const addItem = (name: string, isNode: boolean) => {
    if (!name || typeof name !== 'string') return;
    const cleanName = name.trim();
    if (!items.has(cleanName)) {
      items.set(cleanName, {
        id: crypto.randomUUID(),
        rawName: cleanName,
        isNode,
      });
    }
  };

  // Helper to process input parameters for potential files
  const processInputs = (inputs: any) => {
    if (!inputs) return;
    const fileKeys = [
      'ckpt_name', 'lora_name', 'vae_name', 'control_net_name', 
      'upscale_model_name', 'model_name', 'embedding', 'image'
    ];
    
    // Iterate over known keys or values ending in common extensions
    for (const key in inputs) {
      const value = inputs[key];
      if (typeof value === 'string') {
        const lowerVal = value.toLowerCase();
        if (
          fileKeys.includes(key) || 
          lowerVal.endsWith('.safetensors') || 
          lowerVal.endsWith('.ckpt') || 
          lowerVal.endsWith('.pt') ||
          lowerVal.endsWith('.pth')
        ) {
          addItem(value, false);
        }
      }
    }
  };

  // Handle "Saved" format (has "nodes" array)
  if (data.nodes && Array.isArray(data.nodes)) {
    data.nodes.forEach((node: any) => {
      // 1. Capture Node Type (Custom Nodes)
      // Filter out standard nodes usually present in core
      if (node.type && !isCoreNode(node.type)) {
        addItem(node.type, true);
      }
      
      // 2. Capture Models within widgets_values (common in saved workflows)
      if (node.widgets_values && Array.isArray(node.widgets_values)) {
        node.widgets_values.forEach((val: any) => {
           if (typeof val === 'string') {
             const lowerVal = val.toLowerCase();
             if (lowerVal.endsWith('.safetensors') || lowerVal.endsWith('.ckpt')) {
                addItem(val, false);
             }
           }
        });
      }

      // 3. Capture Inputs (links handled separately, but inputs might contain model names)
      // Note: Saved format uses `widgets_values` mostly, but let's check input properties if they exist
    });
  } 
  // Handle "API" format (object where keys are IDs)
  else {
    for (const key in data) {
      const node = data[key];
      if (node.class_type && !isCoreNode(node.class_type)) {
        addItem(node.class_type, true);
      }
      if (node.inputs) {
        processInputs(node.inputs);
      }
    }
  }

  return Array.from(items.values());
};

// A small subset of standard nodes to reduce noise. 
// In a production app, this list would be much larger or fetched from a source.
const CORE_NODES = new Set([
  'KSampler', 'CheckpointLoaderSimple', 'CLIPTextEncode', 'VAEDecode', 'EmptyLatentImage',
  'SaveImage', 'PreviewImage', 'LoadImage', 'Note', 'PrimitiveNode', 'Reroute', 
  'LoraLoader', 'VAELoader', 'ControlNetLoader', 'UpscaleModelLoader', 'Group'
]);

const isCoreNode = (type: string) => {
  return CORE_NODES.has(type) || type.startsWith("ComfyUI"); // Very loose heuristic
};