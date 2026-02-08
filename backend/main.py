# backend/main.py
import os
import shutil
import speech_recognition as sr
from pydub import AudioSegment
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import io
import json 
import ffmpeg # Needed for probing duration
from services.subtitle_gen import generate_subtitles

# --- IMPORT CUSTOM SERVICES ---
from services.ai_agent import analyze_command
from services.video_engine import process_video, stitch_videos
from services.voice_gen import generate_voice_reply 
from services.sfx_gen import generate_sound_effect

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for dev convenience
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "temp_storage"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/files", StaticFiles(directory=UPLOAD_DIR), name="files")

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
    print(f"🎬 EDIT REQUEST: '{command}' on file '{filename}'")
    input_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail="File not found")

    # A. Ask AI (Now sending the filename so Gemini can WATCH it!)
    ai_plan = await analyze_command(command, video_filename=filename)
    
    # B. Compatibility Adapter (Handle both new and old AI formats)
    # The new agent returns 'segments_to_keep', older might return 'actions'
    actions = ai_plan.get("segments_to_keep", ai_plan.get("actions", []))
    explanation = ai_plan.get("explanation", "Processed successfully.")
    
    # C. Handle Conversation (No Actions)
    if not actions:
        print("   💬 Conversational response (no edits).")
        return {
            "status": "success",
            "original_file": filename,
            "processed_url": None,
            "new_duration": None,
            "explanation": explanation,
            "actions": []
        }

    # D. Run Engine (With Actions)
    print(f"   ⚙️ Executing {len(actions)} actions...")
    
    # Note: Ensure your process_video function supports the 'segments_to_keep' structure!
    result = await process_video(input_path, actions, clip_start, clip_duration)
    
    if not result:
        raise HTTPException(status_code=500, detail="Processing failed")

    new_filename = os.path.basename(result["path"])
    return {
        "status": "success",
        "processed_url": f"http://localhost:8000/files/{new_filename}",
        "new_duration": result["duration"],
        "explanation": explanation,
        "actions": actions
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
    
    try:
        # A. Save & Convert Audio
        temp_audio_path = f"temp_storage/temp_voice_{audio.filename}"
        with open(temp_audio_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

        # Convert WebM/Audio to WAV for SpeechRecognition
        audio_segment = AudioSegment.from_file(temp_audio_path)
        wav_path = temp_audio_path + ".wav"
        audio_segment.export(wav_path, format="wav")

        # B. Transcribe to Text
        recognizer = sr.Recognizer()
        with sr.AudioFile(wav_path) as source:
            audio_data = recognizer.record(source)
            try:
                text_command = recognizer.recognize_google(audio_data)
                print(f"🗣️ Transcribed: '{text_command}'")
            except sr.UnknownValueError:
                return {"status": "error", "message": "Could not understand audio"}
            except sr.RequestError:
                return {"status": "error", "message": "Speech service unavailable"}

        # Clean up temp files
        if os.path.exists(temp_audio_path): os.remove(temp_audio_path)
        if os.path.exists(wav_path): os.remove(wav_path)

        # C. Ask AI (Multimodal passing video_filename!)
        ai_plan = await analyze_command(text_command, video_filename=filename)
        
        # Compatibility Adapter
        actions = ai_plan.get("segments_to_keep", ai_plan.get("actions", []))
        explanation = ai_plan.get("explanation", "Processed successfully.")

        # --- D. GENERATE VOICE REPLY ---
        print(f"   🎙️ Generating AI Voice Reply for: '{explanation}'")
        voice_reply_path = generate_voice_reply(explanation)
        voice_reply_url = None
        
        if voice_reply_path:
            voice_filename = os.path.basename(voice_reply_path)
            voice_reply_url = f"http://localhost:8000/files/{voice_filename}"

        # E. Prepare Response
        response_data = {
            "status": "success",
            "transcription": text_command,
            "explanation": explanation,
            "reply_audio_url": voice_reply_url,
            "processed_url": None,
            "new_duration": None,
            "actions": actions
        }

        # F. Run Video Engine (Only if needed)
        if actions:
            input_path = os.path.join(UPLOAD_DIR, filename)
            result = await process_video(input_path, actions, clip_start, clip_duration)
            if result:
                new_filename = os.path.basename(result["path"])
                response_data["processed_url"] = f"http://localhost:8000/files/{new_filename}"
                response_data["new_duration"] = result["duration"]
            else:
                print("   ❌ Video processing failed, but returning chat response.")

        return response_data

    except Exception as e:
        print(f"Voice Error: {e}")
        return {"status": "error", "message": str(e)}

# --- 4. RENDER / EXPORT ENDPOINT ---
@app.post("/render")
async def render_project(
    project_data: str = Form(...) 
):
    print("🎬 Received Render Request...")
    
    try:
        clips = json.loads(project_data)
        if not clips:
             return {"status": "error", "message": "No clips to render"}

        output_path = await stitch_videos(clips)
        
        if not output_path:
            raise HTTPException(status_code=500, detail="Render failed")

        new_filename = os.path.basename(output_path)
        
        return {
            "status": "success",
            "url": f"http://localhost:8000/files/{new_filename}"
        }
    except Exception as e:
        print(f"Render API Error: {e}")
        return {"status": "error", "message": str(e)}

# --- 5. MAGIC ASSETS (SFX) ENDPOINT ---
@app.post("/generate-sfx")
async def generate_sfx_endpoint(
    text: str = Form(...),
    duration: int = Form(None)
):
    print(f"✨ Generating SFX for: '{text}'")
    
    output_path = generate_sound_effect(text, duration)
    
    if not output_path:
        raise HTTPException(status_code=500, detail="SFX Generation Failed")

    filename = os.path.basename(output_path)

    # Get duration for timeline
    try:
        probe = ffmpeg.probe(output_path)
        dur = float(probe['format']['duration'])
    except:
        dur = 3.0 # Fallback

    return {
        "status": "success",
        "url": f"http://localhost:8000/files/{filename}",
        "duration": dur,
        "name": text
    }
# --- 6. SUBTITLE GENERATION ENDPOINT ---
@app.post("/generate-subtitles")
async def generate_subtitles_endpoint(
    filename: str = Form(...)
):
    print(f"📝 Generating Subtitles for: {filename}")
    
    subtitles = generate_subtitles(filename)
    
    if subtitles is None:
        raise HTTPException(status_code=500, detail="Subtitle generation failed")
    
    return {
        "status": "success",
        "subtitles": subtitles
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)