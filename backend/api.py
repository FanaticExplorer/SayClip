import base64
import datetime
import json
from io import BytesIO
from pathlib import Path
from dotenv import load_dotenv
from copykitten import copy as ck_copy
from warnings import filterwarnings

# Had to add this one, because of httpx deprecation warning in httpx (URL.raw derprecation).
# Remind me to remove this once openai will update their httpx dependency...
filterwarnings("ignore", category=UserWarning, message=".*URL.raw is deprecated.*")
from openai import OpenAI

class AudioAPI:
    def __init__(self):
        load_dotenv()
        self.config = self.load_config()

        self.model = self.config.get("openai", {}).get("model", "whisper-1")
        self.prompt = self.config.get("openai", {}).get("prompt", "")

        self.client = OpenAI()
        self.window = None

    @staticmethod
    def load_config():
        #config.json is in the root directory, which is one level up from backend/api.py
        config_path = Path(__file__).parent.parent / "config.json"
        try:
            with open(config_path) as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Warning: config.json not found at {config_path}, using defaults")
            return {}

    def process_audio(self, audio_base64):
        """Transcribe base64 encoded WebM audio data"""
        try:
            audio_data = base64.b64decode(audio_base64)
            audio_file = BytesIO(audio_data)
            audio_file.name = f"recording_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.webm"

            transcription = self.client.audio.transcriptions.create(
                model=self.model,
                file=audio_file,
                prompt=self.prompt
            )

            text = transcription.text.strip()
            print(text)
            copied = False
            try:
                ck_copy(text)
                copied = True
            except Exception as copy_error:
                print(f"Clipboard copy failed: {copy_error}")
            return {
                "success": True,
                "stage": "done",
                "message": "Transcription complete",
                "text": text,
                "copied": copied
            }

        except Exception as e:
            error_message = str(e)
            print(f"Error saving audio: {error_message}")
            return {
                "success": False,
                "stage": "error",
                "message": error_message,
                "copied": False
            }

    def close_window(self):
        """Close the application window"""
        if self.window:
            self.window.destroy()
