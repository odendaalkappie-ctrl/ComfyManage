import React, { useCallback } from 'react';
import { Upload, FileJson, AlertCircle, Play, Image as ImageIcon, Zap, MonitorPlay } from 'lucide-react';

interface FileUploaderProps {
  onFileLoaded: (content: string, filename: string, size: number) => void;
}

const SAMPLE_WORKFLOWS = [
  {
    id: 't2i_v15',
    name: 'Text to Image (SD 1.5)',
    description: 'Basic generation with Checkpoint & VAE',
    systemReq: 'Low VRAM',
    icon: <ImageIcon className="w-4 h-4" />,
    data: {
      "4": { "inputs": { "ckpt_name": "v1-5-pruned-emaonly.ckpt" }, "class_type": "CheckpointLoaderSimple" },
      "5": { "inputs": { "width": 512, "height": 512, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
      "6": { "inputs": { "text": "beautiful scenery nature glass bottle landscape, purple galaxy bottle,", "clip": ["4", 1] }, "class_type": "CLIPTextEncode" },
      "8": { "inputs": { "samples": ["3", 0], "vae": ["4", 2] }, "class_type": "VAEDecode" }
    }
  },
  {
    id: 'i2i_controlnet',
    name: 'Image to Image (ControlNet)',
    description: 'Face swap & edge detection workflow',
    systemReq: 'Med VRAM',
    icon: <MonitorPlay className="w-4 h-4" />,
    data: {
      "10": { "inputs": { "lora_name": "add_detail.safetensors" }, "class_type": "LoraLoader" },
      "11": { "inputs": { "control_net_name": "control_v11p_sd15_canny.pth" }, "class_type": "ControlNetLoader" },
      "12": { "class_type": "ReactorFaceSwap", "inputs": {} },
      "13": { "inputs": { "vae_name": "vae-ft-mse-840000-ema-pruned.safetensors" }, "class_type": "VAELoader" },
      "14": { "inputs": { "image": "input_example.png" }, "class_type": "LoadImage" }
    }
  },
  {
    id: 't2i_sdxl',
    name: 'SDXL Refiner (High Quality)',
    description: 'Complex workflow with Refiner model',
    systemReq: 'High VRAM',
    icon: <Zap className="w-4 h-4 text-amber-500" />,
    data: {
      "4": { "inputs": { "ckpt_name": "sd_xl_base_1.0.safetensors" }, "class_type": "CheckpointLoaderSimple" },
      "10": { "inputs": { "ckpt_name": "sd_xl_refiner_1.0.safetensors" }, "class_type": "CheckpointLoaderSimple" },
      "22": { "inputs": { "width": 1024, "height": 1024 }, "class_type": "EmptyLatentImage" },
      "30": { "inputs": {}, "class_type": "Note", "content": "SDXL requires 1024x1024 resolution" }
    }
  }
];

const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoaded }) => {
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onFileLoaded(content, file.name, file.size);
    };
    reader.readAsText(file);
  }, [onFileLoaded]);

  const loadSample = (sample: typeof SAMPLE_WORKFLOWS[0]) => {
    const content = JSON.stringify(sample.data, null, 2);
    onFileLoaded(content, `${sample.id}.json`, content.length);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-12 px-4">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-500"></div>
        <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 md:p-12 text-center overflow-hidden transition-colors duration-300">
          
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full group-hover:scale-110 transition-transform duration-300">
              <Upload className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />
            </div>
          </div>

          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Upload Workflow
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Drop your ComfyUI <span className="text-indigo-500 dark:text-indigo-400 font-mono">.json</span> file here to automatically detect required models, LoRAs, and custom nodes.
          </p>

          <label className="inline-flex relative z-10 cursor-pointer">
            <span className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-8 rounded-lg transition-colors shadow-lg shadow-indigo-500/25">
              Select File
            </span>
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              onChange={handleFileChange}
            />
          </label>

          <div className="mt-10 border-t border-gray-100 dark:border-gray-800 pt-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Or try a sample workflow</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SAMPLE_WORKFLOWS.map((sample) => (
                <button
                  key={sample.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    loadSample(sample);
                  }}
                  className="flex flex-col items-start p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all text-left group/btn"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-indigo-600 dark:text-indigo-400 group-hover/btn:scale-110 transition-transform">
                      {sample.icon}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      sample.systemReq === 'High VRAM' 
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    }`}>
                      {sample.systemReq}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{sample.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{sample.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-500">
            <div className="flex items-center gap-1">
              <FileJson className="w-3 h-3" />
              <span>JSON Supported</span>
            </div>
             <div className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>Client-side parsing</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FileUploader;