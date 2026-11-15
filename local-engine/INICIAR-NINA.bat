@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo        NINA - MOTOR LOCAL PARA WINDOWS
echo ==========================================
where py >nul 2>nul
if errorlevel 1 (
  echo No se encontro Python. Instala Python 3.11 o 3.12 desde python.org
  echo IMPORTANTE: marca "Add Python to PATH" durante la instalacion.
  pause
  exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
  echo Preparando el entorno local...
  py -3 -m venv .venv
  if errorlevel 1 goto error
)
echo Instalando o verificando componentes...
".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto error
echo.
echo NINA Local Engine estara disponible en http://127.0.0.1:8765
echo No cierres esta ventana mientras uses el motor.
".venv\Scripts\python.exe" -m uvicorn server:app --host 127.0.0.1 --port 8765
goto end
:error
echo.
echo No se pudo preparar el motor. Copia el mensaje de error y envialo.
pause
:end
endlocal
