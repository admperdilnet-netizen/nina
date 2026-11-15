@echo off
setlocal
cd /d "%~dp0"
if exist "AVATAR-LOCAL-CONFIG.bat" call "AVATAR-LOCAL-CONFIG.bat"
title NINA - Motor local (perfil 8 GB)
echo ==========================================
echo       NINA - PERFIL LIGERO PARA 8 GB
echo ==========================================
where py >nul 2>nul
if errorlevel 1 (
  echo No se encontro Python. Instala Python 3.11 o 3.12 desde python.org
  echo Marca "Add Python to PATH" durante la instalacion.
  pause
  exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
  echo Preparando entorno...
  py -3 -m venv .venv
  if errorlevel 1 goto error
)
set OMP_NUM_THREADS=1
set OPENBLAS_NUM_THREADS=1
set MKL_NUM_THREADS=1
set NUMEXPR_NUM_THREADS=1
set TOKENIZERS_PARALLELISM=false
set PYTHONUNBUFFERED=1
echo Instalando componentes ligeros...
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto error
echo.
echo Perfil de bajo consumo: 1 proceso web, maximo 2 hilos FFmpeg.
echo NINA Local Engine: http://127.0.0.1:8765
echo Estado y RAM: http://127.0.0.1:8765/health
echo No cierres esta ventana mientras uses NINA.
".venv\Scripts\python.exe" -m uvicorn server:app --host 127.0.0.1 --port 8765 --workers 1 --limit-concurrency 2
goto end
:error
echo.
echo No se pudo preparar el motor. Copia el error y envialo.
pause
:end
endlocal
