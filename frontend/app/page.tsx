// app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar, { ToolId } from "@/components/editor/Sidebar";
import TopBar from "@/components/editor/TopBar";
import ToolsPanel from "@/components/editor/ToolsPanel";
import Player from "@/components/editor/Player";
import Timeline, { Track, Clip } from "@/components/editor/Timeline";

const INITIAL_TRACKS: Track[] = [
  { id: "V1", type: "video", name: "Main Video", clips: [] },
  { id: "T1", type: "text",  name: "Text Overlay", clips: [] },
  { id: "A1", type: "audio", name: "Audio Track", clips: [] },
];

export default function EditorPage() {
  const [activeTool, setActiveTool] = useState<ToolId>("media");
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // --- PLAYER STATE ---
  const [playerSrc, setPlayerSrc] = useState<string | null>(null);
  const [playerClipStart, setPlayerClipStart] = useState(0);
  const [playerClipOffset, setPlayerClipOffset] = useState(0);

  // --- ENGINE: CALCULATE WHAT TO PLAY ---
  useEffect(() => {
     const videoTrack = tracks.find(t => t.type === 'video');
     if (videoTrack) {
        // Find clip under playhead
        const activeClip = videoTrack.clips.find(clip => 
            currentTime >= clip.start && currentTime < (clip.start + clip.duration)
        );

        if (activeClip && activeClip.url) {
            setPlayerSrc(activeClip.url);
            setPlayerClipStart(activeClip.start);
            setPlayerClipOffset(activeClip.offset); // PASS THE OFFSET
        } else {
            if (playerSrc !== null) setPlayerSrc(null); // Black screen
        }
     }
  }, [currentTime, tracks, playerSrc]);

  // --- ACTIONS ---

  const handleDropNewClip = (trackId: string, clipData: any, time: number) => {
    const newClip: Clip = {
        id: Math.random().toString(36).substr(2, 9),
        name: clipData.name,
        start: time,
        duration: clipData.duration || 10,
        offset: 0, // Starts at beginning of file
        url: clipData.url,
        type: clipData.type
    };
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t));
    setSelectedClipId(newClip.id);
    setCurrentTime(time);
  };

  const handleUpdateClip = (trackId: string, clipId: string, updates: Partial<Clip>) => {
    setTracks(prev => prev.map(t => 
        t.id === trackId ? { ...t, clips: t.clips.map(c => c.id === clipId ? { ...c, ...updates } : c) } : t
    ));
  };

  const handleSwitchTrack = (clipId: string, oldTrackId: string, newTrackId: string, newStart: number) => {
    let clipToMove: Clip | undefined;
    const temp = tracks.map(t => {
        if(t.id === oldTrackId) {
            clipToMove = t.clips.find(c => c.id === clipId);
            return { ...t, clips: t.clips.filter(c => c.id !== clipId) };
        }
        return t;
    });
    if(!clipToMove) return;
    setTracks(temp.map(t => t.id === newTrackId ? { ...t, clips: [...t.clips, { ...clipToMove!, start: newStart }] } : t));
  };

  // --- SPLIT LOGIC (THE FIX) ---
  const handleSplitClip = (trackId: string, clipId: string, splitTime: number) => {
    setTracks(prev => prev.map(track => {
       if (track.id !== trackId) return track;
       const originalClip = track.clips.find(c => c.id === clipId);
       if (!originalClip) return track;

       const splitPointOffset = splitTime - originalClip.start; // How far into the clip we are
       if (splitPointOffset <= 0 || splitPointOffset >= originalClip.duration) return track;

       // Left Clip: Duration shortens, Offset stays same
       const leftClip = { 
           ...originalClip, 
           duration: splitPointOffset 
       };

       // Right Clip: Start moves, Duration remainder, OFFSET INCREASES
       const rightClip = { 
           ...originalClip, 
           id: Math.random().toString(36).substr(2, 9) + "_split", 
           start: splitTime, 
           duration: originalClip.duration - splitPointOffset,
           offset: originalClip.offset + splitPointOffset // <-- MAGIC FIX
       };

       return { ...track, clips: track.clips.filter(c => c.id !== clipId).concat([leftClip, rightClip]) };
    }));
  };

  const handleDeleteClip = (trackId: string, clipId: string) => {
     setTracks(prev => prev.map(t => t.id === trackId ? { ...t, clips: t.clips.filter(c => c.id !== clipId) } : t));
     setSelectedClipId(null);
  };

  return (
    <main className="flex h-screen w-screen bg-bg-black overflow-hidden text-text-primary font-sans">
      <Sidebar activeTool={activeTool} onChange={setActiveTool} />
      <div className="flex-1 flex flex-col min-w-0 bg-bg-black">
        <TopBar />
        <div className="flex-1 flex overflow-hidden">
          <ToolsPanel activeTool={activeTool} /> 
          <div className="flex-1 flex flex-col min-w-0 bg-bg-black relative">
            <div className="flex-1 flex min-h-0">
               <Player 
                  src={playerSrc} 
                  currentTime={currentTime} 
                  isPlaying={isPlaying} 
                  onTimeUpdate={setCurrentTime} 
                  onDurationChange={()=>{}} 
                  onTogglePlay={() => setIsPlaying(!isPlaying)}
                  clipStartTime={playerClipStart}
                  clipOffset={playerClipOffset} // PASS TO PLAYER
               />
               <div className="w-75 bg-bg-dark border-l border-border-gray hidden xl:flex flex-col shrink-0">
                  <div className="p-4 border-b border-border-gray/50 h-14 flex items-center"><h2 className="text-gray-500 text-[11px] font-bold uppercase">AI Assistant</h2></div>
               </div>
            </div>
            <div className="h-87.5 flex flex-col shrink-0 z-10 border-t border-border-gray relative">
               <Timeline 
                  tracks={tracks} 
                  currentTime={currentTime} 
                  onSeek={setCurrentTime} 
                  onDropNewClip={handleDropNewClip} 
                  onUpdateClip={handleUpdateClip}
                  onSwitchTrack={handleSwitchTrack}
                  onSplitClip={handleSplitClip}
                  onDeleteClip={handleDeleteClip}
                  selectedClipId={selectedClipId ?? undefined}
                  onSelectClip={setSelectedClipId}
               />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}