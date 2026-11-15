from __future__ import annotations

import shutil
import subprocess
import uuid
from pathlib import Path
from typing import Any

import imageio_ffmpeg
import psutil
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
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



def find_video_path(video_id: str) -> Path:
    # IDs are generated as UUID hex strings; reject path fragments from clients.
    if not video_id or any(ch not in "0123456789abcdef" for ch in video_id.lower()):
        raise HTTPException(status_code=400, detail="Identificador de vídeo no válido.")
    matches = list(WORK_DIR.glob(f"{video_id}.*"))
    source = next((p for p in matches if not p.name.endswith("_browser.mp4") and p.is_file()), None)
    if source is None:
        raise HTTPException(status_code=404, detail="No se encontró el vídeo cargado. Vuelve a subirlo.")
    return source


@app.post("/convert/{video_id}")
def convert_video_for_browser(video_id: str) -> dict[str, Any]:
    source = find_video_path(video_id)
    target = WORK_DIR / f"{video_id}_browser.mp4"
    if target.exists() and target.stat().st_size > 0:
        return {"ok": True, "converted": True, "format": "MP4 H.264 + AAC"}
    ffmpeg = ffmpeg_path()
    if not ffmpeg:
        raise HTTPException(status_code=503, detail="FFmpeg no está disponible en el motor local.")
    command = [
        ffmpeg, "-y", "-i", str(source),
        "-map", "0:v:0", "-map", "0:a?",
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart", str(target),
    ]
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=1800, check=False)
    except subprocess.TimeoutExpired:
        target.unlink(missing_ok=True)
        raise HTTPException(status_code=504, detail="La conversión tardó demasiado. Prueba con un vídeo más corto.")
    if result.returncode != 0 or not target.exists() or target.stat().st_size == 0:
        target.unlink(missing_ok=True)
        detail = (result.stderr or "FFmpeg no pudo convertir el archivo.")[-1200:]
        raise HTTPException(status_code=422, detail="No se pudo convertir el vídeo a H.264: " + detail)
    return {"ok": True, "converted": True, "format": "MP4 H.264 + AAC", "size_bytes": target.stat().st_size}


@app.get("/play/{video_id}")
def play_converted_video(video_id: str) -> FileResponse:
    find_video_path(video_id)
    target = WORK_DIR / f"{video_id}_browser.mp4"
    if not target.exists() or target.stat().st_size == 0:
        raise HTTPException(status_code=404, detail="El vídeo todavía no está convertido. Vuelve a cargarlo.")
    return FileResponse(target, media_type="video/mp4", filename=target.name)



@app.get("/")
def root() -> dict[str, str]:
    return {"service": "NINA Local Video Engine", "health": "/health"}
