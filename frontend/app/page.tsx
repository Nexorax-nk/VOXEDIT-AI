// app/page.tsx
"use client";

import { useState } from "react";
import Sidebar, { ToolId } from "@/components/editor/Sidebar";
import TopBar from "@/components/editor/TopBar";
import ToolsPanel from "@/components/editor/ToolsPanel";

export default function EditorPage() {
  const [activeTool, setActiveTool] = useState<ToolId>("media");

  return (
    <main className="flex h-screen w-screen bg-bg-black overflow-hidden text-text-primary font-sans">

      {/* 1. Left Sidebar */}
      <Sidebar activeTool={activeTool} onChange={setActiveTool} />

      {/* 2. Main Layout */}
      <div className="flex-1 flex flex-col min-w-0 bg-bg-black">

        {/* Top Header */}
        <TopBar />

        {/* Workspace */}
        <div className="flex-1 flex overflow-hidden">

          {/* A. Tools Panel (Media / Copilot / etc.) */}
          <ToolsPanel activeTool={activeTool} />

          {/* B. Right Column */}
          <div className="flex-1 flex flex-col min-w-0 bg-bg-black relative">

            {/* ===== Player + AI Assistant ===== */}
            <div className="flex-1 flex min-h-0">

              {/* Player */}
              <div className="flex-1 relative p-6 flex items-center justify-center bg-zinc-950/50">
                <div className="aspect-video w-full max-h-full max-w-4xl bg-black border border-border-gray rounded-lg shadow-2xl flex flex-col relative overflow-hidden group">

                  {/* Video Area */}
                  <div className="flex-1 flex items-center justify-center bg-zinc-900">
                    <p className="text-zinc-600 font-medium text-sm tracking-widest">
                      NO MEDIA SELECTED
                    </p>
                  </div>

                  {/* Player Controls */}
                  <div className="h-12 bg-linear-to-t from-black/90 to-transparent absolute bottom-0 w-full flex items-center px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="text-white text-[10px] font-mono">
                      00:00 / 00:00
                    </div>
                  </div>

                </div>
              </div>

              {/* AI Assistant (XL only) */}
              <div className="w-100 bg-bg-dark border-l border-border-gray hidden xl:flex flex-col shrink-0">
                <div className="p-4 border-b border-border-gray/50 h-12 flex items-center">
                  <h2 className="text-text-secondary text-[11px] uppercase tracking-[0.2em] font-bold">
                    AI Assistant
                  </h2>
                </div>

                <div className="p-4">
                  <div className="bg-bg-lighter/50 rounded-lg p-3 text-xs text-text-secondary leading-relaxed border border-white/5">
                    Hi! I'm your VOXEDIT assistant.  
                    Ask me to <b>"remove silence"</b> or <b>"add subtitles"</b>.
                  </div>
                </div>
              </div>

            </div>

            {/* ===== Timeline ===== */}
            <div className="h-75 bg-bg-dark border-t border-border-gray w-full flex flex-col shrink-0 z-10">

              {/* Timeline Toolbar */}
              <div className="h-10 border-b border-border-gray/50 flex items-center px-4 gap-4 bg-bg-dark shrink-0">
                <span className="text-[10px] text-electric-red font-mono bg-electric-red/10 px-2 py-0.5 rounded">
                  00:00:00:00
                </span>
                <div className="h-4 w-px bg-border-gray" />
              </div>

              {/* Tracks */}
              <div className="flex-1 bg-bg-black/20 overflow-y-auto overflow-x-auto relative p-2">
                <div className="min-w-full min-h-full border border-dashed border-border-gray/30 rounded flex items-center justify-center">
                  <span className="text-text-secondary text-xs opacity-50 select-none">
                    Drag media here to create sequence
                  </span>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
