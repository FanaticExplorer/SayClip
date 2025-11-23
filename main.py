import webview
import os
import base64
import datetime

class AudioAPI:
    def __init__(self):
        self.recordings_dir = "recordings"
        os.makedirs(self.recordings_dir, exist_ok=True)

    def process_audio(self, audio_base64):
        """Save base64 encoded WebM audio data"""
        try:
            audio_data = base64.b64decode(audio_base64)
            # Generate timestamp-based filename (WebM format now)
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"recording_{timestamp}.webm"
            filepath = os.path.join(self.recordings_dir, filename)

            with open(filepath, 'wb') as f:
                f.write(audio_data)

            print(f"Saved audio file as .webm format: {filename}")
            return filename

        except Exception as e:
            print(f"Error saving audio: {str(e)}")
            return f"Error: {str(e)}"

    @staticmethod
    def close_window():
        """Close the application window"""
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