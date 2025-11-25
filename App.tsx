import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FileUploader from './components/FileUploader';
import ResourceManager from './components/ResourceManager';
import ScriptPreview from './components/ScriptPreview';
import HistoryModal from './components/HistoryModal';
import { parseWorkflowData } from './services/comfyParser';
import { analyzeResourcesWithGemini } from './services/geminiService';
import { EnrichedResource, ScannedItem, WorkflowMetadata, HistoryItem } from './types';
import { Loader2, AlertCircle } from 'lucide-react';

enum AppState {
  IDLE,
  ANALYZING_LOCAL,
  ANALYZING_AI,
  REVIEW,
  ERROR
}

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [resources, setResources] = useState<EnrichedResource[]>([]);
  const [metadata, setMetadata] = useState<WorkflowMetadata | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // Modals
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('comfy_resource_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const addToHistory = () => {
    const timestamp = new Date().toISOString();
    const newItems: HistoryItem[] = resources.map(r => ({
      ...r,
      dateAdded: timestamp
    }));

    setHistory(prev => {
      // Deduplicate based on downloadUrl to avoid spamming the same link
      const existingUrls = new Set(prev.map(h => h.downloadUrl));
      const filteredNew = newItems.filter(i => i.downloadUrl && !existingUrls.has(i.downloadUrl));
      
      const updated = [...filteredNew, ...prev]; // Newest first
      localStorage.setItem('comfy_resource_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('comfy_resource_history');
  };

  const handleFileLoaded = async (content: string, filename: string, size: number) => {
    setAppState(AppState.ANALYZING_LOCAL);
    try {
      // 1. Local Parse
      const scannedItems = parseWorkflowData(content);
      
      setMetadata({
        filename,
        fileSize: size,
        nodeCount: scannedItems.length
      });

      if (scannedItems.length === 0) {
        throw new Error("No identifiable resources found in this workflow.");
      }

      // 2. AI Analysis
      setAppState(AppState.ANALYZING_AI);
      const enriched = await analyzeResourcesWithGemini(scannedItems);
      
      setResources(enriched);
      setAppState(AppState.REVIEW);

    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Failed to parse workflow.");
      setAppState(AppState.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans selection:bg-indigo-500/30 transition-colors duration-300">
      <Header />

      <main className="relative pb-20">
        
        {/* State: IDLE */}
        {appState === AppState.IDLE && (
          <FileUploader onFileLoaded={handleFileLoaded} />
        )}

        {/* State: LOADING */}
        {(appState === AppState.ANALYZING_LOCAL || appState === AppState.ANALYZING_AI) && (
          <div className="flex flex-col items-center justify-center mt-32 px-4">
             <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <Loader2 className="w-8 h-8 text-indigo-400 animate-pulse" />
                </div>
             </div>
             <h3 className="mt-8 text-xl font-semibold text-gray-900 dark:text-white">Analyzing Workflow</h3>
             <p className="mt-2 text-gray-500 dark:text-gray-400 text-center max-w-md">
               {appState === AppState.ANALYZING_LOCAL 
                 ? "Extracting nodes and parameters locally..." 
                 : "Consulting Gemini AI to identify models and download links..."}
             </p>
          </div>
        )}

        {/* State: ERROR */}
        {appState === AppState.ERROR && (
          <div className="max-w-md mx-auto mt-20 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl text-center">
             <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
             <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Processing Failed</h3>
             <p className="text-red-600 dark:text-red-300/70 mt-2 mb-6">{errorMsg}</p>
             <button 
               onClick={() => setAppState(AppState.IDLE)}
               className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
             >
               Try Again
             </button>
          </div>
        )}

        {/* State: REVIEW */}
        {appState === AppState.REVIEW && (
          <div className="animate-fade-in">
             <div className="max-w-7xl mx-auto px-4 mt-8 mb-4">
                <div className="flex items-baseline gap-4">
                   <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Review Resources</h2>
                   {metadata && (
                     <span className="text-sm text-gray-500 dark:text-gray-500">
                       {metadata.filename} • {resources.length} items detected
                     </span>
                   )}
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Gemini has attempted to identify download links. Please verify sources before generating the script.
                </p>
             </div>
             
             <ResourceManager 
               resources={resources} 
               setResources={setResources} 
               onGenerateScript={() => setShowScriptModal(true)}
               onViewHistory={() => setShowHistoryModal(true)}
             />
          </div>
        )}

      </main>

      {showScriptModal && (
        <ScriptPreview 
          resources={resources} 
          onClose={() => setShowScriptModal(false)} 
          onActionComplete={addToHistory}
        />
      )}

      {showHistoryModal && (
        <HistoryModal 
          history={history} 
          onClose={() => setShowHistoryModal(false)} 
          onClear={clearHistory}
        />
      )}
    </div>
  );
}