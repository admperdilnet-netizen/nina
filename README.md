# NINA

Presentadora virtual dominicana para vídeos, historias, novelas y frutinovelas.

## Estado actual

Primera base de la aplicación web independiente. Incluye:

- Interfaz adaptable a escritorio y móvil.
- Carga y reproducción local de vídeos en el navegador.
- Selector de cuatro modos: Comentarista, Narradora, Protagonista y Automático.
- Biblioteca inicial de 12 personajes ilustrativos: 6 mujeres y 6 hombres.
- Filtros para mostrar todos, mujeres u hombres.
- Personalización visual de vestimenta y peinados.
- Controles de posición, tamaño, visibilidad y sonido del personaje sobre el vídeo.
- Paneles preparados para voz y exportación transparente.

## Próximas fases

1. Sustituir los avatares ilustrativos por modelos de personajes de calidad y permitir más variaciones de rostro, cuerpo y vestuario.
2. Integrar animación facial y corporal real.
3. Conectar voces femeninas y masculinas con acento dominicano y sincronización labial.
4. Analizar el vídeo y generar reacciones en los cuatro modos.
5. Superposición independiente con fondo transparente.
6. Exportación WebM con alfa y evaluación de MOV ProRes 4444.

> Importante: la galería y los controles de selección ya están en la interfaz, pero los personajes aún son representaciones visuales de prueba. No son modelos 3D animados. Voz, comprensión automática de escenas, reacciones inteligentes y exportación transparente todavía no están implementadas.

## Requisitos

- Node.js 20 o superior.
- npm.

## Desarrollo local

```bash
npm install
npm run dev
```

## Compilar

```bash
npm run build
npm run preview
```


## Motor local para Windows (fase inicial)

Se añadió `local-engine/` como base del servicio que se ejecutará en el PC. Abre `local-engine/INICIAR-NINA.bat` para preparar el entorno y arrancar el servicio local. La interfaz puede consultar su estado y enviar el archivo al PC.

**Alcance actual del motor:** servicio local, comprobación de FFmpeg y recepción local de vídeos. Todavía no genera comentarios, voz dominicana, expresiones faciales ni el vídeo final. Esas funciones no deben presentarse como disponibles hasta integrarlas y probarlas.


## NINA para celulares y tabletas (PWA)

La web ahora incluye una primera capa de aplicación instalable:
- Manifiesto con modo independiente, nombre e iconos.
- Diseño adaptable para teléfonos y tabletas, controles táctiles y áreas seguras.
- Aviso de instalación cuando el navegador lo permite.
- Service worker con caché básica de la interfaz para volver a abrir el shell sin conexión.

### Instalar
- Android: abre `https://admperdilnet-netizen.github.io/nina/` en Chrome y selecciona Instalar aplicación (o menú > Instalar aplicación / Añadir a pantalla de inicio).
- iPhone/iPad: abre el enlace en Safari, toca Compartir y selecciona Añadir a pantalla de inicio.

### Limitación importante
Esta PWA es la aplicación móvil de interfaz. El motor local actual está diseñado para Windows y escucha en el propio PC (127.0.0.1); una PWA abierta en un teléfono no puede utilizar directamente ese servicio del PC. El procesamiento de vídeo local en móviles/tabletas requiere un motor móvil específico o una conexión segura entre dispositivos, que queda para una fase posterior. La PWA no genera todavía el vídeo comentado final.
