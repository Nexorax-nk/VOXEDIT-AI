'use client';

import React, { useState } from 'react';
import { 
  ChevronLeft, 
  FileText, 
  Play, 
  Share2, 
  Download, 
  CheckCircle2, 
  Cloud,
  Edit2
} from 'lucide-react';

interface TopBarProps {
  onExport?: () => void;
}

export default function TopBar({ onExport }: TopBarProps) {
  // --- STATE ---
  const [projectTitle, setProjectTitle] = useState('Motivation Content 2025 Q2');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // --- HANDLERS ---
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectTitle(e.target.value);
    setIsSaved(false); // Simulate "Unsaved changes"
  };

  const handleBlur = () => {
    setIsEditingTitle(false);
    // Simulate auto-save
    setTimeout(() => setIsSaved(true), 1000);
  };

  const handleExportClick = () => {
    setIsExporting(true);
    // Simulate export process
    setTimeout(() => {
      setIsExporting(false);
      if (onExport) onExport();
      alert("Render request sent to cloud engine! (Mock)");
    }, 2000);
  };

  return (
    <header className="h-14 bg-bg-main border-b border-border flex items-center justify-between px-6 shrink-0 z-40">
      
      {/* LEFT: Navigation & Title */}
      <div className="flex items-center gap-4">
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors">
            <ChevronLeft size={18} />
        </button>

        <div className="flex flex-col">
            <div className="flex items-center gap-2 group">
                {isEditingTitle ? (
                    <input 
                        autoFocus
                        type="text" 
                        value={projectTitle}
                        onChange={handleTitleChange}
                        onBlur={handleBlur}
                        onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
                        className="bg-transparent text-sm font-semibold text-white focus:outline-none border-b border-brand-blue min-w-50"
                    />
                ) : (
                    <h1 
                        onClick={() => setIsEditingTitle(true)}
                        className="text-sm font-semibold text-white cursor-text flex items-center gap-2"
                    >
                        {projectTitle}
                        <span className="opacity-0 group-hover:opacity-100 text-text-secondary transition-opacity">
                            <Edit2 size={10} />
                        </span>
                    </h1>
                )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                <span className="bg-white/10 px-1 rounded">1080p</span>
                <span>•</span>
                <span>24fps</span>
            </div>
        </div>
      </div>

      {/* RIGHT: Actions */}
      <div className="flex items-center gap-3">
         
         {/* Save Status Indicator */}
         <div className="flex items-center gap-2 mr-2">
            {isSaved ? (
                <span className="text-xs text-emerald-500 flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded-full transition-all">
                    <CheckCircle2 size={12} />
                    Saved
                </span>
            ) : (
                <span className="text-xs text-text-secondary flex items-center gap-1.5 animate-pulse">
                    <Cloud size={12} />
                    Saving...
                </span>
            )}
         </div>

         <div className="h-4 w-px bg-border mx-1" />

         <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-white hover:bg-white/5 rounded-md transition-colors">
            <Play size={14} /> Preview
         </button>
         
         <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-white hover:bg-white/5 rounded-md transition-colors">
            <Share2 size={14} /> Share
         </button>

         {/* PRIMARY CTA: RENDER */}
         <button 
            onClick={handleExportClick}
            disabled={isExporting}
            className={`
                flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-lg shadow-lg 
                transition-all transform active:scale-95
                ${isExporting 
                    ? 'bg-bg-panel text-text-secondary cursor-wait' 
                    : 'bg-brand-blue hover:bg-blue-600 text-white shadow-blue-500/20'
                }
            `}
         >
            {isExporting ? (
                <>
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Rendering...
                </>
            ) : (
                <>
                    <Download size={14} /> 
                    Export
                </>
            )}
         </button>
      </div>
    </header>
  );
}