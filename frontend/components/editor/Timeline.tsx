// components/editor/Timeline.tsx
"use client";

import { useState, useRef } from "react";
import { ZoomIn, ZoomOut, MousePointer2, Scissors, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Types defined locally for props (should match parent)
export type TrackType = "video" | "audio";
export type Clip = {
  id: string;
  name: string;
  start: number; // Start time in seconds
  duration: number;
  url: string;
  type: string;
};
export type Track = {
  id: string;
  type: TrackType;
  name: string;
  clips: Clip[];
};

interface TimelineProps {
  tracks: Track[]; // Real data
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onPlayPause: () => void;
  onDropClip: (trackId: string, clipData: any, time: number) => void; // Callback when item dropped
  onDeleteClip?: (trackId: string, clipId: string) => void;
}

export default function Timeline({ 
  tracks, 
  currentTime, 
  onSeek, 
  onDropClip,
  onDeleteClip 
}: TimelineProps) {
  
  // ZOOM STATE (Pixels per second)
  const [zoom, setZoom] = useState(20); // Default: 20px = 1 second
  const containerRef = useRef<HTMLDivElement>(null);

  // --- ZOOM HANDLERS ---
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 5, 100));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 5, 2));

  // --- DRAG & DROP HANDLERS ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Essential to allow dropping
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    if (!containerRef.current) return;

    // 1. Get Drop Position
    const rect = containerRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft;
    const offsetX = e.clientX - rect.left + scrollLeft - 192; // Subtract header width (192px / 12rem)
    
    // 2. Calculate Time
    const dropTime = Math.max(0, offsetX / zoom);

    // 3. Get Data
    const data = e.dataTransfer.getData("application/json");
    if (data) {
       const file = JSON.parse(data);
       onDropClip(trackId, file, dropTime);
    }
  };

  // --- RULER SCRUBBER ---
  const handleScrub = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft;
    // Calculate click relative to the scrollable area (subtract header width)
    const clickX = e.clientX - rect.left + scrollLeft - 192; 
    
    if (clickX >= 0) {
        onSeek(clickX / zoom);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-dark border-t border-border-gray select-none">
      
      {/* 1. TOOLBAR */}
      <div className="h-10 border-b border-border-gray flex items-center justify-between px-4 bg-bg-dark shrink-0 z-20">
        <div className="flex gap-2 text-text-secondary">
           <MousePointer2 className="w-4 h-4 hover:text-white cursor-pointer" />
           <Scissors className="w-4 h-4 hover:text-white cursor-pointer" />
        </div>
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-3">
            <button onClick={handleZoomOut}><ZoomOut className="w-4 h-4 text-text-secondary hover:text-white" /></button>
            <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden">
                {/* Visual indicator of zoom level */}
                <div className="h-full bg-electric-red transition-all" style={{ width: `${zoom}%` }} />
            </div>
            <button onClick={handleZoomIn}><ZoomIn className="w-4 h-4 text-text-secondary hover:text-white" /></button>
        </div>
      </div>

      {/* 2. TIMELINE AREA */}
      <div className="flex-1 flex overflow-hidden relative" ref={containerRef}>
        
        {/* A. TRACK HEADERS (Sticky Left) */}
        <div className="w-48 bg-zinc-900 border-r border-border-gray flex flex-col shrink-0 z-20 shadow-xl sticky left-0">
            <div className="h-8 border-b border-border-gray bg-zinc-900" /> {/* Ruler Corner */}
            {tracks.map(track => (
                <div key={track.id} className="h-24 border-b border-border-gray/50 flex flex-col justify-center px-4 bg-zinc-900/50">
                    <span className={cn("text-xs font-bold uppercase", track.type === 'video' ? "text-blue-400" : "text-emerald-400")}>
                        {track.id}
                    </span>
                    <span className="text-[10px] text-gray-500">{track.name}</span>
                </div>
            ))}
        </div>

        {/* B. SCROLLABLE TRACKS */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar bg-zinc-950 min-w-0">
            
            {/* RULER */}
            <div 
               className="h-8 border-b border-border-gray bg-zinc-900/80 sticky top-0 z-10 cursor-pointer min-w-500"
               onClick={handleScrub}
               style={{ width: `${Math.max(2000, 100 * zoom)}px` }}
            >
                {Array.from({ length: 100 }).map((_, i) => (
                    <div key={i} className="absolute bottom-0 h-2 border-l border-gray-600 text-[9px] text-gray-500 pl-1" style={{ left: i * zoom * 5 }}>
                        {i * 5}s
                    </div>
                ))}
            </div>

            {/* TRACK LANES */}
            <div className="min-w-500 relative" style={{ width: `${Math.max(2000, 100 * zoom)}px` }}>
                
                {/* Time Grid Lines */}
                <div className="absolute inset-0 pointer-events-none">
                     {Array.from({ length: 100 }).map((_, i) => (
                        <div key={i} className="absolute top-0 bottom-0 border-l border-white/5" style={{ left: i * zoom * 5 }} />
                    ))}
                </div>

                {/* Actual Tracks */}
                {tracks.map(track => (
                    <div 
                        key={track.id} 
                        className="h-24 border-b border-white/5 relative bg-black/20 transition-colors hover:bg-white/5"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, track.id)}
                    >
                        {/* RENDER CLIPS */}
                        {track.clips.map(clip => (
                            <div 
                                key={clip.id}
                                className={cn(
                                    "absolute top-2 bottom-2 rounded-md border p-2 overflow-hidden cursor-pointer group flex flex-col justify-center shadow-lg",
                                    track.type === "video" ? "bg-blue-900/60 border-blue-500/50" : "bg-emerald-900/60 border-emerald-500/50"
                                )}
                                style={{ 
                                    left: clip.start * zoom, 
                                    width: clip.duration * zoom 
                                }}
                            >
                                <span className="text-[10px] font-medium text-white truncate drop-shadow-md">{clip.name}</span>
                                {/* Hover Delete Button */}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDeleteClip?.(track.id, clip.id); }}
                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 hover:text-red-500 text-white"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                ))}

                {/* PLAYHEAD */}
                <div 
                    className="absolute top-0 bottom-0 w-px bg-electric-red z-30 pointer-events-none transition-transform duration-75"
                    style={{ transform: `translateX(${currentTime * zoom}px)` }}
                >
                    <div className="absolute -top-3 -left-1.5 w-3 h-3 bg-electric-red rotate-45" />
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}