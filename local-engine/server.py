from __future__ import annotations

import os
import shutil
import subprocess
import sys
import uuid
import asyncio
import re
import wave
from pathlib import Path
from typing import Any

import imageio_ffmpeg
import psutil
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from faster_whisper import WhisperModel
import edge_tts
from deep_translator import GoogleTranslator
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


# Automatic speech translation, dubbing and subtitles for reaction videos.
DUB_LANGUAGES = {
    "es": ("Spanish", "es-MX-DaliaNeural"),
    "en": ("English", "en-US-JennyNeural"),
    "fr": ("French", "fr-FR-DeniseNeural"),
    "pt": ("Portuguese", "pt-BR-FranciscaNeural"),
}
_WHISPER_MODEL = None


def get_whisper_model():
    global _WHISPER_MODEL
    if _WHISPER_MODEL is None:
        # CPU/int8 keeps memory use manageable on ordinary Windows PCs.
        _WHISPER_MODEL = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=2)
    return _WHISPER_MODEL


def srt_timestamp(seconds: float) -> str:
    milliseconds = max(0, int(seconds * 1000))
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, millis = divmod(remainder, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{millis:03}"


async def make_tts(text: str, voice: str, output_path: Path):
    await edge_tts.Communicate(text, voice).save(str(output_path))


def translate_video_segments(video_path: Path, target_language: str, work_dir: Path, prefix: str):
    model = get_whisper_model()
    segments, info = model.transcribe(str(video_path), vad_filter=True, beam_size=1)
    translator = GoogleTranslator(source="auto", target=target_language)
    translated = []
    for segment in segments:
        source_text = (segment.text or "").strip()
        if not source_text:
            continue
        try:
            translated_text = translator.translate(source_text)
        except Exception as exc:
            raise RuntimeError(f"No se pudo traducir el diálogo ({prefix}): {exc}") from exc
        if not translated_text:
            continue
        audio_path = work_dir / f"{prefix}_{len(translated)}.mp3"
        try:
            asyncio.run(make_tts(translated_text, DUB_LANGUAGES[target_language][1], audio_path))
        except Exception as exc:
            raise RuntimeError(f"No se pudo generar la voz doblada ({prefix}): {exc}") from exc
        translated.append({
            "start": max(0.0, float(segment.start)),
            "end": max(float(segment.start) + 0.1, float(segment.end)),
            "text": translated_text,
            "audio": audio_path,
        })
    return translated


@app.post("/dub-render")
def dub_and_render_reaction(
    main_video: UploadFile = File(...),
    reaction_video: UploadFile = File(...),
    language: str = Form("es"),
    overlay_x: float = Form(66),
    overlay_y: float = Form(60),
    overlay_size: float = Form(30),
    subtitles: bool = Form(True),
):
    if language not in DUB_LANGUAGES:
        raise HTTPException(status_code=400, detail="Idioma de doblaje no admitido.")
    overlay_x = max(0.0, min(100.0, overlay_x))
    overlay_y = max(0.0, min(100.0, overlay_y))
    overlay_size = max(12.0, min(65.0, overlay_size))
    job_id = uuid.uuid4().hex
    job_dir = WORK_DIR / f"dub_{job_id}"
    job_dir.mkdir(parents=True, exist_ok=False)
    main_path = job_dir / ("main" + (Path(main_video.filename or "main.mp4").suffix or ".mp4"))
    reaction_path = job_dir / ("reaction" + (Path(reaction_video.filename or "reaction.mp4").suffix or ".mp4"))
    try:
        for upload, target in ((main_video, main_path), (reaction_video, reaction_path)):
            total = 0
            with target.open("wb") as out:
                while chunk := upload.file.read(UPLOAD_CHUNK_BYTES):
                    total += len(chunk)
                    if total > MAX_UPLOAD_BYTES:
                        raise HTTPException(status_code=413, detail="Uno de los videos supera el límite de 4 GB.")
                    out.write(chunk)
            if total == 0:
                raise HTTPException(status_code=400, detail="Uno de los videos está vacío.")
    finally:
        main_video.file.close()
        reaction_video.file.close()

    ffmpeg = ffmpeg_path()
    if not ffmpeg:
        raise HTTPException(status_code=503, detail="FFmpeg no está disponible en el motor local.")
    try:
        main_segments = translate_video_segments(main_path, language, job_dir, "main")
        reaction_segments = translate_video_segments(reaction_path, language, job_dir, "reaction")
        all_segments = sorted(main_segments + reaction_segments, key=lambda item: item["start"])
        if not all_segments:
            raise RuntimeError("No se detectó voz en ninguno de los videos. Comprueba que tengan diálogo audible.")
        srt_path = job_dir / "subtitles.srt"
        with srt_path.open("w", encoding="utf-8-sig") as srt:
            for index, item in enumerate(all_segments, 1):
                safe_text = re.sub(r"\s+", " ", item["text"]).replace("-->", "→")
                srt.write(f"{index}\n{srt_timestamp(item['start'])} --> {srt_timestamp(item['end'])}\n{safe_text}\n\n")

        output_path = WORK_DIR / f"nina-doblado-{job_id}.mp4"
        probe = subprocess.run([ffmpeg, "-i", str(main_path)], capture_output=True, text=True, timeout=30, check=False)
        duration_match = re.search(r"Duration: (\d+):(\d+):(\d+(?:\.\d+)?)", probe.stderr or "")
        if not duration_match:
            raise RuntimeError("No se pudo leer la duración del video principal.")
        video_duration = int(duration_match.group(1)) * 3600 + int(duration_match.group(2)) * 60 + float(duration_match.group(3))
        silence_path = job_dir / "silence.wav"
        with wave.open(str(silence_path), "wb") as silence:
            silence.setnchannels(2)
            silence.setsampwidth(2)
            silence.setframerate(48000)
            remaining = int(video_duration * 48000)
            block = b"\x00" * (48000 * 2 * 2)
            while remaining > 0:
                frames = min(remaining, 48000)
                silence.writeframesraw(block[:frames * 4])
                remaining -= frames
        command = [
            ffmpeg, "-y", "-i", str(main_path), "-i", str(reaction_path)
        ]
        for item in all_segments:
            command.extend(["-i", str(item["audio"])])
        silence_input_index = len(all_segments) + 2
        command.extend(["-i", str(silence_path)])
        width = int(1920 * overlay_size / 100)
        x_expr = f"main_w*{overlay_x / 100:.4f}"
        y_expr = f"main_h*{overlay_y / 100:.4f}"
        filter_parts = [
            "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[base]",
            f"[1:v]scale={width}:-2[reaction]",
            f"[base][reaction]overlay=x={x_expr}:y={y_expr}:eof_action=pass:shortest=0[vraw]",
        ]
        if subtitles:
            # Relative filename avoids Windows drive-letter escaping in FFmpeg filters.
            filter_parts.append("[vraw]subtitles=filename=subtitles.srt:force_style='FontName=Arial,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=1,Alignment=2,MarginV=42'[vout]")
        else:
            filter_parts.append("[vraw]null[vout]")
        audio_labels = []
        for index, item in enumerate(all_segments):
            input_index = index + 2
            label = f"dub{index}"
            delay = max(0, int(item["start"] * 1000))
            filter_parts.append(f"[{input_index}:a]aresample=48000,adelay={delay}|{delay}[{label}]")
            audio_labels.append(f"[{label}]")
        filter_parts.append(f"[{silence_input_index}:a]aresample=48000[bed]")
        filter_parts.append("".join(audio_labels) + "[bed]" + f"amix=inputs={len(audio_labels) + 1}:duration=longest:normalize=0[dub]")
        command.extend([
            "-filter_complex", ";".join(filter_parts),
            "-map", "[vout]", "-map", "[dub]",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "19",
            "-r", "30", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            "-shortest", "-movflags", "+faststart",
            str(output_path),
        ])
        rendered = subprocess.run(command, cwd=str(job_dir), capture_output=True, text=True, timeout=7200, check=False)
        if rendered.returncode != 0 or not output_path.is_file() or output_path.stat().st_size == 0:
            raise RuntimeError((rendered.stderr or "FFmpeg no pudo crear el video doblado.")[-1800:])
        return {
            "ok": True,
            "job_id": job_id,
            "video_url": f"http://127.0.0.1:8765/dub-play/{job_id}",
            "download_url": f"http://127.0.0.1:8765/dub-download/{job_id}",
            "language": language,
            "subtitles_burned_in": bool(subtitles),
            "original_audio_removed": True,
            "message": "Doblaje y subtítulos generados. El audio original se ha eliminado.",
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="El doblaje tardó demasiado. Prueba con videos más cortos.")
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)[:1800])
    except Exception as exc:
        raise HTTPException(status_code=500, detail="No se pudo completar el doblaje: " + str(exc)[:1200])


@app.get("/dub-play/{job_id}")
def play_dubbed_video(job_id: str) -> FileResponse:
    if not job_id or any(ch not in "0123456789abcdef" for ch in job_id.lower()):
        raise HTTPException(status_code=400, detail="Identificador no válido.")
    path = WORK_DIR / f"nina-doblado-{job_id}.mp4"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="No se encontró el video doblado.")
    return FileResponse(path, media_type="video/mp4")


@app.get("/dub-download/{job_id}")
def download_dubbed_video(job_id: str) -> FileResponse:
    if not job_id or any(ch not in "0123456789abcdef" for ch in job_id.lower()):
        raise HTTPException(status_code=400, detail="Identificador no válido.")
    path = WORK_DIR / f"nina-doblado-{job_id}.mp4"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="No se encontró el video doblado.")
    return FileResponse(path, media_type="video/mp4", filename="NINA-video-doblado.mp4")
