# NINA Local Video Engine (Windows)

This is the local companion service for the NINA GitHub Pages interface.

## Requirements
- Windows 10/11
- Python 3.11 or 3.12 installed from python.org
- Internet connection for the first dependency installation

## Start
Double-click `INICIAR-NINA.bat`. The service listens only on localhost:
`http://127.0.0.1:8765`

Check its status at:
`http://127.0.0.1:8765/health`

## Current verified scope
- Local FastAPI service.
- Video upload to the user's own PC.
- FFmpeg binary supplied by imageio-ffmpeg.
- Health endpoint reports which processing stages are actually available.

## Not implemented yet
This starter service does NOT yet analyze scenes, write comments, synthesize Dominican speech, animate a photorealistic character, lip-sync, or render a finished YouTube video. Those stages must be integrated and tested before NINA can claim to export a completed video. Uploaded files remain in `local-engine/work` until manually deleted.
