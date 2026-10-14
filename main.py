import asyncio
import json
import os
import time
import uuid
from contextlib import asynccontextmanager
from typing import Optional

import edge_tts
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "app", "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "app", "templates")
VOICES_CACHE_FILE = os.path.join(BASE_DIR, "app", "voices_cache.json")

os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)

VOICES_GROUPED = {}
_voices_lock = asyncio.Lock()

FALLBACK_RAW = [
    {"ShortName": "en-US-AriaNeural", "Gender": "Female", "Locale": "en-US", "LocaleName": "English (United States)", "FriendlyName": "Microsoft Aria Online (Natural) - English (United States)"},
    {"ShortName": "en-US-GuyNeural", "Gender": "Male", "Locale": "en-US", "LocaleName": "English (United States)", "FriendlyName": "Microsoft Guy Online (Natural) - English (United States)"},
    {"ShortName": "en-GB-SoniaNeural", "Gender": "Female", "Locale": "en-GB", "LocaleName": "English (United Kingdom)", "FriendlyName": "Microsoft Sonia Online (Natural) - English (United Kingdom)"},
    {"ShortName": "ur-PK-AsadNeural", "Gender": "Male", "Locale": "ur-PK", "LocaleName": "Urdu (Pakistan)", "FriendlyName": "Microsoft Asad Online (Natural) - Urdu (Pakistan)"},
    {"ShortName": "hi-IN-SwaraNeural", "Gender": "Female", "Locale": "hi-IN", "LocaleName": "Hindi (India)", "FriendlyName": "Microsoft Swara Online (Natural) - Hindi (India)"},
]


def _build_voices(raw):
    """Group Edge TTS voices by locale for the frontend."""
    grouped = {}
    for v in raw:
        locale = v.get("Locale") or ""
        short = v.get("ShortName") or v.get("Name") or ""
        if not locale or not short:
            continue
        friendly = v.get("FriendlyName") or ""
        display = friendly.split(" - ")[0].replace("Microsoft ", "").strip() or short
        grouped.setdefault(locale, []).append({
            "name": short,
            "gender": v.get("Gender") or "Neutral",
            "locale": locale,
            "locale_name": v.get("LocaleName") or locale,
            "friendly_name": display,
        })
    for voices in grouped.values():
        voices.sort(key=lambda x: x["friendly_name"])
    return dict(sorted(grouped.items()))


def _load_cache():
    try:
        with open(VOICES_CACHE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) and data else None
    except Exception:
        return None


def _save_cache(data):
    try:
        tmp = VOICES_CACHE_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        os.replace(tmp, VOICES_CACHE_FILE)
    except Exception:
        pass


async def _refresh_voices():
    global VOICES_GROUPED
    raw = await edge_tts.list_voices()
    grouped = _build_voices(raw)
    if grouped:
        VOICES_GROUPED = grouped
        _save_cache(grouped)
    return VOICES_GROUPED


async def get_voices_grouped():
    global VOICES_GROUPED
    if VOICES_GROUPED:
        return VOICES_GROUPED
    async with _voices_lock:
        if not VOICES_GROUPED:
            try:
                await _refresh_voices()
            except Exception:
                pass
        if not VOICES_GROUPED:
            VOICES_GROUPED = _build_voices(FALLBACK_RAW)
    return VOICES_GROUPED


def _cleanup_old_files(max_age_seconds=7200):
    now = time.time()
    try:
        for name in os.listdir(STATIC_DIR):
            if not name.endswith(".mp3"):
                continue
            path = os.path.join(STATIC_DIR, name)
            try:
                if now - os.path.getmtime(path) > max_age_seconds:
                    os.remove(path)
            except OSError:
                pass
    except OSError:
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    global VOICES_GROUPED
    cached = _load_cache()
    if cached:
        VOICES_GROUPED = cached
    _cleanup_old_files()

    async def _background_refresh():
        try:
            await _refresh_voices()
        except Exception:
            pass

    task = asyncio.create_task(_background_refresh())
    yield
    task.cancel()


app = FastAPI(title="Voice Tool TTS", description="Text to Speech using Edge TTS", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def root():
    return FileResponse(os.path.join(TEMPLATES_DIR, "index.html"))


@app.get("/api/voices")
async def list_voices():
    voices = await get_voices_grouped()
    return JSONResponse(
        content={"success": True, "voices": voices},
        headers={"Cache-Control": "public, max-age=86400"},
    )


class TTSRequest(BaseModel):
    text: str
    voice: str = "en-US-AriaNeural"
    rate: float = 0
    pitch: float = 0
    volume: float = 0


def _as_percent(value):
    try:
        v = float(value or 0)
    except (TypeError, ValueError):
        v = 0.0
    return f"+{v:g}%" if v >= 0 else f"{v:g}%"


def _as_hz(value):
    try:
        v = float(value or 0)
    except (TypeError, ValueError):
        v = 0.0
    return f"+{v:g}Hz" if v >= 0 else f"{v:g}Hz"


@app.post("/api/tts")
async def tts(req: TTSRequest):
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    try:
        communicate = edge_tts.Communicate(
            text=req.text,
            voice=req.voice,
            rate=_as_percent(req.rate),
            pitch=_as_hz(req.pitch),
            volume=_as_percent(req.volume),
        )
        filename = f"{uuid.uuid4().hex}.mp3"
        filepath = os.path.join(STATIC_DIR, filename)
        await communicate.save(filepath)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    _cleanup_old_files()
    return {
        "success": True,
        "audio_url": f"/static/{filename}",
        "filename": filename,
    }


@app.get("/health")
async def health():
    return {"status": "ok", "locales": len(VOICES_GROUPED)}
