import webview
import os
import base64
import datetime
from io import BytesIO
from pathlib import Path
import json
from dotenv import load_dotenv

from warnings import filterwarnings
# Had to add this one, because of httpx deprecation warning in httpx (URL.raw derprecation).
# Remind me to remove this once openai will update their httpx dependency...
filterwarnings("ignore", category=UserWarning, message=".*URL.raw is deprecated.*")
from openai import OpenAI

class AudioAPI:
    def __init__(self):
        self.recordings_dir = "recordings"
        os.makedirs(self.recordings_dir, exist_ok=True)

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
        """Save base64 encoded WebM audio data"""
        try:
            audio_data = base64.b64decode(audio_base64)
            audio_file = BytesIO(audio_data)
            audio_file.name = f"recording_{datetime.datetime.now().strftime("%Y%m%d_%H%M%S")}.webm"

            transcription = self.client.audio.transcriptions.create(
                model=self.model,
                file=audio_file,
                prompt=self.prompt
            )

            print(transcription.text)
            return transcription.text

        except Exception as e:
            print(f"Error saving audio: {str(e)}")
            return f"Error: {str(e)}"

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
        height=140,
        resizable=False,
    )

    webview.start(
        gui='qt',
        icon="icon.ico",
        debug=os.getenv("ENABLE_DEBUG", "0") == "1"
    )


if __name__ == '__main__':
    main()