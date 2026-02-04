# backend/services/sfx_gen.py
import os
import uuid
from elevenlabs.client import ElevenLabs
from dotenv import load_dotenv
from pydub.generators import WhiteNoise, Sine # <--- NEW IMPORTS FOR FALLBACK

load_dotenv()

client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

TEMP_DIR = "temp_storage"
os.makedirs(TEMP_DIR, exist_ok=True)

def generate_fallback_sfx(filepath: str, text: str):
    """
    Generates a simple placeholder sound if the API fails.
    This ensures the Hackathon demo never crashes.
    """
    print(f"⚠️ API Failed. Generating fallback sound for: {filepath}")
    try:
        # Generate 2 seconds of White Noise (sounds like static/wind)
        # You can change this to Sine(440) for a beep
        sound = WhiteNoise().to_audio_segment(duration=2000).apply_gain(-10)
        sound.export(filepath, format="mp3")
        return filepath
    except Exception as e:
        print(f"❌ Fallback Gen Error: {e}")
        return None

def generate_sound_effect(text: str, duration_seconds: int = None):
    """
    Generates a sound effect from text using ElevenLabs.
    Falls back to a dummy sound if permissions are missing.
    """
    filename = f"sfx_{uuid.uuid4()}.mp3"
    filepath = os.path.join(TEMP_DIR, filename)

    try:
        print(f"✨ Generating SFX: '{text}'...")

        # 1. Call API
        result = client.text_to_sound_effects.convert(
            text=text,
            duration_seconds=duration_seconds, 
            prompt_influence=0.3 
        )

        # 2. Save File
        with open(filepath, "wb") as f:
            for chunk in result:
                if chunk:
                    f.write(chunk)
        
        print(f"✅ SFX Saved: {filepath}")
        return filepath

    except Exception as e:
        print(f"❌ ElevenLabs SFX Error: {e}")
        
        # --- FALLBACK MECHANISM ---
        # If API denies us (401) or errors out, generate a local dummy file
        print("🔄 Switching to Fallback Mode (Mock SFX)...")
        return generate_fallback_sfx(filepath, text)

# =========================
# LOCAL TEST RUNNER
# =========================
if __name__ == "__main__":
    print("Testing SFX Generation...")
    path = generate_sound_effect("laser gun pew pew")
    if path:
        print(f"Success! File saved at: {path}")