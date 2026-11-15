from __future__ import annotations

import shutil
import uuid
from pathlib import Path
from typing import Any

import imageio_ffmpeg
import psutil
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

APP_DIR = Path(__file__).resolve().parent
WORK_DIR = APP_DIR / "work"
WORK_DIR.mkdir(exist_ok=True)
# Conservative ceiling: leave disk headroom and write uploads in small chunks.
MAX_UPLOAD_BYTES = 4 * 1024 * 1024 * 1024
UPLOAD_CHUNK_BYTES = 256 * 1024
MIN_FREE_DISK_BYTES = 1024 * 1024 * 1024
ALLOWED_SUFFIXES = {".mp4", ".mov", ".webm", ".mkv", ".m4v"}

app = FastAPI(title="NINA Local Video Engine", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://admperdilnet-netizen.github.io",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
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


def resource_snapshot() -> dict[str, Any]:
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage(str(WORK_DIR))
    return {
        "ram_total_gb": round(memory.total / (1024 ** 3), 1),
        "ram_available_gb": round(memory.available / (1024 ** 3), 1),
        "ram_used_percent": memory.percent,
        "free_disk_gb": round(disk.free / (1024 ** 3), 1),
        "low_memory_profile": memory.total <= 10 * (1024 ** 3),
        "recommended_profile": "8GB" if memory.total <= 10 * (1024 ** 3) else "standard",
    }


@app.get("/health")
def health() -> dict[str, Any]:
    ffmpeg = ffmpeg_path()
    resources = resource_snapshot()
    return {
        "ok": True,
        "service": "NINA Local Video Engine",
        "version": "0.2.0",
        "ffmpeg_ready": bool(ffmpeg),
        "ffmpeg_path": ffmpeg or None,
        "video_upload_ready": True,
        "resource_profile": resources,
        "processing_limits": {
            "worker_processes": 1,
            "cpu_threads": 2,
            "filter_threads": 1,
            "upload_chunk_kb": UPLOAD_CHUNK_BYTES // 1024,
            "max_upload_gb": MAX_UPLOAD_BYTES // (1024 ** 3),
            "target_preview": "720p",
        },
        "scene_analysis_ready": False,
        "dominican_voice_ready": False,
        "facial_animation_ready": False,
        "full_video_render_ready": False,
        "note": "Perfil de bajo consumo activo. El análisis de escenas, la voz y la animación todavía no están implementados.",
    }


@app.post("/upload")
async def upload_video(file: UploadFile = File(...)) -> dict[str, Any]:
    suffix = Path(file.filename or "video.mp4").suffix.lower()
    content_type = (file.content_type or "").lower()
    if not content_type.startswith("video/") and suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(status_code=415, detail="Selecciona un archivo de vídeo compatible.")

    disk = psutil.disk_usage(str(WORK_DIR))
    if disk.free < MIN_FREE_DISK_BYTES:
        raise HTTPException(status_code=507, detail="Queda menos de 1 GB libre. Libera espacio antes de cargar el vídeo.")

    video_id = uuid.uuid4().hex
    target = WORK_DIR / f"{video_id}{suffix or '.mp4'}"
    total = 0
    try:
        with target.open("wb") as out:
            while chunk := await file.read(UPLOAD_CHUNK_BYTES):
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="El vídeo supera el límite local de 4 GB.")
                out.write(chunk)
        if total == 0:
            raise HTTPException(status_code=400, detail="El archivo está vacío.")
    except Exception:
        target.unlink(missing_ok=True)
        raise
    finally:
        await file.close()

    return {
        "video_id": video_id,
        "filename": Path(file.filename or target.name).name,
        "size_bytes": total,
        "stored_locally": True,
        "message": "Vídeo recibido en el disco local. Todavía no se ha modificado ni exportado.",
    }


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "NINA Local Video Engine", "health": "/health"}
