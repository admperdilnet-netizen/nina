from __future__ import annotations

import os
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Any

import imageio_ffmpeg
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import FileResponse

APP_DIR = Path(__file__).resolve().parent
WORK_DIR = APP_DIR / "work"
WORK_DIR.mkdir(exist_ok=True)
MAX_UPLOAD_BYTES = 20 * 1024 * 1024 * 1024
VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/x-matroska"}

app = FastAPI(title="NINA Local Video Engine", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://admperdilnet-netizen.github.io", "http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def allow_local_network_access(request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

def ffmpeg_path() -> str:
    try:
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return shutil.which("ffmpeg") or ""

@app.get("/health")
def health() -> dict[str, Any]:
    ffmpeg = ffmpeg_path()
    return {
        "ok": True,
        "service": "NINA Local Video Engine",
        "version": "0.1.0",
        "ffmpeg_ready": bool(ffmpeg),
        "ffmpeg_path": ffmpeg or None,
        "video_upload_ready": True,
        "scene_analysis_ready": False,
        "dominican_voice_ready": False,
        "facial_animation_ready": False,
        "full_video_render_ready": False,
        "note": "El motor local está instalado. El análisis inteligente, las voces y la animación se conectarán en fases verificadas."
    }

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)) -> dict[str, Any]:
    content_type = (file.content_type or "").lower()
    suffix = Path(file.filename or "video.mp4").suffix.lower()
    if not content_type.startswith("video/") and suffix not in {".mp4", ".mov", ".webm", ".mkv", ".m4v"}:
        raise HTTPException(status_code=415, detail="Selecciona un archivo de vídeo compatible.")
    video_id = uuid.uuid4().hex
    target = WORK_DIR / f"{video_id}{suffix or '.mp4'}"
    total = 0
    try:
        with target.open("wb") as out:
            while chunk := await file.read(1024 * 1024):
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="El vídeo supera el límite local de 20 GB.")
                out.write(chunk)
    except Exception:
        target.unlink(missing_ok=True)
        raise
    finally:
        await file.close()

    if total == 0:
        target.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    return {
        "video_id": video_id,
        "filename": Path(file.filename or target.name).name,
        "size_bytes": total,
        "stored_locally": True,
        "message": "Vídeo recibido en tu PC. Todavía no se ha modificado ni exportado."
    }

@app.get("/")
def root() -> dict[str, str]:
    return {"service": "NINA Local Video Engine", "health": "/health"}
