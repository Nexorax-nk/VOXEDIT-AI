# backend/services/video_engine.py
import ffmpeg
import os
import uuid
import math

# Define where temporary files go
TEMP_DIR = "temp_storage"
os.makedirs(TEMP_DIR, exist_ok=True)

async def process_video(input_path: str, actions: list, clip_start: float = 0.0, clip_duration: float = None):
    """
    1. Extracts the specific clip from the source based on Timeline inputs (Razor Tool cuts).
    2. Applies AI actions (Speed, Filter, etc.) to that specific clip.
    3. Returns the path AND DURATION to the new processed video.
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    # Generate unique output name
    output_filename = f"processed_{uuid.uuid4()}.mp4"
    output_path = os.path.join(TEMP_DIR, output_filename)

    try:
        # --- STEP 1: PROBE THE FILE ---
        # Robust check for audio streams to prevent crashes
        probe = ffmpeg.probe(input_path)
        video_info = next((s for s in probe['streams'] if s['codec_type'] == 'video'), None)
        audio_info = next((s for s in probe['streams'] if s['codec_type'] == 'audio'), None)

        if not video_info:
            raise ValueError("No video stream found in file.")

        has_audio = audio_info is not None

        # Initialize Streams
        stream = ffmpeg.input(input_path)
        video = stream.video
        audio = stream.audio if has_audio else None

        # --- STEP 2: TIMELINE PRE-TRIM (Critical for Razor Tool) ---
        # If the frontend sends start/duration, we cut THAT piece out first.
        # This effectively "renders" the specific clip you selected on the timeline.
        if clip_start > 0 or (clip_duration is not None and clip_duration > 0):
             print(f"--- Pre-Trimming Source: Start {clip_start}s, Duration {clip_duration}s ---")
             
             # Calculate end time based on duration
             trim_end = clip_start + clip_duration if clip_duration else None
             
             # Apply Trim
             video = video.trim(start=clip_start, end=trim_end).setpts('PTS-STARTPTS')
             if has_audio:
                 audio = audio.filter_('atrim', start=clip_start, end=trim_end).filter_('asetpts', 'PTS-STARTPTS')

        # --- STEP 3: APPLY AI ACTIONS ---
        for action in actions:
            tool = action.get("tool")
            params = action.get("params", {})
            
            print(f"--- Applying Tool: {tool} with {params} ---")

            # === A. TRIM (AI Decision) ===
            # Note: This trims relative to the *already cut* clip, not the original source
            if tool == "trim":
                s = float(params.get("start", 0))
                e = float(params.get("end", 0))
                
                if e > s:
                    video = video.trim(start=s, end=e).setpts('PTS-STARTPTS')
                    if has_audio:
                        audio = audio.filter_('atrim', start=s, end=e).filter_('asetpts', 'PTS-STARTPTS')

            # === B. SPEED (Smart Chaining) ===
            elif tool == "speed":
                factor = float(params.get("factor", 1.0))
                
                # Video: 1/factor * PTS
                video = video.filter('setpts', f'{1/factor}*PTS')
                
                # Audio: Chain filters for extreme speeds
                if has_audio:
                    current_factor = factor
                    # Handle Speed Up (> 2.0)
                    while current_factor > 2.0:
                        audio = audio.filter('atempo', 2.0)
                        current_factor /= 2.0
                    # Handle Slow Down (< 0.5)
                    while current_factor < 0.5:
                        audio = audio.filter('atempo', 0.5)
                        current_factor /= 0.5
                    # Remainder
                    audio = audio.filter('atempo', current_factor)

            # === C. VISUAL FILTERS ===
            elif tool == "filter":
                filter_type = params.get("type", "").lower()
                if filter_type == "grayscale":
                    video = video.filter('hue', s=0)
                elif filter_type == "sepia":
                    video = video.filter('colorchannelmixer', 
                        rr=0.393, rg=0.769, rb=0.189,
                        gr=0.349, gg=0.686, gb=0.168,
                        br=0.272, bg=0.534, bb=0.131
                    )
                elif filter_type == "invert":
                    video = video.filter('negate')
                elif filter_type == "warm":
                    video = video.filter('eq', saturation=1.2, contrast=1.1)

            # === D. ADJUST (Brightness/Contrast) ===
            elif tool == "adjust":
                video = video.filter('eq', 
                    contrast=params.get("contrast", 1.0), 
                    brightness=params.get("brightness", 0.0), 
                    saturation=params.get("saturation", 1.0)
                )

            # === E. AUDIO CLEANUP (Noise Gate) ===
            elif tool == "remove_silence" or tool == "audio_cleanup":
                if has_audio:
                    # Highpass 200Hz + Lowpass 3000Hz + Loudness Normalization
                    audio = audio.filter('highpass', f=200).filter('lowpass', f=3000).filter('loudnorm', I=-16, TP=-1.5, LRA=11)

        # --- STEP 4: BUILD & RUN ---
        output_args = {
            'vcodec': 'libx264',
            'preset': 'fast',   # 'ultrafast' for dev speed, 'medium' for quality
            'movflags': 'faststart', # Optimizes for web player streaming
        }

        if has_audio:
            job = ffmpeg.output(video, audio, output_path, **output_args)
        else:
            job = ffmpeg.output(video, output_path, **output_args)
        
        # Run FFmpeg (capture error logs if fails)
        job.run(overwrite_output=True, capture_stderr=True)
        
        # --- NEW STEP 5: GET NEW DURATION ---
        # We must probe the *output* file to see how long it actually is
        probe = ffmpeg.probe(output_path)
        new_duration = float(probe['format']['duration'])

        print(f"--- Success! Saved to {output_path} (Duration: {new_duration}s) ---")
        
        # Return Dictionary instead of just string
        return {
            "path": output_path,
            "duration": new_duration
        }

    except ffmpeg.Error as e:
        print(f"FFmpeg Error Log: {e.stderr.decode() if e.stderr else 'Unknown Error'}")
        return None
    except Exception as e:
        print(f"General Error: {str(e)}")
        return None

# =========================
# LOCAL TEST RUNNER
# =========================
if __name__ == "__main__":
    import asyncio
    
    # Example: Cut the clip from 10s to 15s (5s duration), THEN apply grayscale
    input_video = os.path.join(TEMP_DIR, "test_video.mp4")
    mock_actions = [{ "tool": "filter", "params": { "type": "grayscale" } }]
    
    async def test():
        if os.path.exists(input_video):
            print(f"Processing {input_video}...")
            # Testing with clip_start=10, clip_duration=5
            result = await process_video(input_video, mock_actions, clip_start=10.0, clip_duration=5.0)
            print(f"Result: {result}")
        else:
            print(f"File {input_video} not found.")

    asyncio.run(test())