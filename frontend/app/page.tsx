// app/page.tsx
"use client";

import { useState } from "react";
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
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
  
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // --- 1. FREE MOVE (No Snap/Ripple by default) ---
  // We allow clips to be moved anywhere. We only check for pure overlap to avoid visual bugs if you want.
  // For "Free Movement", we basically just trust the new Start Time.
  // To implement "Push" behavior (Premiere's Ripple Edit), we'd need a specific tool mode.
  // Standard Arrow Tool = Overwrite or Gap Allowed.

  // --- 2. ACTIONS ---

  const handleDropNewClip = (trackId: string, clipData: any, time: number) => {
    const newClip: Clip = {
        id: Math.random().toString(36).substr(2, 9),
        name: clipData.name,
        start: time,
        duration: clipData.duration || 5,
        url: clipData.url,
        type: clipData.type
    };

    setTracks(prev => prev.map(t => {
        if(t.id === trackId) {
            return { ...t, clips: [...t.clips, newClip] };
        }
        return t;
    }));
    
    if(newClip.url && newClip.type !== 'text') setSelectedMediaUrl(newClip.url);
    setSelectedClipId(newClip.id);
  };

  const handleUpdateClip = (trackId: string, clipId: string, updates: Partial<Clip>) => {
    setTracks(prev => prev.map(t => {
        if(t.id === trackId) {
            return { 
                ...t, 
                clips: t.clips.map(c => c.id === clipId ? { ...c, ...updates } : c)
            };
        }
        return t;
    }));
  };

  const handleSwitchTrack = (clipId: string, oldTrackId: string, newTrackId: string, newStart: number) => {
    let clipToMove: Clip | undefined;

    // Remove from old
    const tempTracks = tracks.map(t => {
        if(t.id === oldTrackId) {
            clipToMove = t.clips.find(c => c.id === clipId);
            return { ...t, clips: t.clips.filter(c => c.id !== clipId) };
        }
        return t;
    });

    if(!clipToMove) return;

    // Add to new
    setTracks(tempTracks.map(t => {
        if(t.id === newTrackId) {
            return { ...t, clips: [...t.clips, { ...clipToMove!, start: newStart }] };
        }
        return t;
    }));
  };

  // --- CRITICAL: SPLIT LOGIC ---
  const handleSplitClip = (trackId: string, clipId: string, splitTime: number) => {
    setTracks(prev => prev.map(track => {
       if (track.id !== trackId) return track;

       const originalClip = track.clips.find(c => c.id === clipId);
       if (!originalClip) return track;

       // Calculate cut point relative to clip start
       const offset = splitTime - originalClip.start;
       
       // Validity check: Cut must be inside the clip
       if (offset <= 0 || offset >= originalClip.duration) return track;

       // 1. Create Left Segment (Keeps original ID to maintain selection if desired, or new ID)
       // Let's give BOTH new IDs to avoid "stuck" React states, or keep left as original.
       // Keeping left as original is safer for React transitions usually.
       const leftClip = {
           ...originalClip,
           duration: offset
       };

       // 2. Create Right Segment (Must have NEW ID)
       const rightClip = {
           ...originalClip,
           id: Math.random().toString(36).substr(2, 9) + "_split", // Unique ID
           start: splitTime,
           duration: originalClip.duration - offset,
           name: originalClip.name // Optional: + " (Part 2)"
       };

       // Replace original with these two
       const newClips = track.clips.filter(c => c.id !== clipId);
       newClips.push(leftClip, rightClip);

       return { ...track, clips: newClips };
    }));
  };

  const handleDeleteClip = (trackId: string, clipId: string) => {
     setTracks(prev => prev.map(t => {
         if(t.id === trackId) {
             return { ...t, clips: t.clips.filter(c => c.id !== clipId) };
         }
         return t;
     }));
     setSelectedClipId(null);
  };

  const handleSelectClip = (id: string | null) => {
    setSelectedClipId(id);
    if(id) {
        let foundUrl = null;
        tracks.forEach(t => t.clips.forEach(c => { if(c.id === id) foundUrl = c.url }));
        if(foundUrl) setSelectedMediaUrl(foundUrl);
    }
  };

  return (
    <main className="flex h-screen w-screen bg-bg-black overflow-hidden text-text-primary font-sans">
      <Sidebar activeTool={activeTool} onChange={setActiveTool} />
      <div className="flex-1 flex flex-col min-w-0 bg-bg-black">
        <TopBar />
        <div className="flex-1 flex overflow-hidden">
          <ToolsPanel activeTool={activeTool} onMediaSelect={(url) => { setSelectedMediaUrl(url); setCurrentTime(0); }} />
          <div className="flex-1 flex flex-col min-w-0 bg-bg-black relative">
            <div className="flex-1 flex min-h-0">
               <Player src={selectedMediaUrl} currentTime={currentTime} isPlaying={isPlaying} onTimeUpdate={setCurrentTime} onDurationChange={()=>{}} onTogglePlay={() => setIsPlaying(!isPlaying)} />
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
                  onSelectClip={handleSelectClip}
               />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}