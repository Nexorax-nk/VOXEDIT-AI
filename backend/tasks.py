import asyncio
import os
from celery_app import celery_app
from services.pubsub import publish_update
from services.ai_agent import analyze_command
from services.video_engine import process_video, stitch_videos
from services.voice_gen import generate_voice_reply

def run_async(coro):
    """Utility to run async functions synchronously in Celery worker."""
    return asyncio.run(coro)

@celery_app.task(bind=True)
def task_analyze_and_edit(self, command: str, filename: str, clip_start: float, clip_duration: float):
    task_id = self.request.id
    UPLOAD_DIR = "temp_storage"
    input_path = os.path.join(UPLOAD_DIR, filename)
    
    publish_update(task_id, {"type": "log", "level": "analysis", "message": "Gemini 3.0 Pro reasoning..."})
    
    # Run async function
    ai_plan = run_async(analyze_command(command, video_filename=filename))
    
    actions = ai_plan.get("segments_to_keep", ai_plan.get("actions", []))
    explanation = ai_plan.get("explanation", "Processed successfully.")
    
    if actions:
        publish_update(task_id, {"type": "log", "level": "info", "message": f"Generated {len(actions)} edit actions."})
    else:
        publish_update(task_id, {"type": "log", "level": "info", "message": "Conversational response generated."})
        return {
            "status": "success",
            "original_file": filename,
            "processed_url": None,
            "new_duration": None,
            "explanation": explanation,
            "actions": []
        }
        
    publish_update(task_id, {"type": "log", "level": "analysis", "message": "Rendering video effects (FFmpeg)..."})
    
    # Run async FFmpeg process
    result = run_async(process_video(input_path, actions, clip_start, clip_duration))
    
    if not result:
        publish_update(task_id, {"type": "log", "level": "error", "message": "Processing failed."})
        raise Exception("Processing failed")
        
    new_filename = os.path.basename(result["path"])
    
    publish_update(task_id, {"type": "log", "level": "success", "message": "Video rendering complete."})
    publish_update(task_id, {"type": "stats", "tokens": 145, "latency": 850})
    
    processed_url = f"http://localhost:8000/files/{new_filename}"
    
    # Final result event so frontend knows it's done
    publish_update(task_id, {
        "type": "result", 
        "task_id": task_id, 
        "action": "edit",
        "processed_url": processed_url,
        "new_duration": result["duration"],
        "explanation": explanation,
        "actions": actions
    })
    
    return {
        "status": "success",
        "processed_url": processed_url,
        "new_duration": result["duration"],
        "explanation": explanation,
        "actions": actions
    }

@celery_app.task(bind=True)
def task_voice_command(self, text_command: str, filename: str, clip_start: float, clip_duration: float):
    task_id = self.request.id
    UPLOAD_DIR = "temp_storage"
    
    publish_update(task_id, {"type": "log", "level": "analysis", "message": "Analyzing multimodal context (Gemini 3.0 Pro)..."})
    ai_plan = run_async(analyze_command(text_command, video_filename=filename))
    actions = ai_plan.get("segments_to_keep", ai_plan.get("actions", []))
    explanation = ai_plan.get("explanation", "Processed successfully.")

    publish_update(task_id, {"type": "log", "level": "info", "message": "Synthesizing voice response..."})
    voice_reply_path = generate_voice_reply(explanation)
    voice_reply_url = None
    if voice_reply_path:
        voice_filename = os.path.basename(voice_reply_path)
        voice_reply_url = f"http://localhost:8000/files/{voice_filename}"

    response_data = {
        "status": "success",
        "transcription": text_command,
        "explanation": explanation,
        "reply_audio_url": voice_reply_url,
        "processed_url": None,
        "new_duration": None,
        "actions": actions
    }

    if actions:
        input_path = os.path.join(UPLOAD_DIR, filename)
        publish_update(task_id, {"type": "log", "level": "analysis", "message": "Executing video edits..."})
        result = run_async(process_video(input_path, actions, clip_start, clip_duration))
        if result:
            new_filename = os.path.basename(result["path"])
            response_data["processed_url"] = f"http://localhost:8000/files/{new_filename}"
            response_data["new_duration"] = result["duration"]
            publish_update(task_id, {"type": "log", "level": "success", "message": "Actions applied successfully."})

    # Final result event
    publish_update(task_id, {
        "type": "result", 
        "task_id": task_id, 
        "action": "voice",
        "data": response_data
    })
    
    return response_data

@celery_app.task(bind=True)
def task_render_project(self, clips: list):
    task_id = self.request.id
    
    publish_update(task_id, {"type": "log", "level": "info", "message": "Starting final project render..."})
    
    if not clips:
        publish_update(task_id, {"type": "log", "level": "error", "message": "No clips to render"})
        return {"status": "error", "message": "No clips to render"}
        
    output_path = run_async(stitch_videos(clips))
    if not output_path:
        publish_update(task_id, {"type": "log", "level": "error", "message": "Render failed"})
        raise Exception("Render failed")
        
    new_filename = os.path.basename(output_path)
    publish_update(task_id, {"type": "log", "level": "success", "message": "Render Complete."})
    
    processed_url = f"http://localhost:8000/files/{new_filename}"
    
    # Final result event
    publish_update(task_id, {
        "type": "result", 
        "task_id": task_id, 
        "action": "render",
        "url": processed_url
    })
    
    return {"status": "success", "url": processed_url}
