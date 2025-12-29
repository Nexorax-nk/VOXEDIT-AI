# backend/services/ai_agent.py
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(override=True)
api_key = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=api_key)

# CHANGE THIS LINE
MODEL_NAME = 'gemini-2.0-flash' 
# OR use 'gemini-2.0-flash-exp' if you want the experimental features

model = genai.GenerativeModel(MODEL_NAME) 

SYSTEM_PROMPT = """
You are the intelligent video editing engine for VOXEDIT AI. 
Your goal is to parse natural language user commands into a structured JSON execution plan.

AVAILABLE TOOLS:
1. "trim": Cut the video. Params: "start" (float), "end" (float)
2. "speed": Change playback speed. Params: "factor" (float)
3. "filter": Apply a visual filter. Params: "type" (string: "grayscale", "sepia", "invert")
4. "remove_silence": Remove silent parts. Params: "threshold" (int)

OUTPUT FORMAT (JSON ONLY, NO MARKDOWN):
{
  "actions": [
    { "tool": "trim", "params": { "start": 0, "end": 10 } }
  ],
  "explanation": "I trimmed the first 10 seconds."
}
"""

async def analyze_command(user_text: str):
    try:
        response = model.generate_content(
            f"{SYSTEM_PROMPT}\n\nUSER COMMAND: {user_text}"
        )
        
        # Clean markdown if present
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        
        return json.loads(clean_text)

    except Exception as e:
        return {
            "actions": [],
            "explanation": f"AI Error: {str(e)}" 
        }