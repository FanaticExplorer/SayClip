import webview
import os
from pathlib import Path
from backend import AudioAPI

# For now we will make it like this in sake of implementing it
API_KEY_AVAILABLE = True


def main():
    api = AudioAPI()

    if not API_KEY_AVAILABLE:
        setup_page_frontend = str((Path(__file__).parent / "frontend" / "setup" / "index.html").resolve())
        setup_window = webview.create_window(
            'Setup',
            setup_page_frontend,
            width=400,
            height=280,
        )
    else:
        main_page_frontend = str((Path(__file__).parent / "frontend" / "main" / "index.html").resolve())
        window = webview.create_window(
            'SayClip',
            main_page_frontend,
            js_api=api,
            width=500,
            height=50,
            resizable=False,
        )

        # Store window reference in the API instance
        api.window = window

    webview.start(
        gui='qt',
        icon="icon.ico",
        debug=os.getenv("ENABLE_DEBUG", "0") == "1"
    )


if __name__ == '__main__':
    main()