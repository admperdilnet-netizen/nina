# NINA

Presentadora virtual dominicana para vídeos, historias, novelas y frutinovelas.

## Estado actual
Primera base de la aplicación web independiente. Incluye:

- Interfaz adaptable a escritorio, tabletas y móviles.
- Compatibilidad de instalación como PWA en Android y iPhone/iPad.
- Carga y reproducción local de vídeos en el navegador.
- Biblioteca inicial de 12 personajes ilustrativos: 6 mujeres y 6 hombres.
- Personalización visual de vestimenta y peinados.
- Controles de posición, tamaño, visibilidad y sonido del personaje sobre el vídeo.
- Flujo de compilación Android (APK) en GitHub Actions.

## Instalar en iPhone o iPad (sin cuenta de desarrollador)
1. Abre https://admperdilnet-netizen.github.io/nina/ en **Safari**.
2. Pulsa el botón **Compartir** (cuadrado con flecha hacia arriba).
3. Selecciona **Añadir a pantalla de inicio**.
4. Confirma con **Añadir**. NINA aparecerá como icono y se abrirá en modo de aplicación.

Si no aparece esa opción, asegúrate de abrir la página en Safari y no dentro de otro navegador o ventana integrada.

## Aplicación nativa para iOS
El proyecto está preparado para empaquetarse con Capacitor. Para distribuir un IPA instalable o publicarlo en TestFlight se necesita macOS/Xcode y firma con una cuenta de Apple Developer. La instalación PWA anterior no requiere esa cuenta.

## Android
El flujo de GitHub Actions compila la aplicación web, la empaqueta con Capacitor y publica el APK de depuración en **Releases**. Descarga el archivo `app-debug.apk` desde:

https://github.com/admperdilnet-netizen/nina/releases/latest

Es una compilación de prueba (debug), no una versión firmada para Google Play.

## Desarrollo local
Requiere Node.js 20 o superior y npm.

```bash
npm install
npm run dev
npm run build
```

## Importante sobre las funciones
La galería y los controles de selección están en la interfaz, pero los personajes aún son representaciones visuales de prueba, no modelos 3D animados. La voz dominicana, comprensión automática de escenas, reacciones inteligentes y exportación transparente todavía no están implementadas.

El servicio `local-engine/` está diseñado para ejecutarse en el PC. La versión móvil muestra la interfaz y permite previsualizar vídeos, pero no incluye el motor local de Windows ni convierte automáticamente el teléfono en un motor de edición. La conexión a `127.0.0.1:8765` solo funciona si el motor se ejecuta en el mismo dispositivo.
