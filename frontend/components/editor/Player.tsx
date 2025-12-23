'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Maximize, Settings, MonitorPlay, ChevronDown 
} from 'lucide-react';

interface PlayerProps {
  src?: string | null; // The video URL to play
  poster?: string;     // Thumbnail if not playing
}

export default function Player({ src, poster }: PlayerProps) {
  // --- STATE ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // --- HANDLERS ---
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const frames = Math.floor((time % 1) * 30); // 30fps approximation
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  // Auto-play if source changes (optional, feels snappier)
  useEffect(() => {
    if (src && videoRef.current) {
      videoRef.current.load();
      setIsPlaying(false); // Safety: don't auto-blast audio
    }
  }, [src]);

  return (
    <div className="flex-1 bg-bg-panel rounded-xl border border-border flex flex-col overflow-hidden relative group min-w-0">
      
      {/* 1. PLAYER HEADER */}
      <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-bg-panel shrink-0 z-20">
        <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-white flex items-center gap-2">
                <MonitorPlay size={14} className="text-brand-blue" />
                Program Monitor
            </span>
            <div className="h-4 w-px bg-white/10" />
            <button className="text-[10px] flex items-center gap-1 text-text-secondary hover:text-white">
                Fit <ChevronDown size={10} />
            </button>
            <button className="text-[10px] flex items-center gap-1 text-text-secondary hover:text-white">
                Full Res <ChevronDown size={10} />
            </button>
        </div>
        
        {/* Timecode Big Display */}
        <div className="font-mono text-sm font-semibold text-brand-blue tracking-wider">
            {formatTime(currentTime)} <span className="text-text-secondary opacity-50">/ {formatTime(duration)}</span>
        </div>
      </div>

      {/* 2. VIDEO CANVAS */}
      <div 
        className="flex-1 bg-black relative flex items-center justify-center overflow-hidden cursor-pointer"
        onClick={togglePlay}
      >
        {src ? (
          <video 
            ref={videoRef}
            src={src}
            className="w-full h-full object-contain max-h-[60vh]" // Constrain height to avoid layout shift
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
          />
        ) : (
            // Empty State
            <div className="flex flex-col items-center gap-3 opacity-30 select-none">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                    <MonitorPlay size={32} />
                </div>
                <p className="text-xs font-medium">No clip selected</p>
            </div>
        )}

        {/* Play Overlay (Only shows when paused and has source) */}
        {!isPlaying && src && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                 <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 hover:scale-110 transition-transform">
                     <Play size={32} className="fill-white ml-1" />
                 </div>
            </div>
        )}
      </div>

      {/* 3. PROGRESS BAR (Scrubber) */}
      <div className="h-1 w-full bg-bg-main cursor-pointer relative group/scrubber">
         {/* Background Track */}
         <div className="absolute inset-0 bg-white/10" />
         
         {/* Buffered/Played Track */}
         <div 
            className="absolute top-0 bottom-0 left-0 bg-brand-blue z-10" 
            style={{ width: `${(currentTime / duration) * 100}%` }}
         />
         
         {/* Input Range (Invisible but clickable) */}
         <input 
            type="range" 
            min="0" 
            max={duration || 100} 
            step="0.01"
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
         />
         
         {/* Hover Effect */}
         <div className="absolute top-0 bottom-0 bg-white/20 opacity-0 group-hover/scrubber:opacity-100 transition-opacity pointer-events-none" />
      </div>

      {/* 4. TRANSPORT CONTROLS */}
      <div className="h-12 bg-bg-panel border-t border-border flex items-center justify-between px-4 shrink-0">
          
          {/* Volume Group */}
          <div className="flex items-center gap-3 w-32 group">
              <button onClick={() => setIsMuted(!isMuted)} className="text-text-secondary hover:text-white">
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-2/3 group-hover:bg-brand-blue transition-colors"></div>
              </div>
          </div>

          {/* Main Playback Controls */}
          <div className="flex items-center gap-6">
              <button 
                onClick={() => {
                    if (videoRef.current) videoRef.current.currentTime -= 5;
                }}
                className="text-text-secondary hover:text-white transition-colors hover:-translate-x-0.5"
              >
                  <SkipBack size={18} className="fill-current" />
              </button>
              
              <button 
                onClick={togglePlay}
                className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/10"
              >
                  {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current ml-0.5" />}
              </button>
              
              <button 
                onClick={() => {
                    if (videoRef.current) videoRef.current.currentTime += 5;
                }}
                className="text-text-secondary hover:text-white transition-colors hover:translate-x-0.5"
              >
                  <SkipForward size={18} className="fill-current" />
              </button>
          </div>

          {/* Tools */}
          <div className="flex items-center gap-3 w-32 justify-end">
              <button className="text-text-secondary hover:text-white">
                  <Settings size={16} />
              </button>
              <button className="text-text-secondary hover:text-white">
                  <Maximize size={16} />
              </button>
          </div>

      </div>
    </div>
  );
}