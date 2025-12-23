'use client';

import React, { useState } from 'react';
import Sidebar, { EditorView } from '@/components/editor/Sidebar';
import ToolsPanel, { MediaItem } from '@/components/editor/ToolsPanel';
import TopBar from '@/components/editor/TopBar';
import Player from '@/components/editor/Player'; // <--- Import Player
 // (If you have this file created, else we stub it)

export default function EditorPage() {
  const [activeView, setActiveView] = useState<EditorView>('assets'); // Default to assets to see upload
  const [activeMedia, setActiveMedia] = useState<MediaItem | null>(null);

  return (
    <div className="flex h-screen bg-bg-main text-white font-sans overflow-hidden">
      <Sidebar activeView={activeView} onChangeView={setActiveView} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        {/* Workspace Grid */}
        <div className="flex-1 p-4 grid grid-rows-[1fr_280px] gap-4 min-h-0">
             
             {/* TOP ROW */}
             <div className="grid grid-cols-[320px_1fr_320px] gap-4 min-h-0">
                  
                  {/* LEFT: TOOLS / ASSETS */}
                  {/* We conditionally hide this div if view is not relevant to preserve grid layout, or keep it consistent */}
                  <div className="flex h-full min-h-0">
                      {['tools', 'assets'].includes(activeView) ? (
                          <ToolsPanel 
                            activeView={activeView} 
                            onSelectMedia={(item) => setActiveMedia(item)} 
                          />
                      ) : (
                          // Placeholder if viewing Settings/etc
                          <div className="w-[320px] bg-bg-panel rounded-xl border border-border flex items-center justify-center text-text-secondary">
                              Select Media or Tools
                          </div>
                      )}
                  </div>

                  {/* CENTER: PLAYER */}
                  <Player src={activeMedia?.url} />

                  {/* RIGHT: AI GENERATOR */}
                  {/* Stub for now until next step */}
                  <div className="bg-bg-panel rounded-xl border border-border p-4">
                      <h2 className="text-sm font-semibold">AI Generator</h2>
                      <p className="text-xs text-text-secondary mt-2">Coming next...</p>
                  </div>

             </div>

             {/* BOTTOM ROW: TIMELINE */}
             <div className="bg-bg-panel rounded-xl border border-border p-4">
                 <h2 className="text-sm font-semibold">Timeline (Drop Zone)</h2>
             </div>
        </div>
      </div>
    </div>
  );
}