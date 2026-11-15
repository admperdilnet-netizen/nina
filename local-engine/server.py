from __future__ import annotations

import os
import shutil
import subprocess
import sys
import uuid
from pathlib import Path
from typing import Any

import imageio_ffmpeg
import psutil
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
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


# Optional, fully local talking-avatar pipeline.
# Configure these paths on the user's PC; no cloud API or paid credits are used.
SADTALKER_DIR = Path(os.environ.get("NINA_SADTALKER_DIR", APP_DIR / "SadTalker")).resolve()
SADTALKER_PYTHON = os.environ.get("NINA_SADTALKER_PYTHON", "")
PIPER_PYTHON = os.environ.get("NINA_PIPER_PYTHON", sys.executable)
PIPER_FEMALE_MODEL = os.environ.get("NINA_PIPER_FEMALE_MODEL", "")
PIPER_MALE_MODEL = os.environ.get("NINA_PIPER_MALE_MODEL", "")
AVATAR_WORK_DIR = WORK_DIR / "avatars"
AVATAR_WORK_DIR.mkdir(exist_ok=True)
MAX_AVATAR_IMAGE_BYTES = 15 * 1024 * 1024


def avatar_engine_status() -> dict[str, Any]:
    inference = SADTALKER_DIR / "inference.py"
    python_path = SADTALKER_PYTHON or sys.executable
    checkpoints_dir = SADTALKER_DIR / "checkpoints"
    checkpoints_ready = checkpoints_dir.is_dir() and any(checkpoints_dir.iterdir())
    piper_python_ready = Path(PIPER_PYTHON).is_file()
    try:
        piper_check = subprocess.run(
            [PIPER_PYTHON, "-m", "piper", "--help"],
            capture_output=True,
            text=True,
            timeout=8,
            check=False,
        ) if piper_python_ready else None
        piper_ready = bool(piper_check and piper_check.returncode == 0)
    except (OSError, subprocess.TimeoutExpired):
        piper_ready = False
    female_model = Path(PIPER_FEMALE_MODEL) if PIPER_FEMALE_MODEL else None
    male_model = Path(PIPER_MALE_MODEL) if PIPER_MALE_MODEL else None
    female_ready = bool(piper_ready and female_model and female_model.is_file() and female_model.with_suffix(female_model.suffix + ".json").is_file())
    male_ready = bool(piper_ready and male_model and male_model.is_file() and male_model.with_suffix(male_model.suffix + ".json").is_file())
    sadtalker_ready = inference.is_file() and checkpoints_ready and Path(python_path).is_file()
    available = sadtalker_ready and piper_ready and female_ready and male_ready
    return {
        "available": available,
        "sadtalker_ready": sadtalker_ready,
        "checkpoints_ready": checkpoints_ready,
        "piper_ready": piper_ready,
        "female_voice_ready": female_ready,
        "male_voice_ready": male_ready,
        "sadtalker_dir": str(SADTALKER_DIR),
        "message": "Motor local listo." if available else "Falta instalar/configurar SadTalker, sus checkpoints, Piper o los dos modelos de voz (.onnx + .onnx.json). D-ID sigue intacto.",
    }


@app.get("/avatar/status")
def local_avatar_status() -> dict[str, Any]:
    return avatar_engine_status()


@app.post("/avatar/generate")
def generate_local_avatar(
    image: UploadFile = File(...),
    text: str = Form(...),
    gender: str = Form("female"),
) -> dict[str, Any]:
    config = avatar_engine_status()
    if not config["available"]:
        raise HTTPException(
            status_code=503,
            detail="El motor gratuito todavía no está instalado. Configura SadTalker y Piper en este PC; D-ID no se ha modificado.",
        )
    phrase = (text or "").strip()
    if not phrase or len(phrase) > 1800:
        raise HTTPException(status_code=400, detail="Escribe un texto de entre 1 y 1800 caracteres.")
    suffix = Path(image.filename or "portrait.png").suffix.lower()
    if suffix not in {".png", ".jpg", ".jpeg", ".webp"}:
        raise HTTPException(status_code=415, detail="El retrato debe ser PNG, JPG o WEBP.")
    if gender not in {"female", "male"}:
        raise HTTPException(status_code=400, detail="Tipo de voz no válido.")

    job_id = uuid.uuid4().hex
    job_dir = AVATAR_WORK_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=False)
    image_path = job_dir / ("portrait" + suffix)
    audio_path = job_dir / "speech.wav"
    result_dir = job_dir / "results"
    result_dir.mkdir()
    total = 0
    try:
        with image_path.open("wb") as out:
            while chunk := image.file.read(256 * 1024):
                total += len(chunk)
                if total > MAX_AVATAR_IMAGE_BYTES:
                    raise HTTPException(status_code=413, detail="El retrato supera el límite de 15 MB.")
                out.write(chunk)
    finally:
        image.file.close()
    if total == 0:
        raise HTTPException(status_code=400, detail="El retrato está vacío.")

    voice_model = PIPER_FEMALE_MODEL if gender == "female" else PIPER_MALE_MODEL
    try:
        tts = subprocess.run(
            [PIPER_PYTHON, "-m", "piper", "-m", voice_model, "-f", str(audio_path), "--", phrase],
            text=True,
            capture_output=True,
            timeout=180,
            check=False,
        )
        if tts.returncode != 0 or not audio_path.is_file() or audio_path.stat().st_size == 0:
            raise RuntimeError((tts.stderr or "Piper no pudo generar la voz.")[-1000:])

        command = [
            SADTALKER_PYTHON or sys.executable,
            str(SADTALKER_DIR / "inference.py"),
            "--source_image", str(image_path),
            "--driven_audio", str(audio_path),
            "--result_dir", str(result_dir),
            "--checkpoint_dir", str(SADTALKER_DIR / "checkpoints"),
            "--size", "256",
            "--batch_size", "1",
            "--preprocess", "crop",
            "--cpu",
        ]
        rendered = subprocess.run(
            command,
            cwd=str(SADTALKER_DIR),
            capture_output=True,
            text=True,
            timeout=3600,
            check=False,
        )
        videos = sorted(result_dir.rglob("*.mp4"), key=lambda p: p.stat().st_mtime, reverse=True)
        if rendered.returncode != 0 or not videos:
            detail = (rendered.stderr or rendered.stdout or "SadTalker no generó el vídeo.")[-1600:]
            raise RuntimeError(detail)
        final_path = AVATAR_WORK_DIR / (job_id + ".mp4")
        shutil.copy2(videos[0], final_path)
        return {
            "ok": True,
            "job_id": job_id,
            "video_url": f"http://127.0.0.1:8765/avatar/play/{job_id}",
            "message": "Vídeo hablado generado localmente.",
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="La generación tardó más de lo permitido. En CPU puede tardar varios minutos; prueba con un texto más corto.")
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail="No se pudo generar el avatar local: " + str(exc)[:1600])


@app.get("/avatar/play/{job_id}")
def play_local_avatar(job_id: str) -> FileResponse:
    if not job_id or any(ch not in "0123456789abcdef" for ch in job_id.lower()):
        raise HTTPException(status_code=400, detail="Identificador de vídeo no válido.")
    path = AVATAR_WORK_DIR / (job_id + ".mp4")
    if not path.is_file():
        raise HTTPException(status_code=404, detail="No se encontró el vídeo generado.")
    return FileResponse(path, media_type="video/mp4", filename="nina-" + job_id[:8] + ".mp4")
