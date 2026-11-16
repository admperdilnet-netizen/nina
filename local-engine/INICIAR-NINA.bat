@echo off
setlocal
cd /d "%~dp0"
if exist "AVATAR-LOCAL-CONFIG.bat" call "AVATAR-LOCAL-CONFIG.bat"
title NINA - Instalador y motor local
echo ==========================================
echo       NINA - INSTALACION AUTOMATICA
echo ==========================================
where py >nul 2>nul
if errorlevel 1 (
  echo No se encontro el lanzador de Python.
  echo Instala Python 3.11 y vuelve a abrir este archivo.
  pause
  exit /b 1
)
py -3.11 --version >nul 2>nul
if errorlevel 1 (
  echo Descargando Python 3.11 necesario para el motor de doblaje...
  py install 3.11
  if errorlevel 1 (
    echo No se pudo instalar Python 3.11 automaticamente.
    echo Instala Python 3.11 desde python.org y vuelve a abrir este archivo.
    pause
    exit /b 1
  )
)
if not exist ".venv\Scripts\python.exe" (
  echo [1/4] Preparando entorno de NINA...
  py -3.11 -m venv .venv
  if errorlevel 1 goto error
)
echo [2/4] Actualizando lista de componentes...
where curl >nul 2>nul
if not errorlevel 1 (
  curl -fL --retry 2 --connect-timeout 15 "https://raw.githubusercontent.com/admperdilnet-netizen/nina/main/local-engine/requirements.txt" -o "requirements-latest.txt"
  if not errorlevel 1 move /y "requirements-latest.txt" "requirements.txt" >nul
)
if exist "requirements-latest.txt" del "requirements-latest.txt"
echo [3/4] Instalando componentes necesarios (solo la primera vez o si hay cambios)...
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto error
set OMP_NUM_THREADS=1
set OPENBLAS_NUM_THREADS=1
set MKL_NUM_THREADS=1
set NUMEXPR_NUM_THREADS=1
set TOKENIZERS_PARALLELISM=false
set PYTHONUNBUFFERED=1
echo.
echo [4/4] Iniciando NINA...
echo Motor local: http://127.0.0.1:8765
echo Estado: http://127.0.0.1:8765/health
echo Mantén esta ventana abierta mientras uses el motor.
echo Para detenerlo, cierra esta ventana.
echo.
".venv\Scripts\python.exe" -m uvicorn server:app --host 127.0.0.1 --port 8765 --workers 1 --limit-concurrency 2
goto end
:error
echo.
echo Hubo un error durante la instalacion.
echo No cierres ni borres archivos. Copia el mensaje de error.
pause
:end
endlocal
