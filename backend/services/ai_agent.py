# backend/services/ai_agent.py

import os
import json
import asyncio
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load env variables
load_dotenv(override=True)

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY not found in .env")

# Initialize Gemini client
client = genai.Client(api_key=API_KEY)

# Using the fastest stable model
MODEL_NAME = "gemini-2.0-flash" 

SYSTEM_PROMPT = """
You are the advanced video editing intelligence for VOXEDIT AI.
Your mission is to translate user intent into a precise JSON execution plan for FFmpeg.

### AVAILABLE TOOLS & PARAMETERS:

1. "trim"
   - Use when user wants to shorten the video.
   - params: "start" (float, seconds), "end" (float, seconds)
   - Note: If user says "Cut the first 5 seconds", start=0, end=5. If "Cut FROM 10 to 20", start=10, end=20.

2. "speed"
   - Use for slow motion or fast forward.
   - params: "factor" (float)
   - Examples: "2x speed" -> factor: 2.0. "Slow motion" -> factor: 0.5.

3. "filter"
   - Apply stylized looks.
   - params: "type" (string)
   - Options: "grayscale", "sepia", "invert", "warm"

4. "adjust"  <-- NEW!
   - Enhance video quality.
   - params: 
     - "contrast" (float, default 1.0, range 0.0-2.0)
     - "brightness" (float, default 0.0, range -1.0 to 1.0)
     - "saturation" (float, default 1.0, range 0.0-3.0)
   - Example: "Make it brighter" -> brightness: 0.2. "Boost colors" -> saturation: 1.5.

5. "audio_cleanup"
   - Use when user says "Remove silence", "Clean audio", or "Fix sound".
   - params: none (handled automatically by engine)

### RULES:
- If the user command is vague (e.g., "Fix the video"), infer sensible defaults (e.g., audio_cleanup + adjust contrast).
- Respond with VALID JSON ONLY. Do not include markdown formatting (like ```json).
- The "explanation" field should be short, friendly, and confirm exactly what actions are being taken.

### EXAMPLE OUTPUT:
{
  "actions": [
    { "tool": "trim", "params": { "start": 0, "end": 15.5 } },
    { "tool": "adjust", "params": { "brightness": 0.1, "saturation": 1.2 } }
  ],
  "explanation": "I've trimmed the first 15.5 seconds and boosted the brightness and color."
}
"""

# =========================
# CORE AI FUNCTION
# =========================
async def analyze_command(user_text: str):
    try:
        # Construct the full prompt
        full_prompt = f"{SYSTEM_PROMPT}\n\nUSER COMMAND: {user_text}"

        # Call Gemini 2.0
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=full_prompt,
            config=types.GenerateContentConfig(
                temperature=0.3, # Low temp = more deterministic/accurate commands
            )
        )

        if not response or not response.text:
            raise RuntimeError("Empty AI response received.")

        # Clean response string (remove potential Markdown wrappers)
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        
        cleaned_json_text = raw_text.strip()

        # Parse JSON
        plan = json.loads(cleaned_json_text)
        return plan

    except json.JSONDecodeError:
        print(f"JSON Error. Raw text was: {response.text if 'response' in locals() else 'N/A'}")
        return {
            "actions": [],
            "explanation": "I understood your request, but I had trouble formatting the editing plan. Please try again."
        }

    except Exception as e:
        print(f"AI Agent Error: {str(e)}")
        return {
            "actions": [],
            "explanation": "I encountered an error while analyzing your command. Please check the backend logs."
        }


# =========================
# LOCAL TEST RUNNER
# =========================
if __name__ == "__main__":
    async def test():
        # Test a complex command to see new capabilities
        command = "Cut the first 5 seconds, make it pop with more color, and clean up the background noise."
        print(f"Testing Command: '{command}'...\n")
        
        result = await analyze_command(command)
        print(json.dumps(result, indent=2))

    asyncio.run(test())