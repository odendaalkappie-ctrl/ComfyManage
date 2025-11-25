
import React, { useState, useRef, useMemo } from 'react';
import { 
  Download, ExternalLink, Trash2, Box, Cpu, HardDrive, 
  Wand2, Database, AlertTriangle, CheckCircle, Activity,
  Minimize2, GitCommit, Scaling, Zap, Server, History, AlertCircle, ChevronDown, GripVertical
} from 'lucide-react';
import { EnrichedResource, ResourceType } from '../types';

interface ResourceManagerProps {
  resources: EnrichedResource[];
  setResources: React.Dispatch<React.SetStateAction<EnrichedResource[]>>;
  onGenerateScript: () => void;
  onViewHistory: () => void;
}

const ResourceManager: React.FC<ResourceManagerProps> = ({ resources, setResources, onGenerateScript, onViewHistory }) => {
  const [typeFilter, setTypeFilter] = useState<ResourceType | 'ALL'>('ALL');
  const [computeFilter, setComputeFilter] = useState<'ALL' | 'GPU' | 'CPU'>('ALL');
  const [sortBy, setSortBy] = useState<'default' | 'nameAsc' | 'nameDesc' | 'type' | 'fileSizeAsc' | 'fileSizeDesc'>('default');

  const draggedItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);

  // Helper to parse file size for sorting
  const getNumericFileSize = (size: string): number => {
    if (!size || size === 'N/A') return 0;
    const value = parseFloat(size);
    if (isNaN(value)) return 0;
    if (size.toLowerCase().includes('kb')) return value * 1024;
    if (size.toLowerCase().includes('mb')) return value * 1024 * 1024;
    if (size.toLowerCase().includes('gb')) return value * 1024 * 1024 * 1024;
    return value; // Assume bytes or unknown unit if no suffix
  };

  const handleDelete = (id: string) => {
    setResources(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdate = (id: string, field: keyof EnrichedResource, value: string | number | ResourceType) => {
    setResources(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    draggedItemIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString()); // Required for Firefox
    e.currentTarget.classList.add('opacity-50', 'ring-2', 'ring-indigo-400'); // Visual feedback for dragged item
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragOverItemIndex.current = index;
    // Add visual indicator for drag-over effect
    const targetElement = e.currentTarget as HTMLDivElement;
    if (draggedItemIndex.current !== index) { // Don't highlight if dragging over itself
      targetElement.classList.add('drag-over-indicator');
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Remove visual indicator
    const targetElement = e.currentTarget as HTMLDivElement;
    targetElement.classList.remove('drag-over-indicator');
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Essential to allow dropping
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedItemIndex.current === null || dragOverItemIndex.current === null || draggedItemIndex.current === dragOverItemIndex.current) {
      // Clean up all drag-over indicators
      document.querySelectorAll('.drag-over-indicator').forEach(el => el.classList.remove('drag-over-indicator'));
      return;
    }

    const newResources = [...resources]; // Operate on the main resources array
    const [reorderedItem] = newResources.splice(draggedItemIndex.current, 1);
    newResources.splice(dragOverItemIndex.current, 0, reorderedItem);

    setResources(newResources); // Update the global state
    setSortBy('default'); // Reset sorting to default after manual reorder
    draggedItemIndex.current = null;
    dragOverItemIndex.current = null;
    
    // Clean up all drag-over indicators
    document.querySelectorAll('.drag-over-indicator').forEach(el => el.classList.remove('drag-over-indicator'));
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50', 'ring-2', 'ring-indigo-400'); // Remove visual feedback for dragged item
    draggedItemIndex.current = null;
    dragOverItemIndex.current = null;
    // Clean up any remaining visual indicators
    document.querySelectorAll('.drag-over-indicator').forEach(el => el.classList.remove('drag-over-indicator'));
  };

  // Apply sorting and filtering
  const sortedAndFilteredResources = useMemo(() => {
    let currentResources = [...resources]; // Start with the global resources array

    // Apply filtering first
    let filtered = currentResources.filter(r => {
      const typeMatch = typeFilter === 'ALL' || r.type === typeFilter;
      const computeMatch = computeFilter === 'ALL' || r.computeType === computeFilter;
      return typeMatch && computeMatch;
    });

    // Then apply sorting (only if not 'default' as default implies manual order)
    if (sortBy !== 'default') {
      switch (sortBy) {
        case 'nameAsc':
          filtered.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'nameDesc':
          filtered.sort((a, b) => b.name.localeCompare(a.name));
          break;
        case 'type':
          filtered.sort((a, b) => a.type.localeCompare(b.type));
          break;
        case 'fileSizeAsc':
          filtered.sort((a, b) => getNumericFileSize(a.fileSize) - getNumericFileSize(b.fileSize));
          break;
        case 'fileSizeDesc':
          filtered.sort((a, b) => getNumericFileSize(b.fileSize) - getNumericFileSize(a.fileSize));
          break;
      }
    }
    return filtered;
  }, [resources, typeFilter, computeFilter, sortBy]);


  const getTypeIcon = (type: ResourceType) => {
    switch (type) {
      case ResourceType.CUSTOM_NODE: return <Cpu className="w-4 h-4 text-orange-500 dark:text-orange-400" />;
      case ResourceType.CHECKPOINT: return <Database className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
      case ResourceType.LORA: return <Wand2 className="w-4 h-4 text-purple-500 dark:text-purple-400" />;
      case ResourceType.VAE: return <Minimize2 className="w-4 h-4 text-pink-500 dark:text-pink-400" />;
      case ResourceType.CONTROLNET: return <GitCommit className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />;
      case ResourceType.UPSCALER: return <Scaling className="w-4 h-4 text-teal-500 dark:text-teal-400" />;
      case ResourceType.EMBEDDING: return <Zap className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />; 
      default: return <Box className="w-4 h-4 text-gray-400" />;
    }
  };

  const getBadgeColor = (type: ResourceType) => {
     switch (type) {
      case ResourceType.CUSTOM_NODE: return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20';
      case ResourceType.CHECKPOINT: return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
      case ResourceType.LORA: return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20';
      case ResourceType.VAE: return 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/20';
      case ResourceType.CONTROLNET: return 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20';
      case ResourceType.UPSCALER: return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20';
      case ResourceType.EMBEDDING: return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20';
      default: return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 dark:text-green-400';
    if (score >= 0.5) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getConfidenceAccent = (score: number) => {
    if (score >= 0.8) return 'accent-green-600 dark:accent-green-500';
    if (score >= 0.5) return 'accent-amber-600 dark:accent-amber-500';
    return 'accent-red-600 dark:accent-red-500';
  };

  return (
    <div className="w-full max-w-7xl mx-auto mt-8 px-4 pb-20">
      
      {/* Controls */}
      <div className="flex flex-col gap-4 mb-6">
        
        {/* Top Bar: Filters and Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          <div className="flex flex-wrap gap-2">
            {['ALL', ResourceType.CHECKPOINT, ResourceType.LORA, ResourceType.VAE, ResourceType.CONTROLNET, ResourceType.CUSTOM_NODE, ResourceType.EMBEDDING].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  typeFilter === t 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750 border border-gray-200 dark:border-transparent'
                }`}
              >
                {t === 'ALL' ? 'All Types' : t.replace('_', ' ')}
              </button>
            ))}
            {/* Sort By Dropdown */}
            <div className="relative inline-block text-left">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="block w-full px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750 border border-gray-200 dark:border-transparent appearance-none pr-8 cursor-pointer"
                aria-label="Sort resources by"
              >
                <option value="default">Default Order</option>
                <option value="nameAsc">Name (A-Z)</option>
                <option value="nameDesc">Name (Z-A)</option>
                <option value="type">Type</option>
                <option value="fileSizeAsc">Size (Small to Large)</option>
                <option value="fileSizeDesc">Size (Large to Small)</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
             <button 
              onClick={onViewHistory}
              className="flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg font-medium transition-all ml-auto md:ml-0"
            >
              <History className="w-4 h-4" />
              History
            </button>
            <button 
              onClick={onGenerateScript}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-lg font-medium shadow-lg shadow-green-500/20 transition-all w-full md:w-auto"
            >
              <Download className="w-4 h-4" />
              Generate Installer
            </button>
          </div>
        </div>

        {/* Secondary Filter: System Requirements */}
        <div className="flex items-center gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">System Req:</span>
          <button 
            onClick={() => setComputeFilter('ALL')}
            className={`text-sm flex items-center gap-2 transition-colors ${computeFilter === 'ALL' ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            All
          </button>
          <button 
             onClick={() => setComputeFilter('GPU')}
             className={`text-sm flex items-center gap-1 transition-colors ${computeFilter === 'GPU' ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Zap className="w-3 h-3" />
            GPU / VRAM Heavy
          </button>
          <button 
             onClick={() => setComputeFilter('CPU')}
             className={`text-sm flex items-center gap-1 transition-colors ${computeFilter === 'CPU' ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Server className="w-3 h-3" />
            CPU / Light
          </button>
        </div>

      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4">
        {sortedAndFilteredResources.length === 0 ? (
           <div className="text-center py-20 bg-white dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 transition-colors duration-300">
             <p className="text-gray-500">No resources found matching the filter.</p>
           </div>
        ) : (
          sortedAndFilteredResources.map((res, index) => (
            <div 
              key={res.id} 
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 flex flex-col md:flex-row gap-6 group hover:border-gray-300 dark:hover:border-gray-700 transition-colors duration-300 shadow-sm dark:shadow-none"
              draggable="true"
              onDragStart={(e) => handleDragStart(e, resources.indexOf(res))} // Pass actual index in the `resources` array
              onDragEnter={(e) => handleDragEnter(e, resources.indexOf(res))}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            >
              {/* Left: Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <GripVertical className="w-4 h-4 text-gray-400 cursor-grab active:cursor-grabbing opacity-70 hover:opacity-100 transition-opacity flex-shrink-0" />
                  {/* Resource Type Dropdown */}
                  <div className={`relative flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold border ${getBadgeColor(res.type)}`}>
                    {getTypeIcon(res.type)}
                    <select
                      value={res.type}
                      onChange={(e) => handleUpdate(res.id, 'type', e.target.value as ResourceType)}
                      className="bg-transparent text-current outline-none border-none cursor-pointer flex-1 appearance-none pr-4" // pr-4 for space for custom arrow
                      aria-label={`Select resource type for ${res.name}`}
                    >
                      {Object.values(ResourceType)
                        .filter(type => type !== ResourceType.UNKNOWN) // Exclude UNKNOWN for manual selection
                        .map(type => (
                          <option key={type} value={type}>
                            {type.replace('_', ' ')}
                          </option>
                        ))}
                    </select>
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDown className="w-3 h-3" />
                    </span>
                  </div>
                  
                  {/* Compute Type Badge */}
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                    res.computeType === 'GPU' 
                      ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30' 
                      : 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-800'
                  }`}>
                    {res.computeType}
                  </span>

                  {/* File Size Badge */}
                  <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                    {res.fileSize || 'N/A'}
                  </span>

                  <h4 className="text-gray-900 dark:text-white font-medium truncate">{res.name}</h4>
                  
                  {res.type === ResourceType.CUSTOM_NODE && (
                    <div className="relative group/tooltip">
                      <AlertCircle className="w-4 h-4 text-orange-500 dark:text-orange-400 cursor-help" />
                      <div className="absolute hidden group-hover/tooltip:block bg-gray-800 text-white text-xs rounded-md py-1 px-2 -top-full left-1/2 -translate-x-1/2 mt-8 whitespace-nowrap z-10 shadow-lg after:content-[''] after:absolute after:top-0 after:left-1/2 after:-translate-x-1/2 after:h-2 after:w-2 after:bg-gray-800 after:rotate-45 after:-mt-1">
                        Custom node: May require extra installation steps (e.g., `pip install -r requirements.txt`).
                      </div>
                    </div>
                  )}
                </div>
                
                <textarea 
                  value={res.description}
                  onChange={(e) => handleUpdate(res.id, 'description', e.target.value)}
                  placeholder="Add description..."
                  className="w-full bg-transparent text-gray-600 dark:text-gray-400 text-sm mb-3 focus:text-gray-900 dark:focus:text-gray-200 focus:bg-gray-50 dark:focus:bg-black/20 border border-transparent focus:border-gray-300 dark:focus:border-gray-700 rounded p-1.5 -ml-1.5 outline-none resize-none transition-all"
                  rows={2}
                />
                
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500 font-mono bg-gray-100 dark:bg-black/20 p-2 rounded w-fit">
                       <HardDrive className="w-3 h-3" />
                       <input 
                          type="text" 
                          value={res.targetPath}
                          onChange={(e) => handleUpdate(res.id, 'targetPath', e.target.value)}
                          className="bg-transparent outline-none border-b border-gray-300 dark:border-gray-700 focus:border-indigo-500 w-48 md:w-64 text-gray-700 dark:text-gray-300"
                        />
                       <span className="text-gray-400 px-1">/</span>
                       <span className="text-gray-500 dark:text-gray-400 truncate max-w-[150px]">{res.rawName}</span>
                    </div>

                    <div className="flex items-center gap-2 px-2 py-1 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-gray-800 transition-colors">
                      <Activity className={`w-3 h-3 ${getConfidenceColor(res.confidence)}`} />
                      <div className="flex flex-col w-24">
                        <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400 mb-0.5">
                          <span>Confidence</span>
                          <span className={getConfidenceColor(res.confidence)}>{Math.round(res.confidence * 100)}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.05"
                          value={res.confidence}
                          onChange={(e) => handleUpdate(res.id, 'confidence', parseFloat(e.target.value))}
                          className={`w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer ${getConfidenceAccent(res.confidence)}`}
                        />
                      </div>
                    </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex flex-col gap-3 min-w-[300px]">
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-gray-400 uppercase font-bold tracking-wider">Source</span>
                  <input 
                    type="text" 
                    value={res.downloadUrl}
                    onChange={(e) => handleUpdate(res.id, 'downloadUrl', e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg py-2 pl-3 pr-10 pt-7 text-sm text-blue-600 dark:text-blue-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                  <a href={res.downloadUrl} target="_blank" rel="noreferrer" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <div className="flex justify-end gap-2">
                   <button 
                     onClick={() => handleDelete(res.id)}
                     className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-400/10 rounded-lg transition-colors"
                     title="Remove from list"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ResourceManager;
