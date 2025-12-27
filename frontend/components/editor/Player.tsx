// components/editor/Player.tsx
"use client";

import { useRef, useEffect } from "react";
import { Play } from "lucide-react";

interface PlayerProps {
  src: string | null;
  currentTime: number;
  clipStartTime?: number;
  clipOffset?: number; // NEW
  isPlaying: boolean;
  onTimeUpdate: (t: number) => void;
  onDurationChange: (d: number) => void;
  onTogglePlay: () => void;
}

export default function Player({ 
  src, 
  currentTime, 
  clipStartTime = 0, 
  clipOffset = 0, // Default 0
  isPlaying, 
  onTimeUpdate, 
  onDurationChange, 
  onTogglePlay 
}: PlayerProps) {
  
  const videoRef = useRef<HTMLVideoElement>(null);

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
    <div className="flex-1 relative p-6 flex items-center justify-center bg-zinc-950/50">
      <div className="aspect-video w-full max-h-full max-w-4xl bg-black border border-border-gray rounded-lg shadow-2xl flex flex-col relative overflow-hidden group select-none">
        {src ? (
          <video
            ref={videoRef}
            src={src}
            className="w-full h-full object-contain bg-black"
            onTimeUpdate={handleVideoTimeUpdate}
            onLoadedMetadata={() => videoRef.current && onDurationChange(videoRef.current.duration)}
            onEnded={onTogglePlay}
            onClick={onTogglePlay}
          />
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900">
               <p className="text-zinc-600 font-medium text-sm tracking-widest">{currentTime > 0 ? "BLACK SCREEN" : "NO MEDIA SELECTED"}</p>
            </div>
        )}
        {src && !isPlaying && (
           <div onClick={onTogglePlay} className="absolute inset-0 flex items-center justify-center bg-black/10 cursor-pointer">
              <div className="w-16 h-16 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 shadow-xl">
                <Play className="w-6 h-6 text-white ml-1 fill-white" />
              </div>
           </div>
        )}
      </div>
    </div>
  );
}