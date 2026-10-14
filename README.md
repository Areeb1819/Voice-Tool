# Voice Tool - Text to Speech

A modern, elegant Text-to-Speech (TTS) web app powered by FastAPI and Microsoft Edge TTS. Features a beautiful dark glassmorphism UI similar to modern voice tools.

## Features

- **Unlimited Text to Speech** - Generate high-quality speech from any text
- **400+ Voices in 70+ Languages** - Access to a wide variety of neural voices
- **Speed Control** - Adjust speech rate from -100% to +100%
- **Pitch Control** - Fine-tune pitch from -50 Hz to +50 Hz
- **Modern UI** - Dark theme with glassmorphism effects
- **Instant Download** - Download generated audio as MP3
- **Real-time Character Count** - Track your text length
- **Language Filtering** - Filter voices by language

## Tech Stack

- **Backend**: FastAPI (Python) with Uvicorn
- **TTS Engine**: Microsoft Edge TTS (free, no API key required)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Styling**: Glassmorphism design with CSS gradients

## Project Structure

`
Voice Tool/
+-- app/
¦   +-- static/
¦   ¦   +-- app.js      # Frontend JavaScript
¦   ¦   +-- style.css   # Frontend styles
¦   +-- templates/
¦   ¦   +-- index.html  # Main HTML page
¦   +-- __init__.py
+-- main.py             # FastAPI application
+-- requirements.txt    # Python dependencies
+-- README.md
`

## Setup & Installation

### 1. Create Virtual Environment

`ash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Linux/Mac
python3 -m venv .venv
source .venv/bin/activate
`

### 2. Install Dependencies

`ash
pip install -r requirements.txt
`

### 3. Run the Application

`ash
# Set environment variable (recommended for Edge TTS)
set EDGE_TTS_ALLOW_NETWORK=1  # Windows
export EDGE_TTS_ALLOW_NETWORK=1  # Linux/Mac

# Start server
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
`

### 4. Open in Browser

Visit [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.

## Usage

1. Select a **Language** from the dropdown
2. Choose your preferred **Voice** (neural voices work best)
3. Enter or paste your text in the textarea
4. Adjust **Speed** and **Pitch** if desired
5. Click **Generate Speech** to create audio
6. Play it directly or **Download** as MP3

## Notes

- Edge TTS requires internet connection as it connects to Microsoft's TTS service
- Set EDGE_TTS_ALLOW_NETWORK=1 environment variable for newer versions
- All generated audio files are stored in pp/static/ temporarily
- Maximum text length is 5000 characters (can be increased if needed)

## License

This project is for educational and personal use.
