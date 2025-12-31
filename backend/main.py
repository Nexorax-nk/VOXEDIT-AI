# backend/main.py
import os
import shutil
import speech_recognition as sr
from pydub import AudioSegment
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import io

# Import custom services
from services.ai_agent import analyze_command
from services.video_engine import process_video

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "temp_storage"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/files", StaticFiles(directory=UPLOAD_DIR), name="files")

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"filename": file.filename, "url": f"http://localhost:8000/files/{file.filename}"}

# --- TEXT COMMAND ENDPOINT ---
@app.post("/edit")
async def edit_video(
    command: str = Form(...), 
    filename: str = Form(...),
    clip_start: float = Form(0.0),
    clip_duration: float = Form(None)
):
    print(f"🎬 EDIT REQUEST: '{command}'")
    input_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail="File not found")

    # 1. Ask AI
    ai_plan = await analyze_command(command)
    actions = ai_plan.get("actions", [])
    explanation = ai_plan.get("explanation", "Processed successfully.")
    
    # --- LOGIC UPDATE: HANDLE CONVERSATION ---
    if not actions:
        print("   💬 Conversational response (no edits).")
        return {
            "status": "success",
            "original_file": filename,
            "processed_url": None, # Signal to frontend that no file changed
            "new_duration": None,
            "explanation": explanation, # The AI's chat answer
            "actions": []
        }

    # 2. Run Engine (Only if there are actions)
    print("   ⚙️ executing actions...")
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

# --- 🎤 VOICE COMMAND ENDPOINT ---
@app.post("/voice-command")
async def voice_command(
    audio: UploadFile = File(...),
    filename: str = Form(...),
    clip_start: float = Form(0.0),
    clip_duration: float = Form(None)
):
    print("🎤 Receiving Voice Command...")
    
    try:
        # 1. Save temporary audio file
        temp_audio_path = f"temp_storage/temp_voice_{audio.filename}"
        with open(temp_audio_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

        # 2. Convert to WAV
        audio_segment = AudioSegment.from_file(temp_audio_path)
        wav_path = temp_audio_path + ".wav"
        audio_segment.export(wav_path, format="wav")

        # 3. Transcribe
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

        # Clean up
        if os.path.exists(temp_audio_path): os.remove(temp_audio_path)
        if os.path.exists(wav_path): os.remove(wav_path)

        # 4. Ask AI
        ai_plan = await analyze_command(text_command)
        actions = ai_plan.get("actions", [])
        explanation = ai_plan.get("explanation", "Processed successfully.")

        # --- LOGIC UPDATE: HANDLE CONVERSATION ---
        if not actions:
             print("   💬 Conversational response (no edits).")
             return {
                "status": "success",
                "transcription": text_command,
                "processed_url": None, # No video update
                "new_duration": None,
                "explanation": explanation,
                "actions": []
            }

        # 5. Run Engine
        input_path = os.path.join(UPLOAD_DIR, filename)
        result = await process_video(input_path, actions, clip_start, clip_duration)
        if not result:
            raise HTTPException(status_code=500, detail="Video processing failed")

        new_filename = os.path.basename(result["path"])
        
        return {
            "status": "success",
            "transcription": text_command,
            "processed_url": f"http://localhost:8000/files/{new_filename}",
            "new_duration": result["duration"],
            "explanation": explanation
        }

    except Exception as e:
        print(f"Voice Error: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)