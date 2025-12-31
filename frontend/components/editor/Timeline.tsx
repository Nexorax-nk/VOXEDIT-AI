"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ZoomIn, ZoomOut, Maximize, Scissors, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// --- TYPES ---
export type TrackType = "video" | "audio" | "text";
export type Clip = {
  id: string;
  name: string;
  start: number;    // Timeline Position (s)
  duration: number; // Length (s)
  offset: number;   // Where the source file starts playing (s)
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
  onDropNewClip: (trackId: string, clipData: any, time: number) => void;
  onUpdateClip: (trackId: string, clipId: string, updates: Partial<Clip>) => void;
  onSwitchTrack: (clipId: string, oldTrackId: string, newTrackId: string, newStart: number) => void;
  onSplitClip: (trackId: string, clipId: string, splitTime: number) => void;
  onDeleteClip: (trackId: string, clipId: string) => void;
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
  onSplitClip,
  onDeleteClip,
  selectedClipId,
  onSelectClip
}: TimelineProps) {
  
  const [zoom, setZoom] = useState(20); 
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false); // NEW: Track Focus State

  const [dragState, setDragState] = useState<{
    mode: InteractionMode;
    clipId: string | null;
    trackId: string | null;
    startX: number;
    originalStart: number;
    originalDuration: number;
    originalOffset: number; 
  }>({ mode: "NONE", clipId: null, trackId: null, startX: 0, originalStart: 0, originalDuration: 0, originalOffset: 0 });

  const pixelsToSeconds = (px: number) => px / zoom;

  // --- RULER & ZOOM ---
  const rulerTicks = useMemo(() => {
    let step = 1; 
    if (zoom < 10) step = 30; else if (zoom < 30) step = 10; else if (zoom < 80) step = 5; else step = 1;
    const ticks = [];
    for (let i = 0; i <= 1200; i += step) ticks.push(i);
    return { ticks, step };
  }, [zoom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaY) < 50) { 
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(prev => Math.min(Math.max(prev * delta, 2), 300));
      }
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  // --- SHORTCUTS (FIXED) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. IGNORE IF TYPING IN INPUT FIELDS
      if (
          e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement ||
          (e.target as HTMLElement).isContentEditable
      ) {
          return;
      }

      // 2. IGNORE IF TIMELINE IS NOT FOCUSED (Optional - usually ignoring input is enough)
      // Remove the !isFocused check if you want shortcuts to work globally except when typing.
      // if (!isFocused) return; 

      if ((e.key === "Backspace" || e.key === "Delete") && selectedClipId) {
        tracks.forEach(t => t.clips.find(c => c.id === selectedClipId) && onDeleteClip(t.id, selectedClipId));
      }
      if ((e.key === "c" || (e.ctrlKey && e.key === "k")) && selectedClipId) handleSplit();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedClipId, tracks, onDeleteClip, currentTime, isFocused]);

  // --- DRAG & DROP ---
  const handleExternalDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; };
  const handleExternalDrop = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    if (dragState.mode !== "NONE") return;
    const data = e.dataTransfer.getData("application/json");
    if (data && scrollContainerRef.current) {
        const rect = scrollContainerRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left + scrollContainerRef.current.scrollLeft;
        const dropTime = Math.max(0, clickX / zoom);
        onDropNewClip(trackId, JSON.parse(data), dropTime);
        
        if (tracks.reduce((acc, t) => acc + t.clips.length, 0) === 0) {
             setZoom(rect.width / ((JSON.parse(data).duration || 10) * 1.5));
        }
    }
  };

  // --- MOUSE HANDLERS (Move/Trim) ---
  const handleMouseDown = (e: React.MouseEvent, clip: Clip, trackId: string, mode: InteractionMode) => {
    e.stopPropagation(); e.preventDefault();
    onSelectClip(clip.id);
    setIsFocused(true); // Focus timeline
    setDragState({
      mode, clipId: clip.id, trackId, startX: e.clientX,
      originalStart: clip.start, originalDuration: clip.duration, originalOffset: clip.offset
    });
  };

  useEffect(() => {
    if (dragState.mode === "NONE") return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.clipId || !dragState.trackId) return;
      const deltaSeconds = pixelsToSeconds(e.clientX - dragState.startX);

      if (dragState.mode === "MOVE") {
        const newStart = Math.max(0, dragState.originalStart + deltaSeconds);
        onUpdateClip(dragState.trackId, dragState.clipId, { start: newStart });
      }
      else if (dragState.mode === "TRIM_LEFT") {
        const maxStart = dragState.originalStart + dragState.originalDuration - 0.2;
        const newStart = Math.min(Math.max(0, dragState.originalStart + deltaSeconds), maxStart);
        const change = newStart - dragState.originalStart;
        onUpdateClip(dragState.trackId, dragState.clipId, { 
            start: newStart, 
            duration: dragState.originalDuration - change,
            offset: dragState.originalOffset + change 
        });
      }
      else if (dragState.mode === "TRIM_RIGHT") {
        const newDuration = Math.max(0.2, dragState.originalDuration + deltaSeconds);
        onUpdateClip(dragState.trackId, dragState.clipId, { duration: newDuration });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
       if (dragState.mode === "MOVE") {
          const el = document.elementFromPoint(e.clientX, e.clientY);
          const targetTrackId = el?.closest('[data-track-id]')?.getAttribute('data-track-id');
          if (targetTrackId && targetTrackId !== dragState.trackId) {
             const delta = pixelsToSeconds(e.clientX - dragState.startX);
             onSwitchTrack(dragState.clipId!, dragState.trackId!, targetTrackId, Math.max(0, dragState.originalStart + delta));
          }
       }
       setDragState(prev => ({ ...prev, mode: "NONE", clipId: null }));
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [dragState, tracks, zoom]); 

  // --- HELPERS ---
  const handleSplit = () => {
    if (!selectedClipId) return;
    const track = tracks.find(t => t.clips.some(c => c.id === selectedClipId));
    const clip = track?.clips.find(c => c.id === selectedClipId);
    if (track && clip && currentTime > clip.start && currentTime < (clip.start + clip.duration)) {
         onSplitClip(track.id, clip.id, currentTime);
         onSelectClip(null);
    }
  };
  const fitToScreen = () => {
    let maxEnd = 10;
    tracks.forEach(t => t.clips.forEach(c => maxEnd = Math.max(maxEnd, c.start + c.duration)));
    if (scrollContainerRef.current) setZoom(scrollContainerRef.current.clientWidth / (maxEnd * 1.1));
  };

  return (
    <div 
        className="flex flex-col h-full bg-bg-dark border-t border-border-gray select-none relative outline-none" 
        ref={containerRef}
        tabIndex={0} // Makes div focusable
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onClick={() => setIsFocused(true)} // Click anywhere sets focus
    >
      {/* TOOLBAR */}
      <div className="h-10 border-b border-border-gray flex items-center justify-between px-4 bg-bg-dark shrink-0 z-30 shadow-sm">
         <div className="text-[10px] text-text-secondary flex gap-4 items-center">
             <button onClick={handleSplit} disabled={!selectedClipId} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded border transition-all", selectedClipId ? "bg-electric-red text-white border-electric-red shadow-[0_0_10px_rgba(255,46,77,0.3)]" : "bg-zinc-800 text-gray-500 border-white/5 opacity-50")}>
                <Scissors className="w-3.5 h-3.5" /><span className="font-bold tracking-wide">RAZOR</span>
             </button>
             <button onClick={() => selectedClipId && tracks.forEach(t => t.clips.find(c => c.id === selectedClipId) && onDeleteClip(t.id, selectedClipId))} disabled={!selectedClipId} className="p-1.5 hover:bg-bg-lighter rounded text-gray-400 hover:text-red-500 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
         </div>
         <div className="flex items-center gap-3">
             <button onClick={fitToScreen} className="p-1 hover:bg-bg-lighter rounded text-text-secondary"><Maximize className="w-3 h-3" /></button>
             <div className="h-4 w-px bg-border-gray" />
             <button onClick={() => setZoom(z => Math.max(z - 10, 2))}><ZoomOut className="w-4 h-4 text-gray-400" /></button>
             <div className="w-20 h-1 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-electric-red" style={{ width: `${Math.min(zoom/2, 100)}%` }} /></div>
             <button onClick={() => setZoom(z => Math.min(z + 10, 300))}><ZoomIn className="w-4 h-4 text-gray-400" /></button>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* HEADERS */}
        <div className="w-48 bg-zinc-900 border-r border-border-gray flex flex-col shrink-0 z-20 shadow-md">
             <div className="h-9 border-b border-border-gray bg-zinc-950 flex items-center px-4 text-[10px] font-bold text-gray-500 tracking-wider">TRACKS</div>
             {tracks.map(track => (
                 <div key={track.id} className="h-24 border-b border-border-gray/30 flex flex-col justify-center px-4 bg-zinc-900/50 hover:bg-zinc-800/80 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                        <span className={cn("text-xs font-bold uppercase", track.type==='video'?"text-blue-400":track.type==='audio'?"text-emerald-400":"text-amber-400")}>{track.name}</span>
                        <div className="w-2 h-2 rounded-full bg-white/10" />
                    </div>
                 </div>
             ))}
        </div>

        {/* SCROLLABLE AREA */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar bg-zinc-950 min-w-0" ref={scrollContainerRef}
             onClick={(e) => {
                if((e.target as HTMLElement).classList.contains('bg-zinc-950') || (e.target as HTMLElement).classList.contains('track-lane')) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onSeek((e.clientX - rect.left + e.currentTarget.scrollLeft) / zoom);
                    onSelectClip(null);
                }
             }}>
             <div className="h-9 border-b border-border-gray bg-zinc-900/95 backdrop-blur sticky top-0 z-10 w-1500">
                {rulerTicks.ticks.map((time) => (
                    <div key={time} className="absolute bottom-0 top-2 border-l border-gray-700/50 pl-1.5 flex flex-col justify-end pb-1" style={{ left: time * zoom }}>
                        <span className="text-[9px] font-medium text-gray-500 select-none">{time}s</span>
                    </div>
                ))}
             </div>
             <div className="w-1500 relative">
                <div className="absolute inset-0 pointer-events-none">{rulerTicks.ticks.map(time => <div key={time} className="absolute top-0 bottom-0 border-l border-white/5" style={{ left: time * zoom }} />)}</div>
                {tracks.map(track => (
                    <div key={track.id} data-track-id={track.id} className="track-lane h-24 border-b border-white/5 relative bg-black/20 hover:bg-white/5 transition-colors" onDragOver={handleExternalDragOver} onDrop={(e) => handleExternalDrop(e, track.id)}>
                        {track.clips.map(clip => {
                            const isSelected = selectedClipId === clip.id;
                            const isDragging = dragState.clipId === clip.id;
                            const baseStyle = track.type === 'video' ? "bg-gradient-to-r from-blue-900/80 to-blue-800/80 border-blue-500/50" : track.type === 'audio' ? "bg-gradient-to-r from-emerald-900/80 to-emerald-800/80 border-emerald-500/50" : "bg-gradient-to-r from-amber-900/80 to-amber-800/80 border-amber-500/50";
                            
                            // SAFETY: Handle NaN
                            const safeLeft = (clip.start || 0) * zoom;
                            const safeWidth = Math.max(0, (clip.duration || 0)) * zoom;

                            return (
                              <div key={clip.id} 
                                   className={cn("absolute top-2 bottom-2 rounded-sm border shadow-sm group select-none overflow-hidden transition-shadow", baseStyle, isSelected ? "ring-2 ring-white z-20 brightness-110" : "z-10", isDragging && "opacity-90 scale-[1.01] shadow-2xl z-50 cursor-grabbing ring-1 ring-electric-red")} 
                                   style={{ 
                                       left: safeLeft, 
                                       width: safeWidth 
                                   }} 
                                   onMouseDown={(e) => handleMouseDown(e, clip, track.id, "MOVE")}>
                                  
                                  <div className="absolute left-0 top-0 bottom-0 w-3 cursor-w-resize hover:bg-white/20 z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" onMouseDown={(e) => handleMouseDown(e, clip, track.id, "TRIM_LEFT")}><div className="w-0.5 h-4 bg-white/70 rounded-full" /></div>
                                  <div className="absolute right-0 top-0 bottom-0 w-3 cursor-e-resize hover:bg-white/20 z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" onMouseDown={(e) => handleMouseDown(e, clip, track.id, "TRIM_RIGHT")}><div className="w-0.5 h-4 bg-white/70 rounded-full" /></div>
                                  
                                  <div className="w-full h-full px-3 flex flex-col justify-center pointer-events-none">
                                      <span className="text-[10px] font-bold text-white/90 truncate drop-shadow-md">{clip.name}</span>
                                      <span className="text-[9px] text-white/50 font-mono mt-0.5">
                                        {(clip.duration || 0).toFixed(1)}s
                                      </span>
                                  </div>
                              </div>
                            );
                        })}
                    </div>
                ))}
                <div className="absolute top-0 bottom-0 z-50 pointer-events-none" style={{ transform: `translateX(${currentTime * zoom}px)` }}>
                    <div className="w-px h-full bg-electric-red shadow-[0_0_8px_rgba(255,46,77,0.8)]" /><div className="absolute top-0 -left-1.5 w-3 h-3 bg-electric-red" style={{ clipPath: "polygon(0% 0%, 100% 0%, 50% 100%)"}} />
                </div>
             </div>
        </div>
      </div>
    </div>
  );
}