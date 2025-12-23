import webview
import os
import base64
import datetime
from io import BytesIO
from pathlib import Path
import json
from dotenv import load_dotenv
from copykitten import copy as ck_copy

from warnings import filterwarnings
# Had to add this one, because of httpx deprecation warning in httpx (URL.raw derprecation).
# Remind me to remove this once openai will update their httpx dependency...
filterwarnings("ignore", category=UserWarning, message=".*URL.raw is deprecated.*")
from openai import OpenAI

class AudioAPI:
    def __init__(self):
        # Technically we don't need this anymore since we're using in-memory files,
        # but man, who knows if I need to restore this feature...
        # Let it beeeeeeeeeeeee :)

        # self.recordings_dir = "recordings"
        # os.makedirs(self.recordings_dir, exist_ok=True)

        load_dotenv()
        self.config = self.load_config()

        self.model = self.config["openai"]["model"]
        self.prompt = self.config["openai"].get("prompt", "")

        self.client = OpenAI()

    @staticmethod
    def load_config():
        config_path = Path(__file__).parent / "config.json"
        try:
            with open(config_path) as f:
                return json.load(f)
        except FileNotFoundError:
            print("Warning: config.json not found, using defaults")
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

    @staticmethod
    def close_window():
        """Close the application window"""
        # Probably doesn't work?
        # noinspection PyTypeHints
        webview.windows[0].destroy()


def main():
    api = AudioAPI()

    frontend_path = os.path.join(os.path.dirname(__file__), "frontend", "index.html")
    if not os.path.exists(frontend_path):
        print(f"Frontend file not found: {frontend_path}")
        return

    webview.create_window(
        'SayClip',
        frontend_path,
        js_api=api,
        width=500,
        height=50,
        resizable=False,
    )

    webview.start(
        gui='qt',
        icon="icon.ico",
        debug=os.getenv("ENABLE_DEBUG", "0") == "1"
    )


if __name__ == '__main__':
    main()