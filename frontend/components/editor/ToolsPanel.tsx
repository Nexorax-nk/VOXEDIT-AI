'use client';

import React, { useState, useRef } from 'react';
import { 
  Search, Mic, Type, Wand2, Scissors, Music, 
  FastForward, UploadCloud, FileVideo, FileAudio, 
  MoreHorizontal, Plus, X 
} from 'lucide-react';
import { EditorView } from './Sidebar';

// --- Types ---
export interface MediaItem {
  id: string;
  url: string;
  name: string;
  type: 'video' | 'image' | 'audio';
  duration?: string; // Mock duration for now
}

interface ToolsPanelProps {
  activeView: EditorView;
  onSelectMedia?: (item: MediaItem) => void; // <--- ADDED: Callback prop
}

export default function ToolsPanel({ activeView, onSelectMedia }: ToolsPanelProps) {
  // --- STATE: ASSETS (Media Library) ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaItem[]>([
    // Mock initial data so it's not empty
    { id: '1', url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=300&q=80', name: 'Formula1_Raw.mp4', type: 'video' },
    { id: '2', url: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=300&q=80', name: 'Spiderman_Asset.png', type: 'image' },
  ]);

  // --- STATE: TOOLS ---
  const [searchQuery, setSearchQuery] = useState('');
  const [activeToolFilter, setActiveToolFilter] = useState('AI Tools');

  // --- HANDLERS: UPLOAD ---
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: MediaItem[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file), // Creates a real preview URL
      name: file.name,
      type: file.type.startsWith('image') ? 'image' : file.type.startsWith('audio') ? 'audio' : 'video',
    }));

    setMediaFiles((prev) => [...newFiles, ...prev]);
  };

  // --- HANDLER: DRAG START (Crucial for Timeline) ---
  const handleDragStart = (e: React.DragEvent, item: MediaItem) => {
    // We attach the data JSON so the Timeline can read it on 'drop'
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
    
    // Optional: Set a custom drag image if you want (advanced)
    // const img = new Image(); img.src = item.url; e.dataTransfer.setDragImage(img, 0, 0);
  };

  // --- RENDER CONTENT BASED ON VIEW ---
  
  // 1. ASSETS VIEW (Media Library)
  if (activeView === 'assets') {
    return (
      <div className="w-[320px] bg-bg-panel border-r border-border flex flex-col h-full overflow-hidden shrink-0">
         {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-bg-panel z-10">
          <h2 className="text-sm font-semibold text-white">Project Media</h2>
          <span className="text-[10px] text-text-secondary">{mediaFiles.length} items</span>
        </div>

        {/* Upload Area */}
        <div className="p-4">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            multiple 
            accept="image/*,video/*,audio/*"
          />
          <button 
            onClick={handleUploadClick}
            className="w-full h-24 border border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-white/5 hover:border-brand-blue/50 transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center group-hover:bg-brand-blue text-brand-blue group-hover:text-white transition-colors">
              <UploadCloud size={16} />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-white">Click to Upload</p>
              <p className="text-[10px] text-text-secondary">or drag files here</p>
            </div>
          </button>
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar">
          <div className="grid grid-cols-2 gap-3">
            {mediaFiles.map((item) => (
              <div 
                key={item.id}
                onClick={() => onSelectMedia?.(item)} // <--- ADDED: Connects to Player
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                className="group relative aspect-square bg-bg-main rounded-lg border border-border hover:border-brand-blue cursor-grab active:cursor-grabbing overflow-hidden transition-all"
              >
                {/* Thumbnail */}
                {item.type === 'video' || item.type === 'image' ? (
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-text-secondary">
                    <Music size={24} />
                    <div className="w-2/3 h-1 bg-white/10 rounded-full overflow-hidden">
                       <div className="w-1/3 h-full bg-brand-yellow"></div>
                    </div>
                  </div>
                )}
                
                {/* Labels / Overlays */}
                <div className="absolute top-1 right-1 bg-black/60 backdrop-blur rounded px-1.5 py-0.5 text-[9px] font-mono text-white">
                    {item.type === 'video' ? '00:15' : item.type.toUpperCase()}
                </div>
                
                <div className="absolute inset-x-0 bottom-0 p-2 bg-linear-to-t from-black/90 to-transparent pt-6 translate-y-full group-hover:translate-y-0 transition-transform">
                  <p className="text-[10px] text-white truncate">{item.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. TOOLS VIEW (AI List)
  // Default fallback if not 'assets' (or specifically 'tools')
  return (
    <div className="w-[320px] bg-bg-panel border-r border-border flex flex-col h-full overflow-hidden shrink-0">
      
      {/* Search Header */}
      <div className="p-4 border-b border-border bg-bg-panel z-10 space-y-4">
        <div className="relative group">
          <Search className="absolute left-3 top-2.5 text-text-secondary group-focus-within:text-brand-blue transition-colors" size={14} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search AI tools..." 
            className="w-full bg-bg-main border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-brand-blue transition-all"
          />
        </div>
        
        {/* Filter Tabs */}
        <div className="flex gap-4 text-xs font-medium text-text-secondary overflow-x-auto no-scrollbar pb-1">
          {['All', 'AI Tools', 'Audio', 'Color', 'Speed'].map(filter => (
            <button 
              key={filter}
              onClick={() => setActiveToolFilter(filter)}
              className={`whitespace-nowrap transition-colors hover:text-white ${activeToolFilter === filter ? 'text-brand-blue border-b-2 border-brand-blue pb-1' : ''}`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Tools List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
        {TOOLS_DATA.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())).map((tool, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer group transition-all border border-transparent hover:border-white/5">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center bg-opacity-10 transition-transform group-hover:scale-110 ${tool.colorClass}`}>
              <tool.icon size={16} className={tool.colorClass.replace('bg-', 'text-').replace('/10', '')} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-white group-hover:text-brand-blue transition-colors">{tool.title}</h4>
                {tool.isNew && <span className="text-[8px] bg-brand-blue text-white px-1.5 rounded-sm font-bold">NEW</span>}
              </div>
              <p className="text-[10px] text-text-secondary truncate">{tool.desc}</p>
            </div>
            <button className="w-6 h-6 rounded flex items-center justify-center text-text-secondary hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all">
                <Plus size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- STATIC DATA: AI TOOLS ---
const TOOLS_DATA = [
  { icon: Mic, title: "Speech Enhance", desc: "Remove background noise & echo", colorClass: "bg-blue-500/10 text-blue-500" },
  { icon: Type, title: "Auto Captions", desc: "Generate animated subtitles", colorClass: "bg-yellow-500/10 text-yellow-500", isNew: true },
  { icon: Wand2, title: "Magic Correction", desc: "AI color grade footage", colorClass: "bg-purple-500/10 text-purple-500" },
  { icon: Scissors, title: "Remove Background", desc: "Auto-mask without green screen", colorClass: "bg-pink-500/10 text-pink-500" },
  { icon: Music, title: "Smart Music", desc: "Generate matching background audio", colorClass: "bg-red-500/10 text-red-500" },
  { icon: FastForward, title: "Silence Remover", desc: "Jump cut silent parts automatically", colorClass: "bg-emerald-500/10 text-emerald-500" },
  { icon: FileVideo, title: "Upscale Video", desc: "Enhance resolution to 4k", colorClass: "bg-cyan-500/10 text-cyan-500" },
];