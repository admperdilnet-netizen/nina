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
