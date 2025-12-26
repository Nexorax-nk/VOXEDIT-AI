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
} from "lucide-react";
import { ToolId } from "./Sidebar";

// ================= TYPES =================
type MediaFile = {
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

  // ---- FILE UPLOAD ----
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    Array.from(e.target.files).forEach((file) => {
      const url = URL.createObjectURL(file);

      if (file.type.startsWith("video")) {
        const video = document.createElement("video");
        video.src = url;
        video.onloadedmetadata = () => {
          setFiles((prev) => [
            ...prev,
            {
              name: file.name,
              type: "video",
              url,
              duration: video.duration || 10,
            },
          ]);
        };
      } else {
        setFiles((prev) => [
          ...prev,
          {
            name: file.name,
            type: "image",
            url,
            duration: 5,
          },
        ]);
      }
    });
  };

  // ---- DRAG START (TIMELINE) ----
  const handleDragStart = (e: React.DragEvent, file: MediaFile) => {
    e.dataTransfer.setData("application/json", JSON.stringify(file));
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="flex flex-col h-full bg-black/40">

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        hidden
        multiple
        accept="image/*,video/*"
        onChange={handleFileChange}
      />

      {/* Upload Button */}
      <div className="p-4 shrink-0">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="
            w-full py-3 rounded-xl
            border-2 border-dashed border-neutral-700
            flex items-center justify-center gap-3
            transition-all
            hover:border-electric-red
            group
          "
        >
          <Plus className="w-5 h-5 text-neutral-500 group-hover:text-electric-red" />
          <span className="text-sm font-medium text-neutral-400 group-hover:text-white">
            Import Media
          </span>
        </button>
      </div>

      {/* Media Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
        {files.length === 0 ? (
          <div className="mt-12 text-center text-neutral-500 select-none">
            <Film className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-xs">No media uploaded</p>
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

                {/* Hover Overlay */}
                <div className="
                  absolute inset-0 bg-black/40
                  opacity-0 group-hover:opacity-100
                  transition-opacity
                  flex items-center justify-center
                ">
                  <Play className="w-7 h-7 text-white fill-white/20" />
                </div>

                {/* Filename */}
                <div className="absolute bottom-0 w-full px-2 py-1 bg-black/80 text-[9px] text-white truncate">
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

// ================= PLACEHOLDERS =================
const CopilotPanel = () => (
  <div className="p-4 text-gray-400">Copilot Panel</div>
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
    <p className="text-xs">{title}</p>
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
    <div className="w-[320px] bg-bg-dark border-r border-border-gray flex flex-col shrink-0 z-10">
      <div className="p-4 border-b border-border-gray/50 h-14 flex items-center">
        <h2 className="text-text-secondary text-[11px] uppercase tracking-[0.2em] font-bold">
          {titles[activeTool] || "Tool"}
        </h2>
      </div>

      <div className="flex-1 overflow-hidden">
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
