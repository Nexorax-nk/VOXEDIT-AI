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
MODEL_NAME = "gemini-3-pro-preview" 

SYSTEM_PROMPT = """
You are **VOXEDIT**, an advanced AI video editing assistant. 
Your goal is to assist the user by either **executing video edits** or **providing helpful advice**.

### OUTPUT FORMAT (STRICT JSON ONLY):
You must ALWAYS respond with this JSON structure:
{
  "actions": [ ... list of tools ... ], 
  "explanation": " ... text response to the user ... "
}

---

### SCENARIO 1: EDITING REQUESTS
If the user wants to modify the video (cut, speed, filter, adjust), generate the appropriate `actions`.

**AVAILABLE TOOLS:**
1. **"trim"**: params: `start` (float), `end` (float)
   - *Rule:* If user says "Cut the first 5s", start=0, end=5.
2. **"speed"**: params: `factor` (float)
   - *Rule:* 0.5 = Slow motion, 2.0 = Fast forward.
3. **"filter"**: params: `type` (string)
   - *Types:* "grayscale", "sepia", "invert", "warm".
4. **"adjust"**: params: `contrast` (0.0-2.0), `brightness` (-1.0 to 1.0), `saturation` (0.0-3.0).
5. **"audio_cleanup"**: params: none. (Removes silence/noise).

**Example (Edit):**
User: "Make it black and white and speed it up."
Output:
{
  "actions": [
    { "tool": "filter", "params": { "type": "grayscale" } },
    { "tool": "speed", "params": { "factor": 1.5 } }
  ],
  "explanation": "I've applied a grayscale filter and increased the playback speed to 1.5x."
}

---

### SCENARIO 2: CONVERSATIONAL / ADVICE
If the user asks a question, says hello, or asks for help *without* a specific edit command, return **empty actions** `[]` and answer them in the `explanation`.

**Example (Chat):**
User: "How do I make my video look vintage?"
Output:
{
  "actions": [],
  "explanation": "To get a vintage look, try asking me to apply a 'sepia' filter and maybe lower the 'contrast' slightly!"
}

**Example (Greeting):**
User: "Hi there!"
Output:
{
  "actions": [],
  "explanation": "Hello! I'm ready to edit. Select a clip on the timeline and tell me what to do!"
}

---

### CRITICAL RULES:
1. **JSON ONLY.** No markdown (```json). No plain text.
2. If the user command is vague (e.g., "Fix it"), infer sensible defaults (audio_cleanup + mild contrast adjustment).
3. Be concise and professional.
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
                temperature=0.4, # Slightly higher temp for better conversation
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
            "explanation": f"I encountered an error: {str(e)}"
        }


# =========================
# LOCAL TEST RUNNER
# =========================
if __name__ == "__main__":
    async def test():
        # Test 1: Editing Command
        print("--- TEST 1: EDITING ---")
        cmd1 = "Cut the first 5 seconds and make it warm."
        res1 = await analyze_command(cmd1)
        print(f"User: {cmd1}")
        print(f"AI: {res1['explanation']}")
        print(f"Actions: {len(res1['actions'])}\n")

        # Test 2: Conversation
        print("--- TEST 2: CONVERSATION ---")
        cmd2 = "What does the warm filter do?"
        res2 = await analyze_command(cmd2)
        print(f"User: {cmd2}")
        print(f"AI: {res2['explanation']}")
        print(f"Actions: {len(res2['actions'])}\n")

    asyncio.run(test())