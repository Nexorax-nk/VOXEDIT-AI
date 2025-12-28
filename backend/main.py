# backend/main.py
import os
import shutil
from fastapi import FastAPI, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 1. CORS: Allow your Next.js app (localhost:3000) to talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Create the storage folder if it doesn't exist
UPLOAD_DIR = "temp_storage"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 3. Mount the folder to serve files (This makes the videos playable)
# Access files via: http://localhost:8000/files/filename.mp4
app.mount("/files", StaticFiles(directory=UPLOAD_DIR), name="files")

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """
    Receives video from frontend, saves it, and returns a playable URL.
    """
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    # Save the file in chunks to handle large videos efficiently
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return the URL that the frontend Player will use
    return {
        "filename": file.filename,
        "url": f"http://localhost:8000/files/{file.filename}"
    }

if __name__ == "__main__":
    import uvicorn
    # Run server on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)