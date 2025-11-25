import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Terminal, AlertTriangle, FileCode, Play, Settings, FileDown } from 'lucide-react';
import { EnrichedResource, ResourceType } from '../types';

interface ScriptPreviewProps {
  resources: EnrichedResource[];
  onClose: () => void;
  onActionComplete: () => void; // Callback to save history
}

const ScriptPreview: React.FC<ScriptPreviewProps> = ({ resources, onClose, onActionComplete }) => {
  const [copied, setCopied] = React.useState(false);
  const [downloaded, setDownloaded] = React.useState(false);
  const [format, setFormat] = React.useState<'bash' | 'bat'>('bash');
  const [confirmed, setConfirmed] = React.useState(false); // Existing review confirmation
  const [validationErrors, setValidationErrors] = React.useState<{ resource: EnrichedResource; reason: string }[]>([]);
  const [showValidationWarning, setShowValidationWarning] = React.useState(true); // New state for validation modal

  // Helper for URL validation
  const isDirectDownloadUrl = (url: string, type: ResourceType): {isValid: boolean, reason?: string} => {
    if (!url || url.length < 5) { // Basic length check
      return { isValid: false, reason: "URL is empty or too short." };
    }

    const lowerUrl = url.toLowerCase();

    // Check for explicit fallback indicators
    if (lowerUrl.startsWith('search:')) {
      return { isValid: false, reason: "This is a search query, not a direct download link." };
    }
    if (lowerUrl.startsWith('page:')) {
      return { isValid: false, reason: "This is a general page, not a direct download link." };
    }

    // Basic http/https protocol check
    if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
        // Special handling for git SSH URLs for custom nodes
        if (type === ResourceType.CUSTOM_NODE && lowerUrl.startsWith('git@')) {
            if (lowerUrl.includes('github.com')) { // Ensure it's a GitHub SSH URL
                return { isValid: true };
            }
        }
        return { isValid: false, reason: "URL does not start with http(s):// or is not a recognized GitHub SSH URL." };
    }

    // More specific checks for GitHub for custom nodes
    if (type === ResourceType.CUSTOM_NODE) {
      if (!lowerUrl.includes('github.com')) {
        return { isValid: false, reason: "Custom Node URL should be a GitHub repository." };
      }
    } else {
      // For models, ensure it looks like a direct file or common model page
      // This is a heuristic, hard to be 100% sure client-side
      const commonModelHosts = ['civitai.com', 'huggingface.co', 'files.catbox.moe'];
      if (!commonModelHosts.some(host => lowerUrl.includes(host)) && !/\.(safetensors|ckpt|pt|pth|bin)$/i.test(lowerUrl)) {
        return { isValid: false, reason: "Model URL might not be a direct download or recognized hosting platform." };
      }
    }

    return { isValid: true };
  };

  useEffect(() => {
    const errors: { resource: EnrichedResource; reason: string }[] = [];
    resources.forEach(res => {
      const validation = isDirectDownloadUrl(res.downloadUrl, res.type);
      if (!validation.isValid) {
        errors.push({ resource: res, reason: validation.reason || "URL is potentially invalid or not a direct link." });
      }
    });
    setValidationErrors(errors);
  }, [resources]); // Only re-run when resources change

  // Robustly extract folder name from GitHub URLs
  const getRepoFolderName = (url: string) => {
    try {
      // Handle SSH format: git@github.com:user/repo.git
      const sshMatch = url.match(/git@github\.com:.*?\/([^/.]+?)(?:\.git)?$/i);
      if (sshMatch && sshMatch[1]) {
        return sshMatch[1];
      }

      // Handle HTTPS format: https://github.com/user/repo.git or https://github.com/user/repo
      const httpsMatch = url.match(/https?:\/\/(?:www\.)?github\.com\/.*?\/([^/.]+?)(?:\.git)?$/i);
      if (httpsMatch && httpsMatch[1]) {
        return httpsMatch[1];
      }

      // Fallback: Try URL object for general parsing or last path segment
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/').filter(p => p.length > 0);
      let repoName = pathSegments[pathSegments.length - 1];
      if (repoName && repoName.endsWith('.git')) {
        repoName = repoName.slice(0, -4);
      }
      return repoName || 'unknown_node';
    } catch {
      // Fallback for malformed URLs or other unexpected formats
      const segments = url.split('/');
      let lastSegment = segments[segments.length - 1];
      if (lastSegment && lastSegment.endsWith('.git')) {
        lastSegment = lastSegment.slice(0, -4);
      }
      return lastSegment || 'unknown_node';
    }
  };

  const generateScript = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === 'bash') {
      let script = `#!/bin/bash\n# ComfyUI Resource Installer - Generated on ${timestamp}\n`;
      script += `# NOTE: Run this script from your 'ComfyUI' root folder.\n`;
      script += `# Assumes 'python' and 'pip' are in your PATH (active venv).\n\n`;
      
      script += `echo "Starting ComfyUI Resource Download..."\n\n`;
      
      resources.forEach(r => {
        if (!r.downloadUrl) return;
        script += `# ----------------------------------------------------------------\n`;
        script += `# [${r.type}] ${r.name}\n`;
        
        if (r.type === ResourceType.CUSTOM_NODE) {
           const repoDir = getRepoFolderName(r.downloadUrl);
           
           script += `echo "Processing Custom Node: ${r.name}..."\n`;
           script += `mkdir -p "custom_nodes"\n`;
           script += `cd "custom_nodes"\n`;
           
           script += `if [ ! -d "${repoDir}" ]; then\n`;
           script += `  echo "  Cloning repo '${r.downloadUrl}'..."\n`;
           script += `  git clone "${r.downloadUrl}"\n`;
           script += `  if [ $? -ne 0 ]; then\n`;
           script += `    echo "  ERROR: Git clone failed for ${r.name}. Check URL and internet connection."\n`;
           script += `  else\n`;
           script += `    echo "  Clone successful."\n`;
           script += `  fi\n`;
           script += `else\n`;
           script += `  echo "  Folder '${repoDir}' already exists. Skipping clone."\n`;
           script += `fi\n`;

           // Post-clone setup
           script += `if [ -d "${repoDir}" ]; then\n`;
           script += `  cd "${repoDir}"\n`;
           
           // Submodule handling (Sophisticated!)
           script += `  if [ -f ".gitmodules" ]; then\n`;
           script += `    echo "  Initializing submodules..."\n`;
           script += `    git submodule update --init --recursive\n`;
           script += `    if [ $? -ne 0 ]; then\n`;
           script += `      echo "  WARNING: Submodule update failed for ${r.name}."\n`;
           script += `    }\n`;
           script += `  fi\n`;

           // Check for requirements.txt
           script += `  if [ -f "requirements.txt" ]; then\n`;
           script += `    echo "  Installing requirements.txt..."\n`;
           script += `    pip install -r requirements.txt\n`;
           script += `    if [ $? -ne 0 ]; then\n`;
           script += `      echo "  WARNING: Pip installation failed for ${r.name} requirements."\n`;
           script += `    fi\n`;
           script += `  fi\n`;
           
           // Check for install.py
           script += `  if [ -f "install.py" ]; then\n`;
           script += `    echo "  Running install.py..."\n`;
           script += `    python install.py\n`;
           script += `    if [ $? -ne 0 ]; then\n`;
           script += `      echo "  WARNING: install.py failed for ${r.name}."\n`;
           script += `    fi\n`;
           script += `  fi\n`;
           
           script += `  cd ..\n`;
           script += `fi\n`;
           script += `cd ..\n\n`;

        } else {
           // Standard Model Download
           script += `echo "Processing Model: ${r.name}..."\n`;
           script += `mkdir -p "${r.targetPath}"\n`;
           script += `if [ ! -f "${r.targetPath}/${r.rawName}" ]; then\n`;
           script += `  echo "  Downloading '${r.downloadUrl}' to '${r.targetPath}/${r.rawName}'..."\n`;
           // Added --show-progress for explicit progress, -c for continue
           script += `  wget -c --show-progress -O "${r.targetPath}/${r.rawName}" "${r.downloadUrl}"\n`;
           script += `  if [ $? -ne 0 ]; then\n`;
           script += `    echo "  ERROR: Download failed for ${r.name} from ${r.downloadUrl}"\n`;
           script += `    echo "  Please check the URL and your network connection, or try downloading manually."\n`;
           script += `  else\n`;
           script += `    echo "  Download successful for ${r.name}."\n`;
           script += `  fi\n`;
           script += `else\n`;
           script += `  echo "  File '${r.rawName}' already exists in '${r.targetPath}'. Skipping download."\n`;
           script += `fi\n\n`;
        }
      });
      
      script += `echo "----------------------------------------------------------------"\n`;
      script += `echo "All done! Please restart ComfyUI."`;
      return script;

    } else {
      // BATCH FORMAT
      let script = `@echo off\n:: ComfyUI Resource Installer - Generated on ${timestamp}\n`;
      script += `:: NOTE: Run this from your 'ComfyUI' root folder.\n\n`;
      
      // Portable Environment Detection (Sophisticated!)
      script += `:: --- Environment Setup ---\n`;
      script += `set "PYTHON_EXE=python"\n`;
      script += `set "PIP_EXE=pip"\n\n`;
      
      script += `if exist "..\\python_embeded\\python.exe" (\n`;
      script += `    echo [INFO] Detected ComfyUI Portable Environment.\n`;
      script += `    set "PYTHON_EXE=..\\python_embeded\\python.exe"\n`;
      script += `    set "PIP_EXE=..\\python_embeded\\python.exe -m pip"\n`;
      script += `) else (\n`;
      script += `    echo [INFO] Using system Python. Ensure it is in your PATH.\n`;
      script += `)\n\n`;
      
      script += `echo Starting ComfyUI Resource Download...\n\n`;
      
      resources.forEach(r => {
        if (!r.downloadUrl) return;
        script += `:: ----------------------------------------------------------------\n`;
        script += `:: [${r.type}] ${r.name}\n`;
        
        if (r.type === ResourceType.CUSTOM_NODE) {
           const repoDir = getRepoFolderName(r.downloadUrl);
           const winPath = "custom_nodes"; // For batch scripts, custom_nodes is directly under ComfyUI root
           
           script += `echo Processing Custom Node: ${r.name}...\n`;
           script += `if not exist "${winPath}" mkdir "${winPath}"\n`;
           script += `cd "${winPath}"\n`;
           
           script += `if not exist "${repoDir}" (\n`;
           script += `  echo   Cloning repo '${r.downloadUrl}'...\n`;
           script += `  git clone "${r.downloadUrl}"\n`;
           script += `  if %ERRORLEVEL% NEQ 0 (\n`;
           script += `    echo   ERROR: Git clone failed for ${r.name}. Check URL and internet connection.\n`;
           script += `  ) else (\n`;
           script += `    echo   Clone successful.\n`;
           script += `  )\n`;
           script += `) else (\n`;
           script += `  echo   Folder '${repoDir}' already exists. Skipping clone.\n`;
           script += `)\n`;

           // Post-clone setup
           script += `if exist "${repoDir}" (\n`;
           script += `  cd "${repoDir}"\n`;
           
           // Submodule check
           script += `  if exist ".gitmodules" (\n`;
           script += `    echo   Initializing submodules...\n`;
           script += `    git submodule update --init --recursive\n`;
           script += `    if %ERRORLEVEL% NEQ 0 (\n`;
           script += `      echo   WARNING: Submodule update failed for ${r.name}.\n`;
           script += `    )\n`;
           script += `  )\n`;

           // Check for requirements.txt
           script += `  if exist "requirements.txt" (\n`;
           script += `    echo   Installing requirements.txt...\n`;
           script += `    %PIP_EXE% install -r requirements.txt\n`;
           script += `    if %ERRORLEVEL% NEQ 0 (\n`;
           script += `      echo   WARNING: Pip installation failed for ${r.name} requirements.\n`;
           script += `    )\n`;
           script += `  )\n`;
           
           // Check for install.py
           script += `  if exist "install.py" (\n`;
           script += `    echo   Running install.py...\n`;
           script += `    %PYTHON_EXE% install.py\n`;
           script += `    if %ERRORLEVEL% NEQ 0 (\n`;
           script += `      echo   WARNING: install.py failed for ${r.name}.\n`;
           script += `    )\n`;
           script += `  )\n`;
           
           script += `  cd ..\n`;
           script += `)\n`;
           script += `cd ..\n\n`;

        } else {
           // Standard Model Download
           const winPath = r.targetPath.replace(/\//g, '\\');
           script += `echo Processing Model: ${r.name}...\n`;
           script += `if not exist "${winPath}" mkdir "${winPath}"\n`;
           
           script += `if not exist "${winPath}\\${r.rawName}" (\n`;
           script += `  echo   Downloading '${r.downloadUrl}' to '${winPath}\\${r.rawName}'...\n`;
           // Added $ProgressPreference = 'Continue'; and | Out-Null
           script += `  powershell -Command "$ProgressPreference = 'Continue'; try { Invoke-WebRequest -Uri '${r.downloadUrl}' -OutFile '${winPath}\\${r.rawName}' -ErrorAction Stop | Out-Null; Write-Host '  Download successful for ${r.name}.' } catch { Write-Host '  ERROR: Download failed for ${r.name} from ${r.downloadUrl} - $($_.Exception.Message)'; Write-Host '  Please check the URL and your network connection, or try downloading manually.' }" \n`;
           script += `) else (\n`;
           script += `  echo   File '${r.rawName}' already exists in '${winPath}'. Skipping download.\n`;
           script += `)\n\n`;
        }
      });
      
      script += `echo ----------------------------------------------------------------\n`;
      script += `echo All done! Please restart ComfyUI.\npause`;
      return script;
    }
  };

  const scriptContent = generateScript();

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onActionComplete();
  };

  const handleDownload = () => {
    const blob = new Blob([scriptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comfy_install_${new Date().getTime()}.${format === 'bash' ? 'sh' : 'bat'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
    onActionComplete();
  };

  // NEW: Validation Warning Modal
  if (showValidationWarning && validationErrors.length > 0) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/80 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl p-8 transform transition-all">
          <div className="flex flex-col items-center text-center">
            <div className="p-4 bg-red-100 dark:bg-red-500/10 rounded-full mb-6">
              <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-500" />
            </div>

            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Potential URL Issues Detected</h3>

            <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Some generated download URLs might be invalid, or are not direct download links.
              Please review them carefully.
            </p>

            <ul className="text-sm text-left text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-8 max-h-40 overflow-y-auto w-full border border-red-200 dark:border-red-900/50">
              {validationErrors.map((err, index) => (
                <li key={index} className="mb-2 last:mb-0">
                  <span className="font-semibold">{err.resource.name}</span>: {err.reason}
                  <span className="block text-xs text-red-500 dark:text-red-400 font-mono break-all mt-0.5">{err.resource.downloadUrl}</span>
                </li>
              ))}
            </ul>

            <div className="flex gap-4 w-full">
              <button
                onClick={onClose} // Go back to ResourceManager
                className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
              >
                Go Back and Edit
              </button>
              <button
                onClick={() => setShowValidationWarning(false)} // Proceed to the next modal (Review Required)
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-500/25"
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Original 'Review Required' modal
  if (!confirmed) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/80 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl p-8 transform transition-all">
          <div className="flex flex-col items-center text-center">
            <div className="p-4 bg-amber-100 dark:bg-amber-500/10 rounded-full mb-6">
              <AlertTriangle className="w-10 h-10 text-amber-600 dark:text-amber-500" />
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Review Required</h3>
            
            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              You are about to generate an installation script based on AI-suggested URLs.
              <br /><br />
              The script now detects <span className="font-semibold text-indigo-600 dark:text-indigo-400">ComfyUI Portable</span> environments and attempts to run <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">pip install</span> automatically.
              <br/>
              Please review the code before running it on your machine.
            </p>
            
            <div className="flex gap-4 w-full">
              <button 
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
              >
                Go Back
              </button>
              <button 
                onClick={() => setConfirmed(true)}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/25"
              >
                I Have Reviewed
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/80 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 w-full max-w-4xl h-[80vh] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-500/10 rounded-lg">
              <Terminal className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-gray-900 dark:text-white font-semibold">Installation Script</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Run this in your ComfyUI root folder</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-gray-950/50 border-b border-gray-200 dark:border-gray-800">
           <div className="flex gap-2">
             <button 
                onClick={() => setFormat('bash')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${format === 'bash' ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
             >
               Bash (.sh)
             </button>
             <button 
                onClick={() => setFormat('bat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${format === 'bat' ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
             >
               Batch (.bat)
             </button>
           </div>
           
           <div className="flex items-center gap-3">
             <div className="hidden sm:flex items-center gap-2 text-[10px] text-gray-400 mr-2">
                <Settings className="w-3 h-3" />
                {format === 'bat' ? 'Portable Mode Auto-detect' : 'Standard Env'}
             </div>
             
             <button 
               onClick={handleCopy}
               className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
             >
               {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
               {copied ? 'Copied' : 'Copy'}
             </button>

             <button 
               onClick={handleDownload}
               className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm"
             >
               {downloaded ? <Check className="w-4 h-4" /> : <FileDown className="w-4 h-4" />}
               {downloaded ? 'Saved' : 'Download File'}
             </button>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-[#0d1117] p-6 transition-colors duration-300">
          <pre className="font-mono text-xs sm:text-sm text-gray-800 dark:text-gray-300 whitespace-pre-wrap leading-relaxed select-text">
            {scriptContent}
          </pre>
        </div>
        
        {/* Footer info */}
        <div className="bg-gray-100 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 px-6 py-2 text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-2">
           <FileCode className="w-3 h-3" />
           <span>Scripts attempt to auto-install requirements. Always review generated code before execution.</span>
        </div>

      </div>
    </div>
  );
};

export default ScriptPreview;