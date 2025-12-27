// components/editor/Timeline.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";

export type TrackType = "video" | "audio" | "text";
export type Clip = {
  id: string;
  name: string;
  start: number;
  duration: number;
  url?: string;
  type: string;
};
export type Track = {
  id: string;
  type: TrackType;
  name: string;
  clips: Clip[];
};

type InteractionMode = "NONE" | "MOVE" | "TRIM_LEFT" | "TRIM_RIGHT";

interface TimelineProps {
  tracks: Track[];
  currentTime: number;
  onSeek: (time: number) => void;
  // Actions
  onDropNewClip: (trackId: string, clipData: any, time: number) => void; // NEW: Drop from Library
  onUpdateClip: (trackId: string, clipId: string, updates: Partial<Clip>) => void;
  onSwitchTrack: (clipId: string, oldTrackId: string, newTrackId: string, newStart: number) => void;
  // Selection
  selectedClipId?: string;
  onSelectClip: (id: string | null) => void;
}

export default function Timeline({ 
  tracks, 
  currentTime, 
  onSeek,
  onDropNewClip,
  onUpdateClip,
  onSwitchTrack,
  selectedClipId,
  onSelectClip
}: TimelineProps) {
  
  const [zoom, setZoom] = useState(20);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Drag State (For Internal Moves/Trims)
  const [dragState, setDragState] = useState<{
    mode: InteractionMode;
    clipId: string | null;
    trackId: string | null;
    startX: number;
    originalStart: number;
    originalDuration: number;
  }>({ mode: "NONE", clipId: null, trackId: null, startX: 0, originalStart: 0, originalDuration: 0 });

  const pixelsToSeconds = (px: number) => px / zoom;

  // --- 1. ZOOM LOGIC (Wheel/Touchpad) ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaY) < 50) { 
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(prev => Math.min(Math.max(prev * delta, 2), 200));
      }
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  // --- 2. HTML5 DRAG & DROP (New Clips from Library) ---
  const handleExternalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleExternalDrop = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    // Only handle if it's NOT an internal move (internal moves use mouse listeners below)
    if (dragState.mode !== "NONE") return;

    const data = e.dataTransfer.getData("application/json");
    if (data) {
        // Calculate Time
        const rect = e.currentTarget.getBoundingClientRect();
        const offsetX = e.clientX - rect.left + e.currentTarget.scrollLeft; // Simplified calculation
        // Correcting for the left-sidebar offset if needed, but relative to e.currentTarget (the track lane) is safer:
        // Actually, e.clientX is global. e.currentTarget is the Track Div.
        // We need position relative to the SCROLL CONTAINER (parent of Track Divs).
        // Let's rely on the containerRef for global offset calculation.
        if (containerRef.current) {
            // Find the scrolling area
            const scrollArea = containerRef.current.querySelector('.timeline-scroll-area');
            if (scrollArea) {
                const scrollRect = scrollArea.getBoundingClientRect();
                const scrollLeft = scrollArea.scrollLeft;
                const clickX = e.clientX - scrollRect.left + scrollLeft;
                const dropTime = Math.max(0, clickX / zoom);
                
                onDropNewClip(trackId, JSON.parse(data), dropTime);
            }
        }
    }
  };

  // --- 3. INTERNAL MOUSE HANDLERS (Move / Trim) ---
  const handleMouseDown = (e: React.MouseEvent, clip: Clip, trackId: string, mode: InteractionMode) => {
    e.stopPropagation();
    e.preventDefault(); // Stop text selection
    onSelectClip(clip.id);
    setDragState({
      mode,
      clipId: clip.id,
      trackId,
      startX: e.clientX,
      originalStart: clip.start,
      originalDuration: clip.duration
    });
  };

  useEffect(() => {
    if (dragState.mode === "NONE") return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.clipId || !dragState.trackId) return;
      const deltaSeconds = pixelsToSeconds(e.clientX - dragState.startX);

      // LIVE UPDATE (Visual feedback)
      if (dragState.mode === "MOVE") {
        const newStart = Math.max(0, dragState.originalStart + deltaSeconds);
        onUpdateClip(dragState.trackId, dragState.clipId, { start: newStart });
      }
      else if (dragState.mode === "TRIM_LEFT") {
        const newStart = Math.min(dragState.originalStart + deltaSeconds, dragState.originalStart + dragState.originalDuration - 0.1);
        const newDuration = dragState.originalDuration - (newStart - dragState.originalStart);
        if (newStart >= 0) onUpdateClip(dragState.trackId, dragState.clipId, { start: newStart, duration: newDuration });
      }
      else if (dragState.mode === "TRIM_RIGHT") {
        const newDuration = Math.max(0.1, dragState.originalDuration + deltaSeconds);
        onUpdateClip(dragState.trackId, dragState.clipId, { duration: newDuration });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
       // CHECK TRACK SWITCH
       if (dragState.mode === "MOVE") {
          const el = document.elementFromPoint(e.clientX, e.clientY);
          const targetTrackId = el?.closest('[data-track-id]')?.getAttribute('data-track-id');
          if (targetTrackId && targetTrackId !== dragState.trackId) {
             const deltaSeconds = pixelsToSeconds(e.clientX - dragState.startX);
             const newStart = Math.max(0, dragState.originalStart + deltaSeconds);
             onSwitchTrack(dragState.clipId!, dragState.trackId!, targetTrackId, newStart);
          }
       }
       setDragState({ mode: "NONE", clipId: null, trackId: null, startX: 0, originalStart: 0, originalDuration: 0 });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, tracks, zoom]); // Important dependencies


  // --- FIT TO SCREEN ---
  const fitToScreen = () => {
    let maxEnd = 10;
    tracks.forEach(t => t.clips.forEach(c => maxEnd = Math.max(maxEnd, c.start + c.duration)));
    if (containerRef.current) {
        const width = containerRef.current.clientWidth - 200; 
        setZoom(width / (maxEnd * 1.05));
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-dark border-t border-border-gray select-none relative" ref={containerRef}>
      
      {/* TOOLBAR */}
      <div className="h-10 border-b border-border-gray flex items-center justify-between px-4 bg-bg-dark shrink-0 z-30">
         <div className="text-[10px] text-text-secondary flex gap-2">
            <span className={cn("px-2 py-0.5 rounded", dragState.mode !== "NONE" ? "bg-electric-red text-white" : "bg-zinc-800")}>
               {dragState.mode === "NONE" ? "Ready" : dragState.mode}
            </span>
            <span>Zoom: {Math.round(zoom)}%</span>
         </div>
         <div className="flex items-center gap-3">
             <button onClick={fitToScreen} title="Fit" className="hover:text-white text-gray-400"><Maximize className="w-3 h-3" /></button>
             <button onClick={() => setZoom(z => Math.max(z - 5, 2))}><ZoomOut className="w-4 h-4 text-gray-400" /></button>
             <button onClick={() => setZoom(z => Math.min(z + 5, 200))}><ZoomIn className="w-4 h-4 text-gray-400" /></button>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* HEADERS */}
        <div className="w-48 bg-zinc-900 border-r border-border-gray flex flex-col shrink-0 z-20 shadow-xl">
             <div className="h-8 border-b border-border-gray bg-zinc-900" />
             {tracks.map(track => (
                 <div key={track.id} className="h-24 border-b border-border-gray/50 flex flex-col justify-center px-4 bg-zinc-900/50">
                    <span className={cn("text-xs font-bold uppercase", track.type==='video'?"text-blue-400":track.type==='audio'?"text-emerald-400":"text-amber-400")}>{track.name}</span>
                 </div>
             ))}
        </div>

        {/* TRACKS SCROLL AREA */}
        <div className="timeline-scroll-area flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar bg-zinc-950 min-w-0"
             onClick={(e) => {
                // Seek logic
                if((e.target as HTMLElement).classList.contains('timeline-scroll-area') || (e.target as HTMLElement).classList.contains('track-lane')) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onSeek((e.clientX - rect.left + e.currentTarget.scrollLeft) / zoom);
                }
             }}
        >
             {/* RULER */}
             <div className="h-8 border-b border-border-gray bg-zinc-900/80 sticky top-0 z-10 pointer-events-none w-1250">
                {Array.from({ length: 200 }).map((_, i) => (
                    <div key={i} className="absolute bottom-0 h-2 border-l border-gray-600 text-[9px] text-gray-500 pl-1" style={{ left: i * zoom * 5 }}>{i * 5}s</div>
                ))}
             </div>

             <div className="w-1250 relative">
                <div className="absolute inset-0 pointer-events-none">
                     {Array.from({ length: 300 }).map((_, i) => (
                        <div key={i} className="absolute top-0 bottom-0 border-l border-white/5" style={{ left: i * zoom * 5 }} />
                    ))}
                </div>

                {tracks.map(track => (
                    <div 
                        key={track.id}
                        data-track-id={track.id}
                        className="track-lane h-24 border-b border-white/5 relative bg-black/20 hover:bg-white/5 transition-colors"
                        onDragOver={handleExternalDragOver}
                        onDrop={(e) => handleExternalDrop(e, track.id)}
                    >
                        {track.clips.map(clip => {
                            const isSelected = selectedClipId === clip.id;
                            const isDragging = dragState.clipId === clip.id;
                            const color = track.type==='video'?"bg-blue-900/90 border-blue-500":track.type==='audio'?"bg-emerald-900/90 border-emerald-500":"bg-amber-900/90 border-amber-500";
                            
                            return (
                              <div
                                  key={clip.id}
                                  className={cn(
                                      "absolute top-2 bottom-2 rounded-md border shadow-md group select-none",
                                      color,
                                      isSelected ? "ring-2 ring-white z-10" : "z-0",
                                      isDragging && "opacity-80 scale-[1.01] shadow-xl z-50 cursor-grabbing"
                                  )}
                                  style={{ left: clip.start * zoom, width: clip.duration * zoom }}
                                  onMouseDown={(e) => handleMouseDown(e, clip, track.id, "MOVE")}
                              >
                                  {/* Trim Handles */}
                                  <div className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize hover:bg-white/40 z-20" onMouseDown={(e) => handleMouseDown(e, clip, track.id, "TRIM_LEFT")} />
                                  <div className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-white/40 z-20" onMouseDown={(e) => handleMouseDown(e, clip, track.id, "TRIM_RIGHT")} />
                                  
                                  <div className="w-full h-full px-3 flex flex-col justify-center pointer-events-none overflow-hidden">
                                      <span className="text-[10px] font-bold text-white truncate">{clip.name}</span>
                                      <span className="text-[8px] text-white/70">{clip.duration.toFixed(1)}s</span>
                                  </div>
                              </div>
                            );
                        })}
                    </div>
                ))}

                {/* Playhead */}
                <div className="absolute top-0 bottom-0 w-px bg-electric-red z-50 pointer-events-none" style={{ transform: `translateX(${currentTime * zoom}px)` }}>
                    <div className="absolute -top-3 -left-1.5 w-3 h-3 bg-electric-red rotate-45 shadow-[0_0_8px_#FF2E4D]" />
                </div>
             </div>
        </div>
      </div>
    </div>
  );
}