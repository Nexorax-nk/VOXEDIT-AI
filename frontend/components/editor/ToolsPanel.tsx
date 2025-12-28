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
  Loader2,
} from "lucide-react";
import { ToolId } from "./Sidebar";
import { cn } from "@/lib/utils";

/* ================= TYPES ================= */

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

/* ================= MEDIA PANEL ================= */

const MediaPanel = ({
  files,
  setFiles,
  onSelect,
}: {
  files: MediaFile[];
  setFiles: React.Dispatch<React.SetStateAction<MediaFile[]>>;
  onSelect?: (url: string) => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      const serverUrl = data.url;

      if (file.type.startsWith("video")) {
        const video = document.createElement("video");
        video.src = serverUrl;
        video.onloadedmetadata = () => {
          setFiles((prev) => [
            ...prev,
            {
              name: file.name,
              type: "video",
              url: serverUrl,
              duration: video.duration || 10,
            },
          ]);
          setIsUploading(false);
        };
      } else {
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
    } catch (err) {
      console.error(err);
      alert("Backend not running?");
      setIsUploading(false);
    }
  };

  const handleDragStart = (
    e: React.DragEvent,
    file: MediaFile
  ) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify(file)
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="flex flex-col h-full bg-black/40">
      {/* Hidden Input */}
      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept="image/*,video/*"
        onChange={handleFileChange}
      />

      {/* Upload */}
      <div className="p-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            "w-full py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-3",
            isUploading
              ? "opacity-50 border-neutral-800"
              : "border-neutral-700 hover:border-electric-red hover:bg-electric-red/5"
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-electric-red" />
              <span className="text-sm text-neutral-400">
                Uploading...
              </span>
            </>
          ) : (
            <>
              <Plus className="w-5 h-5 text-neutral-500" />
              <span className="text-sm text-neutral-400">
                Import Media
              </span>
            </>
          )}
        </button>
      </div>

      {/* Media Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {files.length === 0 ? (
          <div className="mt-12 text-center text-neutral-500">
            <Film className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-xs">No media uploaded</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {files.map((file, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={(e) =>
                  handleDragStart(e, file)
                }
                onClick={() => onSelect?.(file.url)}
                className="relative aspect-square rounded-lg overflow-hidden border border-neutral-800 cursor-grab group hover:border-electric-red"
              >
                {file.type === "video" ? (
                  <video
                    src={file.url}
                    className="w-full h-full object-cover opacity-80 pointer-events-none"
                  />
                ) : (
                  <img
                    src={file.url}
                    className="w-full h-full object-cover opacity-80 pointer-events-none"
                  />
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                  <Play className="w-8 h-8 text-white" />
                </div>

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

/* ================= OTHER PANELS ================= */

const CopilotPanel = () => (
  <div className="p-4 h-full">
    <div className="bg-black/20 border border-white/5 rounded-lg p-4 text-sm text-neutral-400">
      <Sparkles className="inline w-4 h-4 mr-2 text-electric-red" />
      Ask things like “Remove silence” or “Add captions”
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
    <p className="text-xs">{title}</p>
  </div>
);

/* ================= MAIN ================= */

export default function ToolsPanel({
  activeTool,
  onMediaSelect,
}: ToolsPanelProps) {
  const [mediaFiles, setMediaFiles] =
    useState<MediaFile[]>([]);

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
    <div className="w-[320px] bg-bg-dark border-r border-border-gray flex flex-col">
      <div className="p-4 border-b border-border-gray h-14">
        <h2 className="text-[11px] uppercase tracking-widest text-neutral-400">
          {titles[activeTool]}
        </h2>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTool === "media" && (
          <MediaPanel
            files={mediaFiles}
            setFiles={setMediaFiles}
            onSelect={onMediaSelect}
          />
        )}
        {activeTool === "copilot" && <CopilotPanel />}
        {activeTool === "magic-assets" && (
          <PlaceholderPanel
            title="Magic Assets"
            icon={Sparkles}
          />
        )}
        {activeTool === "subtitles" && (
          <PlaceholderPanel
            title="Subtitles"
            icon={Captions}
          />
        )}
        {activeTool === "ai-feedback" && (
          <PlaceholderPanel
            title="AI Feedback"
            icon={MessageSquare}
          />
        )}
        {activeTool === "projects" && (
          <PlaceholderPanel
            title="Projects"
            icon={FolderOpen}
          />
        )}
      </div>
    </div>
  );
}
