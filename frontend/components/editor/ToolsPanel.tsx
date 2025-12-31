// components/editor/ToolsPanel.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Film,
  Play,
  Sparkles,
  FolderOpen,
  MessageSquare,
  Captions,
  Loader2,
  Send,
  User,
  Bot,
  Trash2,
  Mic,          // NEW
  Keyboard,     // NEW
  StopCircle    // NEW
} from "lucide-react";
import { ToolId } from "./Sidebar";
import { cn } from "@/lib/utils";
import { Clip } from "./Timeline";

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
  selectedClip?: Clip | null;
  onUpdateProcessedClip?: (newUrl: string, newDuration: number) => void; 
}

type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          { name: file.name, type: "image", url: serverUrl, duration: 5 },
        ]);
        setIsUploading(false);
      }
    } catch (err) {
      console.error(err);
      alert("Backend not running? Make sure 'python main.py' is active.");
      setIsUploading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, file: MediaFile) => {
    e.dataTransfer.setData("application/json", JSON.stringify(file));
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="flex flex-col h-full bg-black/40">
      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept="image/*,video/*"
        onChange={handleFileChange}
      />

      <div className="p-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            "w-full py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-3 transition-all",
            isUploading
              ? "opacity-50 border-neutral-800 cursor-not-allowed"
              : "border-neutral-700 hover:border-electric-red hover:bg-electric-red/5"
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-electric-red" />
              <span className="text-sm text-neutral-400">Uploading...</span>
            </>
          ) : (
            <>
              <Plus className="w-5 h-5 text-neutral-500" />
              <span className="text-sm text-neutral-400">Import Media</span>
            </>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
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
                onDragStart={(e) => handleDragStart(e, file)}
                onClick={() => onSelect?.(file.url)}
                className="relative aspect-square rounded-lg overflow-hidden border border-neutral-800 cursor-pointer group hover:border-electric-red"
              >
                {file.type === "video" ? (
                  <video src={file.url} className="w-full h-full object-cover opacity-80 pointer-events-none" />
                ) : (
                  <img src={file.url} className="w-full h-full object-cover opacity-80 pointer-events-none" />
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

/* ================= COPILOT (CHAT) PANEL ================= */

const CopilotPanel = ({ 
  selectedClip,
  onProcessComplete,
  messages,
  setMessages
}: { 
  selectedClip?: Clip | null, 
  onProcessComplete?: (url: string, newDuration: number) => void,
  messages: ChatMessage[],
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
}) => {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<"chat" | "voice">("chat"); 
  const [isRecording, setIsRecording] = useState(false);      
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- TEXT SEND LOGIC ---
  const handleSend = async () => {
    if (!input.trim()) return;
    executeCommand(input);
  };

  // --- VOICE LOGIC (REAL) ---
  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
            
            // Validation
            if (!selectedClip) {
                 setMessages(prev => [...prev, { role: "ai", text: "⚠️ Please select a clip first!" }]);
                 return;
            }

            // UI Feedback
            setMessages(prev => [...prev, { role: "user", text: "🎤 Processing voice..." }]);
            setIsProcessing(true);

            try {
                // Prepare Form Data
                const formData = new FormData();
                formData.append("audio", audioBlob, "voice_command.webm"); // Send blob
                
                const filename = selectedClip.url?.split('/').pop() || "";
                formData.append("filename", filename);
                const clipOffset = (selectedClip as any).offset || 0;
                formData.append("clip_start", clipOffset.toString());
                formData.append("clip_duration", selectedClip.duration.toString());

                // Send to REAL Backend Endpoint
                const res = await fetch("http://localhost:8000/voice-command", {
                    method: "POST",
                    body: formData
                });

                const data = await res.json();

                if (data.status === "error") {
                    setMessages(prev => [...prev, { role: "ai", text: "Error: " + data.message }]);
                } else {
                    // 1. Success! Update Chat
                    setMessages(prev => {
                        const newHistory = [...prev];
                        newHistory.pop(); // Remove placeholder
                        return [
                            ...newHistory,
                            { role: "user", text: `🎤 "${data.transcription}"` },
                            { role: "ai", text: data.explanation }
                        ];
                    });

                    // 2. Play AI Voice Reply (ElevenLabs)
                    if (data.reply_audio_url) {
                        console.log("🔊 Playing AI Reply:", data.reply_audio_url);
                        const audio = new Audio(data.reply_audio_url);
                        audio.play().catch(e => console.error("Audio Playback Error:", e));
                    }

                    // 3. Update Video on Timeline (if edits were made)
                    if (data.processed_url && onProcessComplete) {
                        onProcessComplete(data.processed_url, data.new_duration);
                    }
                }
            } catch (e) {
                console.error(e);
                setMessages(prev => [...prev, { role: "ai", text: "Voice upload failed." }]);
            } finally {
                setIsProcessing(false);
            }
        };

        mediaRecorder.start();
        setIsRecording(true);
    } catch (err) {
        console.error("Mic Access Error:", err);
        alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const toggleRecording = () => {
      if (isRecording) stopRecording();
      else startRecording();
  };

  // --- SHARED TEXT EXECUTION LOGIC ---
  const executeCommand = async (commandText: string) => {
    if (!selectedClip) {
        setMessages(prev => [
            ...prev, 
            { role: "user", text: commandText }, 
            { role: "ai", text: "⚠️ Please click a clip on the Timeline first so I know what to edit." }
        ]);
        setInput("");
        return;
    }

    if (mode === "chat") {
         setMessages(prev => [...prev, { role: "user", text: commandText }]);
    }
    
    setInput("");
    setIsProcessing(true);

    try {
        const formData = new FormData();
        formData.append("command", commandText);
        
        const filename = selectedClip.url?.split('/').pop() || "";
        formData.append("filename", filename);

        const clipOffset = (selectedClip as any).offset || 0;
        formData.append("clip_start", clipOffset.toString());
        formData.append("clip_duration", selectedClip.duration.toString());

        const res = await fetch("http://localhost:8000/edit", {
            method: "POST",
            body: formData
        });

        const data = await res.json();

        if (data.status === "error") {
            setMessages(prev => [...prev, { role: "ai", text: "Error: " + data.message }]);
        } else {
            setMessages(prev => [...prev, { role: "ai", text: data.explanation }]);
            
            // Note: Text edit endpoint doesn't return audio reply URL currently, 
            // only voice command does.
            if (data.processed_url && onProcessComplete) {
                onProcessComplete(data.processed_url, data.new_duration);
            }
        }
    } catch (e) {
        setMessages(prev => [...prev, { role: "ai", text: "Server connection failed." }]);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleClearChat = () => {
      setMessages([{ role: "ai", text: "Chat cleared. Ready for new commands!" }]);
  };

  return (
    <div className="flex flex-col h-full bg-black/40 relative">
      
      {/* HEADER TABS */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <div className="flex bg-neutral-900/80 p-1 rounded-lg border border-white/5">
              <button 
                onClick={() => setMode("chat")}
                className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all", mode === "chat" ? "bg-electric-red text-white shadow-lg" : "text-neutral-500 hover:text-white")}
              >
                  <Keyboard className="w-3 h-3" /> Chat
              </button>
              <button 
                onClick={() => setMode("voice")}
                className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all", mode === "voice" ? "bg-electric-red text-white shadow-lg" : "text-neutral-500 hover:text-white")}
              >
                  <Mic className="w-3 h-3" /> Voice
              </button>
          </div>
          
          <button 
            onClick={handleClearChat}
            className="p-1.5 rounded-full bg-neutral-800/50 hover:bg-red-500/20 text-neutral-400 hover:text-red-500 transition-colors"
            title="Clear Chat"
          >
            <Trash2 className="w-3 h-3" />
          </button>
      </div>

      {/* CHAT HISTORY AREA (Shared) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "")}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              msg.role === "ai" ? "bg-electric-red" : "bg-neutral-700"
            )}>
              {msg.role === "ai" ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
            </div>
            <div className={cn(
              "p-3 rounded-2xl text-xs max-w-[80%] leading-relaxed",
              msg.role === "ai" ? "bg-neutral-800 text-neutral-300 rounded-tl-none" : "bg-electric-red text-white rounded-tr-none"
            )}>
              {msg.text}
            </div>
          </div>
        ))}
        {isProcessing && (
           <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-electric-red flex items-center justify-center shrink-0 animate-pulse">
                 <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="p-3 rounded-2xl rounded-tl-none bg-neutral-800 text-xs text-neutral-400">
                 Thinking & Rendering...
              </div>
           </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* INPUT AREA (Swaps based on Mode) */}
      <div className="p-4 border-t border-white/5 bg-bg-dark/50 backdrop-blur-sm">
        {mode === "chat" ? (
            // --- CHAT INPUT ---
            <div className="relative">
                <input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    disabled={isProcessing}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 pr-10 text-sm text-white focus:outline-none focus:border-electric-red placeholder:text-neutral-600 shadow-inner"
                    placeholder={selectedClip ? `Edit "${selectedClip.name}"...` : "Select a clip to start..."}
                />
                <button 
                    onClick={handleSend}
                    disabled={isProcessing || !input.trim()}
                    className="absolute right-2 top-2 p-1.5 rounded-lg bg-electric-red hover:bg-red-600 disabled:bg-transparent disabled:text-neutral-600 text-white transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        ) : (
            // --- VOICE INPUT ---
            <div className="flex flex-col items-center justify-center gap-3 py-2">
                <button 
                    onClick={toggleRecording}
                    className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-xl border-4",
                        isRecording 
                            ? "bg-red-500 border-red-900 animate-pulse scale-110" 
                            : "bg-neutral-800 border-neutral-700 hover:border-electric-red hover:bg-neutral-700"
                    )}
                >
                    {isRecording ? <StopCircle className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
                </button>
                <p className="text-[10px] uppercase font-bold tracking-widest text-neutral-500">
                    {isRecording ? "Listening..." : "Click to Speak"}
                </p>
            </div>
        )}
      </div>
    </div>
  );
};

/* ================= OTHER PANELS ================= */

const PlaceholderPanel = ({ title, icon: Icon }: { title: string; icon: any }) => (
  <div className="flex flex-col items-center justify-center h-full opacity-40">
    <Icon className="w-10 h-10 mb-2" />
    <p className="text-xs">{title}</p>
  </div>
);

/* ================= MAIN ================= */

export default function ToolsPanel({ 
    activeTool, 
    onMediaSelect,
    selectedClip,
    onUpdateProcessedClip 
}: ToolsPanelProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "ai", text: "Select a clip, then use Chat or Voice to edit!" }
  ]);

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
      <div className="p-4 border-b border-border-gray/50 h-14 flex items-center justify-between">
        <h2 className="text-text-secondary text-[11px] uppercase tracking-[0.2em] font-bold">
          {titles[activeTool] || "Tool"}
        </h2>
      </div>

      <div className="flex-1 overflow-hidden bg-bg-dark">
        {activeTool === "media" && (
          <MediaPanel
            files={mediaFiles}
            setFiles={setMediaFiles}
            onSelect={onMediaSelect}
          />
        )}
        
        {activeTool === "copilot" && (
            <CopilotPanel 
                selectedClip={selectedClip} 
                onProcessComplete={onUpdateProcessedClip}
                messages={chatMessages}
                setMessages={setChatMessages}
            />
        )}
        
        {activeTool === "magic-assets" && <PlaceholderPanel title="Magic Assets" icon={Sparkles} />}
        {activeTool === "subtitles" && <PlaceholderPanel title="Subtitles" icon={Captions} />}
        {activeTool === "ai-feedback" && <PlaceholderPanel title="Feedback" icon={MessageSquare} />}
        {activeTool === "projects" && <PlaceholderPanel title="Projects" icon={FolderOpen} />}
      </div>
    </div>
  );
}