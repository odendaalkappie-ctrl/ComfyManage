import React from 'react';
import { X, Trash2, ExternalLink, Calendar, Package } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryModalProps {
  history: HistoryItem[];
  onClose: () => void;
  onClear: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ history, onClose, onClear }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/80 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 w-full max-w-3xl h-[80vh] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-500/10 rounded-lg">
              <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-gray-900 dark:text-white font-semibold">Download History</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Previously generated resources</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-0">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Package className="w-12 h-12 mb-4 opacity-20" />
              <p>No history yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {history.map((item) => (
                <div key={`${item.id}-${item.dateAdded}`} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                        {item.type}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.dateAdded).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate" title={item.name}>
                      {item.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono mt-0.5">
                      {item.downloadUrl}
                    </p>
                  </div>
                  <a 
                    href={item.downloadUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex justify-end">
          <button 
            onClick={onClear}
            disabled={history.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Clear History
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;