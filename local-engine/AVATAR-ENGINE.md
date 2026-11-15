# Motor de presentadores hablantes local de NINA

Este motor es una alternativa **local y sin créditos por generación**. No usa D-ID ni envía el retrato, el texto o el audio a un servicio de avatar en la nube.

## Estado de esta integración

- La API local ya tiene rutas preparadas para comprobar el motor, generar audio con Piper y animar el retrato con SadTalker.
- El motor necesita instalarse en el PC y descargar sus modelos una sola vez.
- D-ID permanece intacto en la aplicación principal hasta probar el resultado local.
- En el perfil de 8 GB se fuerza SadTalker por CPU, resolución facial 256 y batch 1. La generación puede tardar varios minutos y no es tiempo real.

## Componentes oficiales

1. SadTalker: https://github.com/OpenTalker/SadTalker — convierte una imagen y un audio en un vídeo con movimiento facial y sincronización labial. Su repositorio indica licencia Apache 2.0 y documenta instalación con Python 3.8.
2. Piper: https://github.com/OHF-Voice/piper1-gpl — voz neuronal local. El motor Piper está bajo GPL-3.0-or-later; cada modelo de voz tiene su propia licencia y hay que revisar su MODEL_CARD.
3. Voces Piper: https://github.com/rhasspy/piper-voices — descarga el archivo .onnx y su .onnx.json correspondiente. El soporte español incluye variantes de España, México y Argentina; no hay que presentarlas como acento dominicano auténtico.

## Instalación en Windows

### 1. Piper (usa el Python del motor NINA)

Abre CMD dentro de `local-engine` y ejecuta:

```bat
.venv\Scripts\python.exe -m pip install piper-tts==1.8.0
```

Descarga una voz femenina y una masculina en español desde el catálogo de voces de Piper. Guarda cada modelo .onnx y su .onnx.json en una carpeta local, por ejemplo `C:\NINA\voices`. Revisa la licencia de cada MODEL_CARD antes de usar o distribuir la voz.

### 2. SadTalker (entorno separado)

SadTalker documenta Python 3.8 en Windows. Instálalo en una carpeta separada; no mezcles sus dependencias con el entorno Python 3.11/3.12 de NINA Local Engine.

```bat
git clone https://github.com/OpenTalker/SadTalker.git C:\NINA\SadTalker
cd /d C:\NINA\SadTalker
py -3.8 -m venv venv
venv\Scripts\python.exe -m pip install --upgrade pip
venv\Scripts\python.exe -m pip install torch torchvision torchaudio
venv\Scripts\python.exe -m pip install -r requirements.txt
```

Descarga los checkpoints oficiales desde la sección **Pre-Trained Models** del README de SadTalker y colócalos en `C:\NINA\SadTalker\checkpoints`. Instala FFmpeg si el instalador de SadTalker lo requiere. El comando anterior es una base de instalación: según el hardware y las versiones de PyTorch, puede ser necesario ajustar la instalación de PyTorch.

### 3. Configurar las rutas

1. Copia `AVATAR-LOCAL-CONFIG.example.bat` como `AVATAR-LOCAL-CONFIG.bat`.
2. Edita las cinco rutas del archivo nuevo para que apunten a tu instalación de SadTalker, su Python 3.8 y los dos modelos Piper.
3. Cierra y vuelve a abrir `INICIAR-NINA.bat`.

La configuración no contiene claves ni tokens. El archivo personal `AVATAR-LOCAL-CONFIG.bat` no debe subirse a GitHub.

## Comprobación

Con NINA Local Engine iniciado, abre:

- Estado general: http://127.0.0.1:8765/health
- Estado del avatar: http://127.0.0.1:8765/avatar/status

Cuando todos los campos aparezcan listos, la interfaz de NINA podrá enviar el retrato y el texto al motor local. La primera generación se debe probar con un texto corto.

## Limitaciones honestas

- No es generación instantánea; CPU con 8 GB puede ser lenta.
- Piper tiene voces españolas disponibles, pero no garantiza una voz dominicana natural. El acento exacto depende de los modelos disponibles.
- El resultado depende de un retrato frontal, bien iluminado y con el rostro visible.
- SadTalker produce un vídeo hablado a partir de una imagen y un audio; no equivale a una persona 3D interactiva que responda en directo.
- El código y los modelos pueden tener licencias distintas. Revisa cada licencia antes de redistribuir o monetizar resultados.
