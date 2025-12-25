// components/editor/ToolsPanel.tsx
"use client";

import { useState, useRef } from "react";
import { Upload, Plus, Search, Send, Sparkles, Film, X, Bot, FolderOpen, MessageSquare, Captions } from "lucide-react";
import { ToolId } from "./Sidebar";
import { cn } from "@/lib/utils";

interface ToolsPanelProps {
  activeTool: ToolId;
}

// --- SUB-COMPONENTS FOR EACH SECTION ---

// 1. MEDIA PANEL (With Upload Logic)
const MediaPanel = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ name: string; type: string; url: string }[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map(file => ({
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file) // Create preview URL
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Hidden Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        multiple 
        accept="image/*,video/*"
      />
      
      {/* Upload Button */}
      <div className="p-4 shrink-0">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3 border-2 border-dashed border-border-gray hover:border-electric-red hover:bg-electric-red/5 rounded-xl flex items-center justify-center gap-3 transition-all group"
        >
          <div className="w-8 h-8 rounded-full bg-bg-lighter flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5 text-text-secondary group-hover:text-electric-red" />
          </div>
          <span className="text-sm font-medium text-text-secondary group-hover:text-white">Import Media</span>
        </button>
      </div>

      {/* Media Grid */}
      <div className="flex-1 overflow-y-auto p-4 pt-0">
        {files.length === 0 ? (
          <div className="text-center mt-10 opacity-40">
            <Film className="w-12 h-12 mx-auto mb-2" />
            <p className="text-xs">No media uploaded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {files.map((file, idx) => (
              <div key={idx} className="aspect-square bg-bg-black rounded-lg border border-border-gray overflow-hidden relative group cursor-pointer hover:border-electric-red">
                {file.type.startsWith("video") ? (
                  <video src={file.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" />
                ) : (
                  <img src={file.url} alt={file.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <Plus className="text-white w-6 h-6" />
                </div>
                <div className="absolute bottom-0 w-full p-1 bg-black/80 truncate text-[9px] text-white">
                    {file.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// 2. COPILOT PANEL (Chat UI)
const CopilotPanel = () => {
  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex-1 bg-bg-black/30 rounded-lg p-3 overflow-y-auto mb-4 border border-border-gray/30">
        <div className="flex gap-3 mb-4">
          <div className="w-6 h-6 rounded-full bg-electric-red flex items-center justify-center shrink-0">
            <Bot className="w-3 h-3 text-white" />
          </div>
          <div className="bg-bg-lighter p-2 rounded-r-lg rounded-bl-lg text-xs text-text-secondary">
            Hello! I'm ready to help you edit. Try asking "Remove silence" or "Add captions".
          </div>
        </div>
      </div>
      <div className="relative">
        <input type="text" placeholder="Ask AI to edit..." className="w-full bg-bg-lighter text-sm text-white px-4 py-3 pr-10 rounded-xl focus:outline-none focus:ring-1 focus:ring-electric-red placeholder:text-zinc-600" />
        <Send className="absolute right-3 top-3 w-4 h-4 text-electric-red cursor-pointer hover:text-white" />
      </div>
    </div>
  );
};

// 3. GENERIC PLACEHOLDER FOR OTHERS
const PlaceholderPanel = ({ title, icon: Icon }: { title: string, icon: any }) => (
  <div className="flex flex-col items-center justify-center h-full opacity-40 p-8 text-center">
    <Icon className="w-12 h-12 mb-3" />
    <h3 className="text-sm font-bold">{title} Coming Soon</h3>
    <p className="text-xs mt-2">This AI feature is under development.</p>
  </div>
);

// --- MAIN COMPONENT ---

export default function ToolsPanel({ activeTool }: ToolsPanelProps) {
  // Title Mapping
  const titles: Record<string, string> = {
    media: "Media Library",
    copilot: "AI Copilot",
    "magic-assets": "Magic Assets",
    subtitles: "Subtitles",
    "ai-feedback": "AI Feedback",
    projects: "Your Projects",
    settings: "Settings"
  };

  return (
    <div className="w-[320px] bg-bg-dark border-r border-border-gray flex flex-col shrink-0 z-10 transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-border-gray/50 h-14 flex items-center justify-between">
        <h2 className="text-text-secondary text-[11px] uppercase tracking-[0.2em] font-bold">
          {titles[activeTool] || "Tool"}
        </h2>
        {/* Optional: Close or Options icon could go here */}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden bg-bg-dark">
        {activeTool === "media" && <MediaPanel />}
        {activeTool === "copilot" && <CopilotPanel />}
        {activeTool === "magic-assets" && <PlaceholderPanel title="Magic Assets" icon={Sparkles} />}
        {activeTool === "subtitles" && <PlaceholderPanel title="Subtitles" icon={Captions} />}
        {activeTool === "ai-feedback" && <PlaceholderPanel title="Feedback" icon={MessageSquare} />}
        {activeTool === "projects" && <PlaceholderPanel title="Projects" icon={FolderOpen} />}
      </div>
    </div>
  );
}