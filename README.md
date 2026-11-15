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


## Integración de D-ID (personajes hablantes)

NINA incluye el cliente oficial `@d-id/client-sdk` para reproducir avatares hablantes en directo mediante WebRTC.

### Configurar cada personaje
1. Entra en [D-ID Studio](https://studio.d-id.com/) y crea un Agent para cada personaje que quieras activar.
2. Sube como avatar el retrato correspondiente (Luna, Sofía, Camila, etc.) y configura en D-ID la voz y el idioma/acento disponibles para ese Agent.
3. En la galería de Agents abre `</> Embed` y copia el **Agent ID** y el **Client Key**.
4. Abre NINA desde el dominio autorizado en D-ID. Selecciona el personaje y, en **Presentador real con D-ID**, pega su Agent ID y Client Key y pulsa **Guardar configuración**.
5. Repite el proceso para cada personaje. NINA guarda la configuración de cada uno en el almacenamiento local de ese navegador.
6. Escribe el texto y pulsa **HABLAR CON D-ID**. El vídeo en directo del avatar aparece en el recuadro del personaje.

### Seguridad y requisitos
- Utiliza el **Client Key** del snippet Embed, no la API key privada de tu cuenta.
- En D-ID limita el Client Key a los dominios donde publicarás NINA (por ejemplo, `admperdilnet-netizen.github.io` y `localhost` para pruebas). No publiques una API key privada en el frontend.
- Cada personaje necesita su propio Agent configurado con su imagen y voz. Crear los Agents y disponer de créditos/plan de D-ID es un paso externo que NINA no puede realizar automáticamente.
- La conexión requiere internet y un navegador moderno compatible con WebRTC. El vídeo D-ID se muestra dentro de NINA; la voz la determina el Agent configurado en D-ID Studio.
- La configuración queda guardada en el navegador y no se sincroniza automáticamente entre dispositivos.
- La integración permite enviar texto al avatar. El análisis automático del vídeo y la generación autónoma de comentarios todavía necesitan una etapa adicional.
