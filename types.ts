export enum ResourceType {
  CHECKPOINT = 'CHECKPOINT',
  LORA = 'LORA',
  VAE = 'VAE',
  EMBEDDING = 'EMBEDDING',
  CONTROLNET = 'CONTROLNET',
  UPSCALER = 'UPSCALER',
  CUSTOM_NODE = 'CUSTOM_NODE',
  UNKNOWN = 'UNKNOWN'
}

export interface ScannedItem {
  id: string;
  rawName: string; // The filename or node class type found in JSON
  isNode: boolean; // True if it's a class type, False if it's a file parameter
}

export interface EnrichedResource extends ScannedItem {
  name: string;
  type: ResourceType;
  description: string;
  targetPath: string; // e.g., models/checkpoints
  downloadUrl: string; // Suggested URL
  confidence: number; // 0-1
  computeType: 'GPU' | 'CPU'; // GPU for models (VRAM/Storage heavy), CPU for nodes
  fileSize: string; // Estimated file size (e.g. "2GB")
}

export interface WorkflowMetadata {
  filename: string;
  nodeCount: number;
  fileSize: number;
}

export interface HistoryItem extends EnrichedResource {
  dateAdded: string; // ISO string
}