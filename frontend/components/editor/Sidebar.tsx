'use client';

import React from 'react';
import { 
  Home, 
  FolderOpen, 
  LayoutTemplate, 
  Type, 
  Image as ImageIcon, 
  Music, 
  Settings, 
  Wand2, // Icon for AI Tools
  HelpCircle
} from 'lucide-react';

// Define the views available in the app
// This ensures type safety when switching panels
export type EditorView = 'home' | 'projects' | 'tools' | 'assets' | 'text' | 'audio' | 'settings';

interface SidebarProps {
  activeView: EditorView;
  onChangeView: (view: EditorView) => void;
}

export default function Sidebar({ activeView, onChangeView }: SidebarProps) {
  
  // Helper to render buttons cleanly
  const NavButton = ({ id, icon: Icon, label }: { id: EditorView, icon: any, label: string }) => {
    const isActive = activeView === id;
    
    return (
      <button 
        onClick={() => onChangeView(id)}
        className={`
          group relative flex flex-col items-center gap-1.5 py-4 w-full transition-all duration-200
          border-l-2 
          ${isActive 
            ? 'border-brand-blue text-brand-blue bg-white/5' 
            : 'border-transparent text-text-secondary hover:text-white hover:bg-white/5'
          }
        `}
      >
        <Icon 
          size={22} 
          strokeWidth={isActive ? 2 : 1.5} 
          className="transition-transform group-hover:scale-110" 
        />
        <span className={`text-[9px] font-medium tracking-wide ${isActive ? 'opacity-100' : 'opacity-70'}`}>
          {label}
        </span>
        
        {/* Hover Tooltip (Appears to the right) */}
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-black border border-white/10 rounded text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
          {label}
        </div>
      </button>
    );
  };

  return (
    <aside className="w-18 h-full bg-bg-main border-r border-border flex flex-col items-center py-4 shrink-0 z-30 select-none">
      
      {/* 1. App Logo / Home */}
      <div className="mb-6">
          <button 
            onClick={() => onChangeView('home')}
            className="w-10 h-10 bg-linear-to-br from-brand-blue to-blue-700 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-brand-blue/20 hover:scale-105 transition-transform"
          >
            V
          </button>
      </div>

      {/* 2. Main Navigation */}
      <nav className="flex-1 w-full flex flex-col gap-1 overflow-y-auto no-scrollbar">
        
        {/* AI Tools (The 'ToolsPanel' from your list) */}
        <NavButton id="tools" icon={Wand2} label="AI Tools" />
        
        <div className="h-px w-8 bg-white/10 mx-auto my-2 rounded-full" />
        
        {/* Assets (Where Upload/Drag-Drop will happen) */}
        <NavButton id="assets" icon={ImageIcon} label="Media" />
        
        <NavButton id="projects" icon={FolderOpen} label="Projects" />
        <NavButton id="text" icon={Type} label="Text" />
        <NavButton id="audio" icon={Music} label="Audio" />
        <NavButton id="projects" icon={LayoutTemplate} label="Templates" />
      </nav>

      {/* 3. Bottom Actions */}
      <div className="mt-auto w-full flex flex-col gap-2 pt-4 border-t border-white/5">
        <NavButton id="settings" icon={Settings} label="Settings" />
        
        <button className="flex flex-col items-center gap-1 py-4 text-text-secondary hover:text-white transition-colors">
          <HelpCircle size={20} strokeWidth={1.5} />
        </button>
      </div>
    </aside>
  );
}