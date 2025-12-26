// app/page.tsx
"use client";

import { useState } from "react";
import Sidebar, { ToolId } from "@/components/editor/Sidebar";
import TopBar from "@/components/editor/TopBar";
import ToolsPanel from "@/components/editor/ToolsPanel";
import Player from "@/components/editor/Player";
import Timeline, { Track, Clip } from "@/components/editor/Timeline";

// --- INITIAL TRACKS (Empty) ---
const INITIAL_TRACKS: Track[] = [
  { id: "V1", type: "video", name: "Main Track", clips: [] },
  { id: "V2", type: "video", name: "Overlay", clips: [] },
  { id: "A1", type: "audio", name: "Dialogue", clips: [] },
  { id: "A2", type: "audio", name: "Music", clips: [] },
];

export default function EditorPage() {
  const [activeTool, setActiveTool] = useState<ToolId>("media");
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
  
  // Timeline State
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  // --- LOGIC: ADD CLIP ---
  const handleDropClip = (trackId: string, clipData: any, dropTime: number) => {
    const newClip: Clip = {
      id: Math.random().toString(36).substr(2, 9), // Simple ID
      name: clipData.name,
      start: dropTime,
      duration: clipData.duration || 5, // Default duration if not found
      url: clipData.url,
      type: clipData.type
    };

    // Update State
    setTracks(prev => prev.map(track => {
      if (track.id === trackId) {
        return { ...track, clips: [...track.clips, newClip] };
      }
      return track;
    }));
    
    // Auto-select the clip to play it
    setSelectedMediaUrl(newClip.url);
    setCurrentTime(dropTime);
  };

  // --- LOGIC: DELETE CLIP ---
  const handleDeleteClip = (trackId: string, clipId: string) => {
     setTracks(prev => prev.map(track => {
       if (track.id === trackId) {
         return { ...track, clips: track.clips.filter(c => c.id !== clipId) };
       }
       return track;
     }));
  };

  return (
    <main className="flex h-screen w-screen bg-bg-black overflow-hidden text-text-primary font-sans">
      <Sidebar activeTool={activeTool} onChange={setActiveTool} />

      <div className="flex-1 flex flex-col min-w-0 bg-bg-black">
        <TopBar />

        <div className="flex-1 flex overflow-hidden">
          {/* 1. SOURCE PANEL (Draggable Items) */}
          <ToolsPanel 
             activeTool={activeTool} 
             onMediaSelect={(url) => { setSelectedMediaUrl(url); setCurrentTime(0); }} 
          />

          <div className="flex-1 flex flex-col min-w-0 bg-bg-black relative">
            
            {/* 2. PLAYER */}
            <div className="flex-1 flex min-h-0">
               <Player 
                  src={selectedMediaUrl} 
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  onTimeUpdate={setCurrentTime}
                  onDurationChange={setDuration}
                  onTogglePlay={() => setIsPlaying(!isPlaying)}
               />
               <div className="w-75 bg-bg-dark border-l border-border-gray hidden xl:flex flex-col shrink-0">
                  <div className="p-4 border-b border-border-gray/50 h-14 flex items-center">
                    <h2 className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">AI Assistant</h2>
                  </div>
               </div>
            </div>

            {/* 3. TIMELINE (Real Data + Zoom + DragDrop) */}
            <div className="h-87.5 flex flex-col shrink-0 z-10 border-t border-border-gray relative">
               <Timeline 
                  tracks={tracks}
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={setCurrentTime}
                  onPlayPause={() => setIsPlaying(!isPlaying)}
                  onDropClip={handleDropClip}
                  onDeleteClip={handleDeleteClip}
               />
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}