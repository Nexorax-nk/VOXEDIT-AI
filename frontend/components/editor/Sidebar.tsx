// components/editor/Sidebar.tsx
"use client";

import { useState } from "react";
import { 
  Clapperboard, 
  Wand2, 
  MessageSquare, 
  FolderOpen, 
  Settings, 
  Scissors
} from "lucide-react";
import { cn } from "@/lib/utils";

// Define the Sidebar Item Type
type SidebarItem = {
  id: string;
  label: string;
  icon: React.ElementType;
};

// Menu Configuration
const MENU_ITEMS: SidebarItem[] = [
  { id: "media", label: "Media", icon: Clapperboard },
  { id: "ai-edit", label: "AI Edit", icon: Scissors }, // AI Edit
  { id: "ai-feedback", label: "AI Feedback", icon: MessageSquare },
  { id: "projects", label: "Projects", icon: FolderOpen },
];

export default function Sidebar() {
  const [activeId, setActiveId] = useState("media");

  return (
    <aside className="w-18 h-full bg-bg-dark border-r border-border-gray flex flex-col items-center py-4 z-50">
      {/* --- Top Logo --- */}
      <div className="mb-8 flex flex-col items-center justify-center group cursor-pointer">
        <div className="w-10 h-10 bg-electric-red rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,46,77,0.4)] transition-all group-hover:scale-105">
           {/* Simple V Logo */}
           <span className="text-white font-black text-xl">V</span>
        </div>
        {/* Only show logo text on hover or tooltip in real app, keeping it clean for now */}
      </div>

      {/* --- Navigation Items --- */}
      <nav className="flex-1 w-full flex flex-col gap-4 px-2">
        {MENU_ITEMS.map((item) => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveId(item.id)}
              className={cn(
                "group relative w-full flex flex-col items-center justify-center py-3 rounded-xl transition-all duration-200",
                isActive 
                  ? "bg-bg-lighter text-white" 
                  : "text-text-secondary hover:text-white hover:bg-bg-lighter/50"
              )}
            >
              {/* Active Indicator Strip */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-electric-red rounded-r-full shadow-[0_0_10px_#FF2E4D]" />
              )}

              <item.icon 
                className={cn(
                  "w-6 h-6 mb-1.5 transition-transform duration-200",
                  isActive ? "text-electric-red" : "group-hover:scale-110"
                )} 
              />
              <span className="text-[10px] font-medium tracking-wide">
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