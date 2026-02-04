"use client";

import { useRef, useEffect, useState } from "react";
import { 
  Play, Maximize2, Settings, 
  Activity, Monitor, Signal, Wifi 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerProps {
  src: string | null;
  currentTime: number;
  clipStartTime?: number;
  clipOffset?: number; 
  isPlaying: boolean;
  onTimeUpdate: (t: number) => void;
  onDurationChange: (d: number) => void;
  onTogglePlay: () => void;
}

// Helper for Pro Timecode Display (MM:SS:MS)
const formatTimecode = (time: number) => {
  const m = Math.floor(time / 60).toString().padStart(2, '0');
  const s = Math.floor(time % 60).toString().padStart(2, '0');
  const ms = Math.floor((time % 1) * 100).toString().padStart(2, '0');
  return `${m}:${s}:${ms}`;
};

export default function Player({ 
  src, 
  currentTime, 
  clipStartTime = 0, 
  clipOffset = 0, 
  isPlaying, 
  onTimeUpdate, 
  onDurationChange, 
  onTogglePlay 
}: PlayerProps) {
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Sync Play/Pause
  useEffect(() => {
    if (videoRef.current) {
        if (isPlaying && videoRef.current.paused) videoRef.current.play().catch(() => {});
        else if (!isPlaying && !videoRef.current.paused) videoRef.current.pause();
    }
  }, [isPlaying]);

  // Sync Time (Logic: GlobalTime - ClipStart + Offset)
  useEffect(() => {
    if (videoRef.current && src) {
        const relativeTime = currentTime - clipStartTime;
        const fileTime = Math.max(0, relativeTime + clipOffset);
        
        // Seek only if difference is significant (prevents stutter)
        if (Math.abs(videoRef.current.currentTime - fileTime) > 0.25) {
            videoRef.current.currentTime = fileTime;
        }
    }
  }, [currentTime, clipStartTime, clipOffset, src]);

  const handleVideoTimeUpdate = () => {
      if (videoRef.current && isPlaying) {
          const fileTime = videoRef.current.currentTime;
          // Reverse Logic: Global = FileTime - Offset + ClipStart
          onTimeUpdate(fileTime - clipOffset + clipStartTime);
      }
  };

  return (
    <div className="flex-1 relative flex flex-col bg-[#09090b] overflow-hidden w-full h-full">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
      />

      {/* Main Viewport Container */}
      {/* UPDATE: Reduced padding (p-4) and removed max-w restriction so it fills the panel */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10 w-full h-full">
        
        {/* The Video Frame */}
        <div 
            className="aspect-video w-full h-full max-h-full bg-black rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 relative overflow-hidden group select-none ring-1 ring-white/5 object-contain"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
          
          {/* --- TOP HUD OVERLAY --- */}
          <div className={cn(
              "absolute top-0 left-0 right-0 h-16 bg-linear-to-b from-black/80 to-transparent z-20 flex justify-between items-start p-4 transition-opacity duration-300",
              src ? "opacity-100" : "opacity-30"
          )}>
              <div className="flex items-center gap-3">
                  <div className={cn("px-2 py-1 rounded bg-white/10 border border-white/10 backdrop-blur-sm text-[10px] font-mono font-bold tracking-widest flex items-center gap-2 text-neutral-300", isPlaying && "text-electric-red border-electric-red/30 bg-electric-red/10")}>
                      {isPlaying ? <Activity className="w-3 h-3 animate-pulse" /> : <Monitor className="w-3 h-3" />}
                      {isPlaying ? "LIVE PREVIEW" : "MONITOR"}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500 hidden sm:block">
                      SRC: {src ? src.split('/').pop()?.slice(0, 20) + (src.length > 20 ? "..." : "") : "NULL"}
                  </div>
              </div>

              <div className="flex items-center gap-4">
                 <div className="flex flex-col items-end">
                    <span className="text-xl font-mono font-bold text-white tracking-widest tabular-nums shadow-black drop-shadow-md">
                        {formatTimecode(currentTime)}
                    </span>
                    <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono">
                        Global Timecode
                    </span>
                 </div>
              </div>
          </div>

          {/* --- VIDEO ELEMENT --- */}
          {src ? (
            <video
              ref={videoRef}
              src={src}
              className="w-full h-full object-contain bg-[#050505]"
              onTimeUpdate={handleVideoTimeUpdate}
              onLoadedMetadata={() => videoRef.current && onDurationChange(videoRef.current.duration)}
              onEnded={onTogglePlay}
              onClick={onTogglePlay}
            />
          ) : (
             // --- EMPTY STATE (NO SIGNAL) ---
             <div className="w-full h-full flex flex-col items-center justify-center bg-[#050505] relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-50 contrast-150" />
                <div className="z-10 flex flex-col items-center gap-4 opacity-50">
                   <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center animate-[spin_10s_linear_infinite]">
                      <Signal className="w-8 h-8 text-neutral-600" />
                   </div>
                   <div className="text-center">
                       <p className="text-neutral-500 font-bold text-sm tracking-[0.3em] mb-1">NO SIGNAL</p>
                       <p className="text-neutral-700 text-[10px] font-mono">SELECT A CLIP TO PREVIEW</p>
                   </div>
                </div>
             </div>
          )}

          {/* --- CENTER PLAY BUTTON --- */}
          {src && !isPlaying && (
            <div 
                onClick={onTogglePlay} 
                className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] cursor-pointer group/btn transition-all duration-300"
            >
               <div className="w-20 h-20 bg-white/5 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.3)] group-hover/btn:scale-110 group-hover/btn:bg-electric-red group-hover/btn:border-electric-red transition-all duration-300">
                 <Play className="w-8 h-8 text-white ml-1 fill-white" />
               </div>
            </div>
          )}

          {/* --- BOTTOM HUD OVERLAY --- */}
          <div className={cn(
              "absolute bottom-0 left-0 right-0 h-14 bg-linear-to-t from-black/90 to-transparent z-20 flex justify-between items-end p-4 transition-opacity duration-300 pointer-events-none",
              (isHovered || !isPlaying) ? "opacity-100" : "opacity-0"
          )}>
               <div className="flex items-center gap-4 text-white/50">
                  <Wifi className="w-3 h-3" />
                  <span className="text-[9px] font-mono tracking-widest">1920x1080 • 60FPS</span>
               </div>
               
               <div className="flex gap-2 pointer-events-auto">
                   <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white">
                      <Settings className="w-4 h-4" />
                   </button>
                   <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white">
                      <Maximize2 className="w-4 h-4" />
                   </button>
               </div>
          </div>

          {/* --- CORNER MARKERS (Viewfinder Effect) --- */}
          <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-white/20 rounded-tl-sm pointer-events-none" />
          <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-white/20 rounded-tr-sm pointer-events-none" />
          <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-white/20 rounded-bl-sm pointer-events-none" />
          <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-white/20 rounded-br-sm pointer-events-none" />

        </div>
      </div>
    </div>
  );
}