// components/editor/Player.tsx
"use client";

import { useRef, useEffect, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerProps {
  src: string | null;
  currentTime: number;           // Receive Time
  isPlaying: boolean;            // Receive State
  onTimeUpdate: (t: number) => void; // Send Time
  onDurationChange: (d: number) => void; // Send Duration
  onTogglePlay: () => void;      // Request Play Toggle
}

export default function Player({ 
  src, 
  currentTime, 
  isPlaying, 
  onTimeUpdate, 
  onDurationChange, 
  onTogglePlay 
}: PlayerProps) {
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Sync Video Element with Prop State
  useEffect(() => {
    if (videoRef.current) {
        if (isPlaying && videoRef.current.paused) {
            videoRef.current.play().catch(() => {});
        } else if (!isPlaying && !videoRef.current.paused) {
            videoRef.current.pause();
        }
    }
  }, [isPlaying]);

  // Sync Video Time when user scrubs timeline
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
        videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  return (
    <div className="flex-1 relative p-6 flex items-center justify-center bg-zinc-950/50">
      <div className="aspect-video w-full max-h-full max-w-4xl bg-black border border-border-gray rounded-lg shadow-2xl flex flex-col relative overflow-hidden group select-none">
        
        {src ? (
          <video
            ref={videoRef}
            src={src}
            className="w-full h-full object-contain bg-black"
            onTimeUpdate={() => videoRef.current && onTimeUpdate(videoRef.current.currentTime)}
            onLoadedMetadata={() => videoRef.current && onDurationChange(videoRef.current.duration)}
            onEnded={onTogglePlay}
            onClick={onTogglePlay}
          />
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900">
               <p className="text-zinc-600 font-medium text-sm tracking-widest">NO MEDIA SELECTED</p>
            </div>
        )}

        {/* Floating Play Button */}
        {src && !isPlaying && (
           <div onClick={onTogglePlay} className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer">
              <div className="w-16 h-16 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 hover:scale-110 transition-transform">
                <Play className="w-6 h-6 text-white ml-1 fill-white" />
              </div>
           </div>
        )}
      </div>
    </div>
  );
}