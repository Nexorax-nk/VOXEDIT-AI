// app/page.tsx
import Sidebar from "@/components/editor/Sidebar";

export default function EditorPage() {
  return (
    <main className="flex h-screen w-screen bg-bg-black overflow-hidden text-text-primary">
      
      {/* 1. Left Sidebar (Fixed Width) */}
      <Sidebar />

      {/* 2. Main Workspace Area */}
      {/* This area will eventually hold: ToolsPanel, Player, AIGenPanel, Timeline */}
      <div className="flex-1 flex flex-col relative">
        
        {/* Placeholder for TopBar */}
        <header className="h-14 border-b border-border-gray bg-bg-black flex items-center px-6 justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-text-secondary">
              <span className="text-xs text-electric-red ml-2 border border-electric-red/30 px-2 py-0.5 rounded bg-electric-red/10">
                VOXEDIT AI
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-4 py-1.5 bg-electric-red hover:bg-electric-red-hover text-white text-xs font-bold uppercase tracking-wider rounded transition-colors shadow-lg shadow-electric-red/20">
              Export
            </button>
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-gray-700 to-gray-600 border border-gray-500" />
          </div>
        </header>

        {/* Workspace Content Grid */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Panel Placeholder (ToolsPanel) */}
          <div className="w-75 bg-bg-dark border-r border-border-gray hidden md:flex flex-col p-4">
             <h2 className="text-text-secondary text-xs uppercase tracking-widest font-bold mb-4">Media Library</h2>
             {/* Empty State for now */}
             <div className="flex-1 border-2 border-dashed border-border-gray rounded-xl flex items-center justify-center">
                <span className="text-text-secondary text-xs">Drag & Drop Media</span>
             </div>
          </div>

          {/* Center Stage (Player) */}
          <div className="flex-1 bg-black/50 relative p-8 flex items-center justify-center">
             <div className="aspect-video w-full max-w-3xl bg-black border border-border-gray rounded-lg shadow-2xl flex items-center justify-center">
                <p className="text-text-secondary">Video Preview</p>
             </div>
          </div>

          {/* Right Panel Placeholder (AIGenPanel) */}
          <div className="w-70 bg-bg-dark border-l border-border-gray hidden lg:flex flex-col p-4">
             <h2 className="text-text-secondary text-xs uppercase tracking-widest font-bold mb-4">AI Assistant</h2>
          </div>

        </div>

        {/* Bottom Timeline Placeholder */}
        <div className="h-50 bg-bg-dark border-t border-border-gray w-full p-2">
           <div className="w-full h-full bg-bg-black/30 rounded border border-border-gray/30 flex items-center justify-center text-xs text-text-secondary">
              Timeline Area
           </div>
        </div>

      </div>
    </main>
  );
}