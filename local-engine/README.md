# NINA Local Video Engine — perfil Windows de 8 GB

## Objetivo
Mantener la página NINA en Chrome y ejecutar el servicio auxiliar en el PC con un consumo moderado de memoria.

## Requisitos
- Windows 10/11 de 64 bits.
- Python 3.11 o 3.12 de 64 bits.
- Al menos 1 GB libre en el disco para iniciar una carga (además del espacio necesario para el archivo).
- Conexión a Internet la primera vez para instalar dependencias.

## Inicio
1. Instala Python 3.11/3.12 desde python.org y marca "Add Python to PATH".
2. Descomprime/descarga el repositorio.
3. Abre `local-engine/INICIAR-NINA.bat`.
4. Mantén abierta la ventana mientras utilizas NINA.
5. Abre `http://127.0.0.1:8765/health` para ver RAM disponible y estado del motor.

## Ajustes para 8 GB
- Un solo proceso Uvicorn.
- Límite de dos solicitudes simultáneas.
- Variables de hilos numéricos limitadas.
- Escritura de archivos en bloques de 256 KiB.
- Límite de carga de 4 GB y comprobación de espacio libre.
- FFmpeg previsto con un máximo de dos hilos de codificación y un hilo de filtros cuando se implemente el render.
- Objetivo de trabajo inicial: previsualización 720p; conservar el archivo original.

## Estado real
Implementado: servicio local, detección de RAM/espacio libre, perfil de bajo consumo y recepción del vídeo en disco por bloques.

Todavía NO implementado: análisis semántico de escenas, generación de comentarios, voz dominicana local, animación facial realista, sincronización labial ni exportación final del vídeo. Los límites de FFmpeg son la configuración prevista para la siguiente fase de render, no una función de exportación ya disponible.

Los vídeos recibidos se guardan en `local-engine/work`. El usuario debe borrar los archivos que ya no necesite desde esa carpeta.
