// components/editor/ToolsPanel.tsx
"use client";

import { useState, useRef } from "react";
import {
  Plus,
  Film,
  Play,
  Sparkles,
  FolderOpen,
  MessageSquare,
  Captions,
  Loader2, // Added loader icon
} from "lucide-react";
import { ToolId } from "./Sidebar";
import { cn } from "@/lib/utils";

// ================= TYPES =================
export type MediaFile = {
  name: string;
  type: "video" | "image";
  url: string;
  duration: number;
};

interface ToolsPanelProps {
  activeTool: ToolId;
  onMediaSelect?: (url: string) => void;
}

// ================= MEDIA PANEL =================
const MediaPanel = ({ onSelect }: { onSelect?: (url: string) => void }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // ---- FILE UPLOAD (BACKEND INTEGRATION) ----
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0]; // Handle single file for simplicity first
    setIsUploading(true);

    try {
      // 1. Prepare FormData
      const formData = new FormData();
      formData.append("file", file);

      // 2. Upload to Python Backend
      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Backend upload failed");

      const data = await response.json();
      const serverUrl = data.url; // e.g., http://localhost:8000/files/video.mp4

      // 3. Process Metadata (Duration)
      if (file.type.startsWith("video")) {
        const tempVideo = document.createElement("video");
        tempVideo.src = serverUrl;
        tempVideo.onloadedmetadata = () => {
          setFiles((prev) => [
            ...prev,
            {
              name: file.name,
              type: "video",
              url: serverUrl, // Use REAL Server URL
              duration: tempVideo.duration || 10,
            },
          ]);
          setIsUploading(false);
        };
      } else {
        // Images
        setFiles((prev) => [
          ...prev,
          {
            name: file.name,
            type: "image",
            url: serverUrl,
            duration: 5,
          },
        ]);
        setIsUploading(false);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading to backend. Is 'python main.py' running?");
      setIsUploading(false);
    }
  };

  // ---- 🔥 CRITICAL: DRAG TO TIMELINE ----
  const handleDragStart = (e: React.DragEvent, file: MediaFile) => {
    // We attach the JSON data so the Timeline knows what to render
    e.dataTransfer.setData("application/json", JSON.stringify(file));
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="flex flex-col h-full bg-black/40">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept="image/*,video/*"
        onChange={handleFileChange}
      />

      {/* Upload Button */}
      <div className="p-4 shrink-0">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            "w-full py-3 rounded-xl border-2 border-dashed border-neutral-700 flex items-center justify-center gap-3 transition-all group",
            isUploading
              ? "opacity-50 cursor-not-allowed border-neutral-800"
              : "hover:border-electric-red hover:bg-electric-red/5 cursor-pointer"
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 text-electric-red animate-spin" />
              <span className="text-sm font-medium text-neutral-400">
                Uploading...
              </span>
            </>
          ) : (
            <>
              <Plus className="w-5 h-5 text-neutral-500 group-hover:text-electric-red transition-colors" />
              <span className="text-sm font-medium text-neutral-400 group-hover:text-white transition-colors">
                Import Media
              </span>
            </>
          )}
        </button>
      </div>

      {/* Media Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
        {files.length === 0 ? (
          <div className="mt-12 text-center text-neutral-500 select-none">
            <Film className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-xs tracking-wide">No media uploaded</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {files.map((file, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={(e) => handleDragStart(e, file)}
                onClick={() => onSelect?.(file.url)}
                className="
                  relative aspect-square rounded-lg overflow-hidden
                  border border-neutral-800 bg-black
                  cursor-grab active:cursor-grabbing
                  transition-all
                  hover:border-electric-red
                  group
                "
              >
                {file.type === "video" ? (
                  <video
                    src={file.url}
                    className="w-full h-full object-cover opacity-80 pointer-events-none"
                  />
                ) : (
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-cover opacity-80 pointer-events-none"
                  />
                )}

                {/* Hover Play Overlay */}
                <div className="
                  absolute inset-0 bg-black/40
                  opacity-0 group-hover:opacity-100
                  transition-opacity
                  flex items-center justify-center
                ">
                  <Play className="w-8 h-8 text-white fill-white/20" />
                </div>

                {/* Filename */}
                <div className="absolute bottom-0 w-full px-2 py-1 bg-linear-to-t from-black/90 to-transparent text-[9px] text-white truncate">
                  {file.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ================= OTHER PANELS =================
const CopilotPanel = () => (
  <div className="p-4 flex flex-col h-full">
    <div className="flex-1 bg-black/20 rounded-lg border border-white/5 p-4 mb-4">
      <div className="flex gap-3 text-sm text-neutral-400">
        <div className="w-6 h-6 rounded-full bg-electric-red/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-3 h-3 text-electric-red"/>
        </div>
        <p>I can help you edit. Try asking "Remove silence" or "Add captions".</p>
      </div>
    </div>
    <div className="relative">
        <input 
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-electric-red" 
            placeholder="Ask AI..."
        />
    </div>
  </div>
);

const PlaceholderPanel = ({
  title,
  icon: Icon,
}: {
  title: string;
  icon: any;
}) => (
  <div className="flex flex-col items-center justify-center h-full opacity-40">
    <Icon className="w-10 h-10 mb-2" />
    <p className="text-xs font-medium tracking-wide">{title}</p>
  </div>
);

// ================= MAIN =================
export default function ToolsPanel({
  activeTool,
  onMediaSelect,
}: ToolsPanelProps) {
  const titles: Record<string, string> = {
    media: "Media Library",
    copilot: "AI Copilot",
    "magic-assets": "Magic Assets",
    subtitles: "Subtitles",
    "ai-feedback": "AI Feedback",
    projects: "Projects",
    settings: "Settings",
  };

  return (
    <div className="w-[320px] bg-bg-dark border-r border-border-gray flex flex-col shrink-0 z-10 transition-all">
      <div className="p-4 border-b border-border-gray/50 h-14 flex items-center justify-between">
        <h2 className="text-text-secondary text-[11px] uppercase tracking-[0.2em] font-bold">
          {titles[activeTool] || "Tool"}
        </h2>
      </div>

      <div className="flex-1 overflow-hidden bg-bg-dark">
        {activeTool === "media" && <MediaPanel onSelect={onMediaSelect} />}
        {activeTool === "copilot" && <CopilotPanel />}
        {activeTool === "magic-assets" && (
          <PlaceholderPanel title="Magic Assets" icon={Sparkles} />
        )}
        {activeTool === "subtitles" && (
          <PlaceholderPanel title="Subtitles" icon={Captions} />
        )}
        {activeTool === "ai-feedback" && (
          <PlaceholderPanel title="Feedback" icon={MessageSquare} />
        )}
        {activeTool === "projects" && (
          <PlaceholderPanel title="Projects" icon={FolderOpen} />
        )}
      </div>
    </div>
  );
}