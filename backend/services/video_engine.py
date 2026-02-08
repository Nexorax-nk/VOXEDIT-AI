# backend/services/video_engine.py
import ffmpeg
import os
import uuid
import subprocess
import json

# Define where temporary files go
TEMP_DIR = "temp_storage"
os.makedirs(TEMP_DIR, exist_ok=True)

# --- GLOBAL CONFIG ---
TARGET_WIDTH = 1920
TARGET_HEIGHT = 1080
TARGET_ASPECT = "16/9"

# ==========================================
# 🚀 HARDWARE ACCELERATION CHECKER
# ==========================================
def get_hardware_encoder():
    """
    Detects available hardware encoders (NVIDIA NVENC, Intel QSV).
    Returns the best available codec and preset.
    """
    try:
        # Check for NVIDIA NVENC
        result = subprocess.run(['ffmpeg', '-encoders'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if 'h264_nvenc' in result.stdout:
            print("🚀 Hardware Acceleration: NVIDIA NVENC Detected")
            return 'h264_nvenc', 'p4' # p1=fastest, p7=best quality. p4 is balanced.
        
        # Check for Intel QSV (QuickSync)
        if 'h264_qsv' in result.stdout:
            print("🚀 Hardware Acceleration: Intel QSV Detected")
            return 'h264_qsv', 'fast'
            
        # Check for Mac Silicon (VideoToolbox) - Optional, adds compatibility
        if 'h264_videotoolbox' in result.stdout:
             print("🚀 Hardware Acceleration: Apple VideoToolbox Detected")
             return 'h264_videotoolbox', 'default'

    except Exception as e:
        print(f"⚠️ Encoder check failed: {e}")

    print("🐢 Hardware Acceleration: None (Using CPU libx264)")
    return 'libx264', 'fast' # Fallback to CPU

# ==========================================
# 🧠 SMART STITCHING LOGIC (Upgraded)
# ==========================================
async def execute_smart_stitch(input_path, output_path, segments, preset='fast'):
    """
    1. Trims segments.
    2. SCALES all segments to 1080p (prevents concat errors with mixed footage).
    3. Concatenates in one pass.
    """
    print(f"--- ✂️ Executing Smart Stitch on {len(segments)} segments ---")
    
    # Get Best Codec
    video_codec, hw_preset = get_hardware_encoder()
    # Use 'ultrafast' for CPU if doing preview/timeline work, otherwise use HW preset
    final_preset = 'ultrafast' if video_codec == 'libx264' and preset == 'ultrafast' else (hw_preset if video_codec != 'libx264' else preset)

    try:
        probe = ffmpeg.probe(input_path)
        has_audio = any(s['codec_type'] == 'audio' for s in probe['streams'])
        
        inp = ffmpeg.input(input_path)
        video_streams = []
        audio_streams = []

        for i, seg in enumerate(segments):
            start = float(seg['start'])
            end = float(seg['end'])
            
            # --- VIDEO CHAIN: Trim -> Scale -> Pad -> Setsar ---
            # This ensures every segment is exactly 1920x1080 before stitching
            v = (
                inp.video
                .trim(start=start, end=end)
                .setpts('PTS-STARTPTS')
                .filter('scale', w=TARGET_WIDTH, h=TARGET_HEIGHT, force_original_aspect_ratio="decrease")
                .filter('pad', w=TARGET_WIDTH, h=TARGET_HEIGHT, x='(ow-iw)/2', y='(oh-ih)/2', color='black')
                .filter('setsar', 1) # Force square pixels to avoid aspect ratio mismatches
            )
            video_streams.append(v)
            
            # --- AUDIO CHAIN ---
            if has_audio:
                a = (
                    inp.audio
                    .filter_('atrim', start=start, end=end)
                    .filter_('asetpts', 'PTS-STARTPTS')
                )
                audio_streams.append(a)

        # Concatenate
        # Interleave streams: [v0, a0, v1, a1, ...]
        if has_audio:
            concat_inputs = []
            for v, a in zip(video_streams, audio_streams):
                concat_inputs.extend([v, a])
                
            joined = ffmpeg.concat(*concat_inputs, v=1, a=1).node
            out = ffmpeg.output(joined[0], joined[1], output_path, vcodec=video_codec, preset=final_preset, acodec='aac')
        else:
            joined = ffmpeg.concat(*video_streams, v=1, a=0).node
            out = ffmpeg.output(joined[0], output_path, vcodec=video_codec, preset=final_preset)

        # Run
        out.run(overwrite_output=True, quiet=True)
        return True

    except ffmpeg.Error as e:
        print(f"❌ FFmpeg Error Log: {e.stderr.decode() if e.stderr else 'Unknown'}")
        return False
    except Exception as e:
        print(f"❌ Smart Stitch Error: {e}")
        return False

# ==========================================
# ⚙️ MAIN PROCESSOR
# ==========================================
async def process_video(input_path: str, actions: list, clip_start: float = 0.0, clip_duration: float = None):
    """
    Handles AI "Keep Lists" and Legacy Tools with Hardware Acceleration.
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    output_filename = f"processed_{uuid.uuid4()}.mp4"
    output_path = os.path.join(TEMP_DIR, output_filename)

    try:
        # Detect Mode
        is_smart_stitch = len(actions) > 0 and "start" in actions[0] and "tool" not in actions[0]

        if is_smart_stitch:
            # Smart Stitch uses 'ultrafast' for responsiveness during editing
            success = await execute_smart_stitch(input_path, output_path, actions, preset='ultrafast')
            if not success:
                raise ValueError("Smart Stitching failed")
        
        else:
            # Legacy Mode
            probe = ffmpeg.probe(input_path)
            has_audio = any(s['codec_type'] == 'audio' for s in probe['streams'])
            
            stream = ffmpeg.input(input_path)
            video = stream.video
            audio = stream.audio if has_audio else None

            # 1. Timeline Pre-Trim
            if clip_start > 0 or (clip_duration is not None and clip_duration > 0):
                print(f"--- Pre-Trimming: {clip_start}s, Dur: {clip_duration}s ---")
                trim_end = clip_start + clip_duration if clip_duration else None
                video = video.trim(start=clip_start, end=trim_end).setpts('PTS-STARTPTS')
                if has_audio:
                    audio = audio.filter_('atrim', start=clip_start, end=trim_end).filter_('asetpts', 'PTS-STARTPTS')

            # 2. Apply Actions
            for action in actions:
                tool = action.get("tool")
                params = action.get("params", {})
                print(f"--- Tool: {tool} {params} ---")

                if tool == "speed":
                    factor = float(params.get("factor", 1.0))
                    video = video.filter('setpts', f'{1/factor}*PTS')
                    if has_audio:
                        audio = audio.filter('atempo', factor)
                
                elif tool == "filter":
                    ftype = params.get("type", "").lower()
                    if ftype == "grayscale": video = video.filter('hue', s=0)
                    elif ftype == "sepia": video = video.filter('colorchannelmixer', rr=0.393, rg=0.769, rb=0.189, gr=0.349, gg=0.686, gb=0.168, br=0.272, bg=0.534, bb=0.131)
                    elif ftype == "warm": video = video.filter('eq', saturation=1.3, contrast=1.1, gamma_r=1.1)

            # 3. Render with HW Accel
            video_codec, hw_preset = get_hardware_encoder()
            
            args = {
                'vcodec': video_codec,
                'preset': 'ultrafast' if video_codec == 'libx264' else hw_preset,
                'movflags': 'faststart'
            }
            
            if has_audio:
                job = ffmpeg.output(video, audio, output_path, **args)
            else:
                job = ffmpeg.output(video, output_path, **args)
            
            job.run(overwrite_output=True, quiet=True)

        # --- FINAL ---
        if os.path.exists(output_path):
            probe = ffmpeg.probe(output_path)
            new_dur = float(probe['format']['duration'])
            print(f"--- ✅ Success! Duration: {new_dur}s ---")
            return {"path": output_path, "duration": new_dur}
        else:
            return None

    except Exception as e:
        print(f"Processing Error: {e}")
        return None

# ==========================================
# 🎬 STITCH VIDEOS (EXPORT PROJECT)
# ==========================================
async def stitch_videos(clips: list):
    """
    Concatenates mixed files. Uses a re-encode "Scale & Pad" strategy
    to ensure 1080p uniformity, preventing 'Concat Error'.
    """
    output_filename = f"final_render_{uuid.uuid4()}.mp4"
    output_path = os.path.join(TEMP_DIR, output_filename)
    
    # Get HW Accel
    video_codec, hw_preset = get_hardware_encoder()

    try:
        inputs = []
        for clip in clips:
            p = os.path.join(TEMP_DIR, clip["filename"])
            if os.path.exists(p):
                inputs.append(ffmpeg.input(p))
        
        if not inputs: return None

        print(f"🧵 Stitching {len(inputs)} clips with {video_codec}...")

        # We construct a Filter Complex to Scale all inputs to 1080p
        # This is safer than the 'unsafe' concat demuxer method
        video_streams = []
        audio_streams = []
        
        has_audio_any = False

        for inp in inputs:
            # Scale & Pad Video
            v = (
                inp.video
                .filter('scale', w=TARGET_WIDTH, h=TARGET_HEIGHT, force_original_aspect_ratio="decrease")
                .filter('pad', w=TARGET_WIDTH, h=TARGET_HEIGHT, x='(ow-iw)/2', y='(oh-ih)/2', color='black')
                .filter('setsar', 1)
            )
            video_streams.append(v)
            
            # Use audio if present, otherwise generate silence? 
            # For simplicity, we assume clips have audio. If not, this can be brittle.
            # Robust method: Check clip probing. Assuming valid audio for now.
            audio_streams.append(inp.audio)
            has_audio_any = True

        # Concat
        if has_audio_any:
            joined = ffmpeg.concat(*[s for pair in zip(video_streams, audio_streams) for s in pair], v=1, a=1).node
            out = ffmpeg.output(joined[0], joined[1], output_path, vcodec=video_codec, preset=hw_preset, acodec='aac')
        else:
            joined = ffmpeg.concat(*video_streams, v=1, a=0).node
            out = ffmpeg.output(joined[0], output_path, vcodec=video_codec, preset=hw_preset)

        out.run(overwrite_output=True, quiet=True)
        return output_path

    except Exception as e:
        print(f"Render Error: {e}")
        return None