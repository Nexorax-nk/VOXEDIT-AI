// components/editor/Sidebar.tsx
"use client";

import { useState } from "react";
import { 
  Clapperboard, 
  Bot,            // Icon for Copilot
  Wand2,          // Icon for Magic Assets
  Captions,       // Icon for Subtitles
  MessageSquare, 
  FolderOpen, 
  Settings 
} from "lucide-react";
import { cn } from "@/lib/utils";

// Define the Sidebar Item Type
type SidebarItem = {
  id: string;
  label: string;
  icon: React.ElementType;
};

// Updated Menu Configuration
const MENU_ITEMS: SidebarItem[] = [
  { id: "media", label: "Media", icon: Clapperboard },
  { id: "copilot", label: "Copilot", icon: Bot },
  { id: "magic-assets", label: "Magic Assets", icon: Wand2 },
  { id: "subtitles", label: "Subtitles", icon: Captions },
  { id: "ai-feedback", label: "AI Feedback", icon: MessageSquare },
  { id: "projects", label: "Projects", icon: FolderOpen },
];

export default function Sidebar() {
  // Set default active ID to 'media' or whatever you prefer
  const [activeId, setActiveId] = useState("media");

  return (
    // Changed w-18 to w-[72px] to ensure exact width if '18' isn't in your config
    <aside className="w-18 h-full bg-black flex flex-col items-center py-4 z-50 select-none">
      {/* --- Top Logo --- */}
      <div className="mb-8 flex flex-col items-center justify-center group cursor-pointer">
        <div className="w-10 h-10 bg-electric-red rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,46,77,0.4)] transition-all group-hover:scale-105">
           {/* Simple V Logo */}
           <span className="text-white font-black text-xl">V</span>
        </div>
      </div>

      {/* --- Navigation Items --- */}
      <nav className="flex-1 w-full flex flex-col gap-3 px-2">
        {MENU_ITEMS.map((item) => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveId(item.id)}
              className={cn(
                "group relative w-full flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-200",
                isActive 
                  ? "bg-bg-lighter text-white" 
                  : "text-text-secondary hover:text-white hover:bg-bg-lighter/50"
              )}
            >
              {/* Active Indicator Strip (Left Border) */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-electric-red rounded-r-full shadow-[0_0_10px_#FF2E4D]" />
              )}

              <item.icon 
                className={cn(
                  "w-6 h-6 mb-1.5 transition-transform duration-200",
                  isActive ? "text-electric-red" : "group-hover:scale-110"
                )} 
              />
              <span className="text-[10px] font-medium tracking-wide text-center leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* --- Bottom Actions --- */}
      <div className="mt-auto px-2 w-full">
        <button
          onClick={() => setActiveId("settings")}
          className={cn(
            "group w-full flex flex-col items-center justify-center py-3 rounded-xl transition-colors",
            activeId === "settings" ? "text-electric-red bg-bg-lighter" : "text-text-secondary hover:text-white hover:bg-bg-lighter/50"
          )}
        >
          <Settings className="w-6 h-6 mb-1.5" />
          <span className="text-[10px] font-medium">Settings</span>
        </button>
      </div>
    </aside>
  );
}