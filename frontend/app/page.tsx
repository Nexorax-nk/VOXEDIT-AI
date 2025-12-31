"use client";

import { useState, useEffect } from "react";
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
  
  // --- STATE ---
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  
  // --- EXPORT STATE ---
  const [isExporting, setIsExporting] = useState(false);

  // --- PLAYER STATE ---
  const [playerSrc, setPlayerSrc] = useState<string | null>(null);
  const [playerClipStart, setPlayerClipStart] = useState(0);
  const [playerClipOffset, setPlayerClipOffset] = useState(0);

  // --- ENGINE 1: CLIP DETECTION ---
  useEffect(() => {
     const videoTrack = tracks.find(t => t.type === 'video');
     
     if (videoTrack) {
        // Check if we are inside any clip
        const activeClip = videoTrack.clips.find(clip => 
            currentTime >= clip.start && currentTime < (clip.start + clip.duration)
        );

        if (activeClip && activeClip.url) {
            // ONLY update if it's a DIFFERENT clip to prevent re-renders
            if (playerSrc !== activeClip.url) {
                setPlayerSrc(activeClip.url);
                setPlayerClipStart(activeClip.start);
                setPlayerClipOffset(activeClip.offset);
            }
        } else {
            // We are in empty space
            if (playerSrc !== null) {
                setPlayerSrc(null);
            }
        }
     }
  }, [currentTime, tracks, playerSrc]);

  // --- ENGINE 2: GAP PLAYBACK (FIXED) ---
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      
      // If we are playing and there is NO video source, we must tick the clock manually.
      // This handles the "Empty Space" between clips.
      if (isPlaying && !playerSrc) {
          setCurrentTime(prev => prev + delta);
          animationFrameId = requestAnimationFrame(tick);
      }
    };

    if (isPlaying && !playerSrc) {
      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(tick);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, playerSrc]);

  // --- TIMELINE ACTIONS ---

  const handleDropNewClip = (trackId: string, clipData: any, time: number) => {
    const newClip: Clip = {
        id: Math.random().toString(36).substr(2, 9),
        name: clipData.name,
        start: time,
        duration: clipData.duration || 10,
        offset: 0, 
        url: clipData.url,
        type: clipData.type
    };
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t));
    setSelectedClipId(newClip.id);
    setCurrentTime(time); 
  };

  const handleUpdateClip = (trackId: string, clipId: string, updates: Partial<Clip>) => {
    setTracks(prev => prev.map(t => 
        t.id === trackId 
            ? { ...t, clips: t.clips.map(c => c.id === clipId ? { ...c, ...updates } : c) } 
            : t
    ));
  };

  const handleSwitchTrack = (clipId: string, oldTrackId: string, newTrackId: string, newStart: number) => {
    let clipToMove: Clip | undefined;
    const afterRemove = tracks.map(t => {
        if(t.id === oldTrackId) {
            clipToMove = t.clips.find(c => c.id === clipId);
            return { ...t, clips: t.clips.filter(c => c.id !== clipId) };
        }
        return t;
    });

    if(!clipToMove) return;

    setTracks(afterRemove.map(t => {
        if(t.id === newTrackId) {
            return { ...t, clips: [...t.clips, { ...clipToMove!, start: newStart }] };
        }
        return t;
    }));
  };

  const handleSplitClip = (trackId: string, clipId: string, splitTime: number) => {
    setTracks(prev => prev.map(track => {
       if (track.id !== trackId) return track;
       const originalClip = track.clips.find(c => c.id === clipId);
       if (!originalClip) return track;

       const offset = splitTime - originalClip.start;
       if (offset <= 0 || offset >= originalClip.duration) return track;

       const leftClip = { ...originalClip, duration: offset };
       
       const rightClip = { 
           ...originalClip, 
           id: Math.random().toString(36).substr(2, 9) + "_split", 
           start: splitTime, 
           duration: originalClip.duration - offset,
           offset: originalClip.offset + offset 
       };

       const newClips = track.clips.filter(c => c.id !== clipId);
       newClips.push(leftClip, rightClip);
       return { ...track, clips: newClips };
    }));
  };

  const handleDeleteClip = (trackId: string, clipId: string) => {
     setTracks(prev => prev.map(t => t.id === trackId ? { ...t, clips: t.clips.filter(c => c.id !== clipId) } : t));
     setSelectedClipId(null);
  };

  // --- AI INTEGRATION LOGIC ---
  const getSelectedClipObject = () => {
    if (!selectedClipId) return null;
    for (const t of tracks) {
        const c = t.clips.find(clip => clip.id === selectedClipId);
        if (c) return c;
    }
    return null;
  };

  const handleAiProcessingComplete = (newUrl: string, newDuration: number) => {
    if (!selectedClipId) return;

    setTracks(prev => prev.map(track => {
        if (!track.clips.some(c => c.id === selectedClipId)) return track;

        return {
            ...track,
            clips: track.clips.map(c => {
                if (c.id === selectedClipId) {
                    return {
                        ...c,
                        url: newUrl,
                        offset: 0,
                        name: c.name + " (AI)",
                        duration: newDuration
                    };
                }
                return c;
            })
        };
    }));
    
    setPlayerSrc(newUrl);
    setPlayerClipOffset(0);
  };

  // --- EXPORT LOGIC ---
  const handleExport = async () => {
      // 1. Get clips from the main video track
      const videoTrack = tracks.find(t => t.type === 'video');
      if (!videoTrack || videoTrack.clips.length === 0) {
          alert("No clips to export!");
          return;
      }

      // 2. Sort clips by start time (Timeline Order)
      const sortedClips = [...videoTrack.clips].sort((a, b) => a.start - b.start);

      // 3. Prepare data for backend
      // We need to extract the actual filename from the URL to tell backend what to stitch
      const clipData = sortedClips.map(c => ({
          filename: c.url?.split("/").pop() || "",
          duration: c.duration
      }));

      setIsExporting(true);

      try {
          const formData = new FormData();
          formData.append("project_data", JSON.stringify(clipData));

          const res = await fetch("http://localhost:8000/render", {
              method: "POST",
              body: formData
          });

          const data = await res.json();

          if (data.status === "success") {
              // Trigger Browser Download
              const link = document.createElement('a');
              link.href = data.url;
              link.download = "voxedit_final.mp4";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
          } else {
              alert("Export failed: " + data.message);
          }
      } catch (e) {
          console.error(e);
          alert("Export failed. Check console.");
      } finally {
          setIsExporting(false);
      }
  };

  return (
    <main className="flex h-screen w-screen bg-bg-black overflow-hidden text-text-primary font-sans">
      <Sidebar activeTool={activeTool} onChange={setActiveTool} />
      
      <div className="flex-1 flex flex-col min-w-0 bg-bg-black">
        {/* Pass Export Logic to TopBar */}
        <TopBar onExport={handleExport} isExporting={isExporting} />
        
        <div className="flex-1 flex overflow-hidden">
          <ToolsPanel 
             activeTool={activeTool} 
             onMediaSelect={(url) => { /* Optional */ }} 
             selectedClip={getSelectedClipObject()}
             onUpdateProcessedClip={handleAiProcessingComplete}
          />
          
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
                  clipOffset={playerClipOffset}
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