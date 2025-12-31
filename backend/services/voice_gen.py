# backend/services/voice_gen.py
import os
import uuid
from elevenlabs.client import ElevenLabs
from dotenv import load_dotenv

# Load environment variables (API Key)
load_dotenv()

# Initialize the ElevenLabs Client
client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

# Define where temporary audio files go
TEMP_DIR = "temp_storage"
os.makedirs(TEMP_DIR, exist_ok=True)

def generate_voice_reply(text: str):
    """
    Generates a spoken audio response from text using ElevenLabs.
    Uses the 'turbo_v2' model for low latency (perfect for chat).
    """
    if not text:
        return None

    try:
        print(f"🎙️ Generating Voice Reply for: '{text[:30]}...'")

        # --- FIX: USE NEW SDK METHOD ---
        # The 'generate' method was removed in v1.0. 
        # We now use text_to_speech.convert() which returns a generator (stream) of bytes.
        audio_stream = client.text_to_speech.convert(
            text=text,
            voice_id="JBFqnCBsd6RMkjVDRZzb", # Voice ID for 'Adam'
            model_id="eleven_turbo_v2",      # Optimized for latency
            output_format="mp3_44100_128"    # Standard MP3 format
        )

        # 2. Save File Locally
        filename = f"reply_{uuid.uuid4()}.mp3"
        filepath = os.path.join(TEMP_DIR, filename)
        
        # We must consume the stream and write bytes to the file
        with open(filepath, "wb") as f:
            for chunk in audio_stream:
                if chunk:
                    f.write(chunk)
        
        print(f"✅ Voice generated: {filepath}")
        return filepath

    except Exception as e:
        print(f"❌ ElevenLabs Error: {e}")
        return None

# =========================
# LOCAL TEST RUNNER
# =========================
if __name__ == "__main__":
    # Quick test to verify your API Key works
    print("Testing ElevenLabs generation...")
    path = generate_voice_reply("Hello! I am your AI video editor.")
    if path:
        print(f"Success! File saved at: {path}")
    else:
        print("Failed to generate voice.")