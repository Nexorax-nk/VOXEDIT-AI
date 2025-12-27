// app/page.tsx
"use client";

import { useState } from "react";
import Sidebar, { ToolId } from "@/components/editor/Sidebar";
import TopBar from "@/components/editor/TopBar";
import ToolsPanel from "@/components/editor/ToolsPanel";
import Player from "@/components/editor/Player";
import Timeline, { Track, Clip } from "@/components/editor/Timeline";

const INITIAL_TRACKS: Track[] = [
  { id: "V1", type: "video", name: "Video Track", clips: [] },
  { id: "T1", type: "text",  name: "Text Track", clips: [] },
  { id: "A1", type: "audio", name: "Audio Track", clips: [] },
];

export default function EditorPage() {
  const [activeTool, setActiveTool] = useState<ToolId>("media");
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
  
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // --- RIPPLE ALGORITHM ---
  // Ensures clips don't overlap by pushing neighbors to the right
  const applyRipple = (trackClips: Clip[], activeClipId: string): Clip[] => {
     // 1. Sort by start time
     const sorted = [...trackClips].sort((a, b) => a.start - b.start);
     const active = sorted.find(c => c.id === activeClipId);
     if (!active) return trackClips;

     let cursor = active.start + active.duration;

     // 2. Push anything that overlaps
     return sorted.map(clip => {
         if (clip.id === activeClipId) return clip;
         if (clip.start < cursor) {
             // It overlaps! Push it.
             const pushedClip = { ...clip, start: cursor };
             cursor = pushedClip.start + pushedClip.duration;
             return pushedClip;
         }
         // No overlap, update cursor for next gap check
         if (clip.start > cursor) cursor = clip.start + clip.duration;
         return clip;
     });
  };

  // 1. DROP NEW CLIP
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
            const withNew = [...t.clips, newClip];
            // Apply ripple so dropping in middle pushes others
            return { ...t, clips: applyRipple(withNew, newClip.id) };
        }
        return t;
    }));
    
    if(newClip.url && newClip.type !== 'text') setSelectedMediaUrl(newClip.url);
    setSelectedClipId(newClip.id);
  };

  // 2. UPDATE CLIP (Move/Trim)
  const handleUpdateClip = (trackId: string, clipId: string, updates: Partial<Clip>) => {
    setTracks(prev => prev.map(t => {
        if(t.id === trackId) {
            const updatedClips = t.clips.map(c => c.id === clipId ? { ...c, ...updates } : c);
            return { ...t, clips: applyRipple(updatedClips, clipId) };
        }
        return t;
    }));
  };

  // 3. SWITCH TRACK
  const handleSwitchTrack = (clipId: string, oldTrackId: string, newTrackId: string, newStart: number) => {
    let clipToMove: Clip | undefined;

    // Remove
    const afterRemove = tracks.map(t => {
        if(t.id === oldTrackId) {
            clipToMove = t.clips.find(c => c.id === clipId);
            return { ...t, clips: t.clips.filter(c => c.id !== clipId) };
        }
        return t;
    });

    if(!clipToMove) return;

    // Add
    setTracks(afterRemove.map(t => {
        if(t.id === newTrackId) {
            const moved = { ...clipToMove!, start: newStart };
            const withMoved = [...t.clips, moved];
            return { ...t, clips: applyRipple(withMoved, clipId) };
        }
        return t;
    }));
  };

  // 4. SELECTION
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