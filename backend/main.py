# backend/main.py
import os
import shutil
import speech_recognition as sr
from pydub import AudioSegment
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import io
import json 
import ffmpeg 
from services.subtitle_gen import generate_subtitles
from contextlib import asynccontextmanager
import asyncio

# --- IMPORT CUSTOM SERVICES -----
from services.ai_agent import analyze_command
from services.video_engine import process_video, stitch_videos
from services.voice_gen import generate_voice_reply 
from services.sfx_gen import generate_sound_effect

# --- IMPORT ASYNC PIPELINE ---
from services.pubsub import listen_for_updates
from tasks import task_analyze_and_edit, task_voice_command, task_render_project

# We will define the lifespan after manager is defined

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "temp_storage"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/files", StaticFiles(directory=UPLOAD_DIR), name="files")


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        # Iterate over a copy to safely remove dead connections
        for connection in self.active_connections[:]:
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start Redis pubsub listener in background
    listener_task = asyncio.create_task(listen_for_updates(manager))
    yield
    listener_task.cancel()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "temp_storage"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/files", StaticFiles(directory=UPLOAD_DIR), name="files")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        # Catch Windows-specific ConnectionResetErrors (WinError 10054) and ensures the correct windows
        manager.disconnect(websocket)

# --- 1. UPLOAD ENDPOINT ---
@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"filename": file.filename, "url": f"http://localhost:8000/files/{file.filename}"}

# --- 2. TEXT EDIT ENDPOINT ---
@app.post("/edit")
async def edit_video(
    command: str = Form(...), 
    filename: str = Form(...),
    clip_start: float = Form(0.0),
    clip_duration: float = Form(None)
):
    print(f"🎬 EDIT REQUEST: '{command}'")
    
    # 🧠 Broadcast: Start
    await manager.broadcast({"type": "log", "level": "info", "message": f"Incoming command: '{command}'. Queuing task..."})
    
    input_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail="File not found")

    # Dispatch to Celery
    task = task_analyze_and_edit.delay(command, filename, clip_start, clip_duration)
    
    return {
        "status": "processing",
        "task_id": task.id,
        "message": "Task queued successfully"
    }

# --- 3. VOICE COMMAND ENDPOINT ---
@app.post("/voice-command")
async def voice_command(
    audio: UploadFile = File(...),
    filename: str = Form(...),
    clip_start: float = Form(0.0),
    clip_duration: float = Form(None)
):
    print("🎤 Receiving Voice Command...")
    await manager.broadcast({"type": "log", "level": "info", "message": "Receiving audio stream..."})
    
    try:
        # A. Save & Convert
        temp_audio_path = f"temp_storage/temp_voice_{audio.filename}"
        with open(temp_audio_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

        audio_segment = AudioSegment.from_file(temp_audio_path)
        wav_path = temp_audio_path + ".wav"
        audio_segment.export(wav_path, format="wav")

        # B. Transcribe Locally (FastAPI thread)
        await manager.broadcast({"type": "log", "level": "analysis", "message": "Transcribing audio..."})
        recognizer = sr.Recognizer()
        with sr.AudioFile(wav_path) as source:
            audio_data = recognizer.record(source)
            try:
                text_command = recognizer.recognize_google(audio_data)
                print(f"🗣️ Transcribed: '{text_command}'")
                await manager.broadcast({"type": "log", "level": "success", "message": f"Identified intent: '{text_command}'. Queuing task..."})
            except sr.UnknownValueError:
                return {"status": "error", "message": "Could not understand audio"}
            except sr.RequestError:
                return {"status": "error", "message": "Speech service unavailable"}

        if os.path.exists(temp_audio_path): os.remove(temp_audio_path)
        if os.path.exists(wav_path): os.remove(wav_path)

        # C. Dispatch to Celery
        task = task_voice_command.delay(text_command, filename, clip_start, clip_duration)
        
        return {
            "status": "processing",
            "task_id": task.id,
            "transcription": text_command,
            "message": "Task queued successfully"
        }

    except Exception as e:
        print(f"Voice Error: {e}")
        return {"status": "error", "message": str(e)}

# --- 4. RENDER ENDPOINT ---
@app.post("/render")
async def render_project(project_data: str = Form(...)):
    print("🎬 Received Render Request...")
    
    try:
        clips = json.loads(project_data)
        if not clips: return {"status": "error", "message": "No clips to render"}
        
        await manager.broadcast({"type": "log", "level": "info", "message": "Queuing final project render..."})

        # Dispatch to Celery
        task = task_render_project.delay(clips)
        
        return {
            "status": "processing",
            "task_id": task.id,
            "message": "Task queued successfully"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- 5. SFX ENDPOINT ---
@app.post("/generate-sfx")
async def generate_sfx_endpoint(text: str = Form(...), duration: int = Form(None)):
    print(f"✨ Generating SFX: '{text}'")
    await manager.broadcast({"type": "log", "level": "info", "message": f"Generating SFX: '{text}'"})
    
    output_path = generate_sound_effect(text, duration)
    if not output_path: raise HTTPException(status_code=500, detail="SFX Failed")

    filename = os.path.basename(output_path)
    try:
        probe = ffmpeg.probe(output_path)
        dur = float(probe['format']['duration'])
    except:
        dur = 3.0

    await manager.broadcast({"type": "log", "level": "success", "message": "SFX Generation Complete."})
    return {"status": "success", "url": f"http://localhost:8000/files/{filename}", "duration": dur, "name": text}

# --- 6. SUBTITLES ENDPOINT ---
@app.post("/generate-subtitles")
async def generate_subtitles_endpoint(filename: str = Form(...)):
    print(f"📝 Generating Subtitles for: {filename}")
    await manager.broadcast({"type": "log", "level": "info", "message": "Analyzing audio for subtitles..."})
    
    subtitles = generate_subtitles(filename)
    if subtitles is None: raise HTTPException(status_code=500, detail="Subtitle generation failed")
    
    await manager.broadcast({"type": "log", "level": "success", "message": "Subtitles generated."})
    return {"status": "success", "subtitles": subtitles}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
