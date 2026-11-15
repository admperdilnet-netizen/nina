# NINA

Presentadora virtual dominicana para vídeos, historias, novelas y frutinovelas.

## Estado actual
Primera base de la aplicación web independiente. Incluye:

- Interfaz adaptable a escritorio y móvil.
- Carga y reproducción local de vídeos en el navegador.
- Biblioteca inicial de 12 personajes ilustrativos: 6 mujeres y 6 hombres.
- Personalización visual de vestimenta y peinados.
- Controles de posición, tamaño, visibilidad y sonido del personaje sobre el vídeo.
- PWA instalable y una compilación Android (APK) en preparación automática.

## Importante sobre las funciones
La galería y los controles de selección están en la interfaz, pero los personajes aún son representaciones visuales de prueba, no modelos 3D animados. La voz dominicana, comprensión automática de escenas, reacciones inteligentes y exportación transparente todavía no están implementadas.

## Desarrollo local
Requiere Node.js 20 o superior y npm.

```bash
npm install
npm run dev
npm run build
```

## Android
El flujo de GitHub Actions compila la aplicación web, la empaqueta con Capacitor y publica el APK de depuración en **Releases**. Al terminar la compilación, descarga el archivo `app-debug.apk` desde:

https://github.com/admperdilnet-netizen/nina/releases/latest

Para instalarlo en Android, descarga el APK en el teléfono, ábrelo y permite la instalación desde esa fuente si Android lo solicita. Es una compilación de prueba (debug), no una versión firmada para Google Play.

## PWA para celulares y tabletas
También puedes abrir https://admperdilnet-netizen.github.io/nina/ en Chrome y usar el menú > Instalar aplicación / Añadir a pantalla de inicio.

## Motor local para Windows (fase inicial)
El servicio `local-engine/` está diseñado para ejecutarse en el PC. La versión Android empaqueta la interfaz de NINA; **no incluye el motor local de Windows ni convierte automáticamente el teléfono en un motor de edición**. Voz, animación real, análisis de escenas y exportación final siguen pendientes de integración.
