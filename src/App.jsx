import { useEffect, useRef, useState } from 'react'
import { Upload, Play, Pause, Download, Volume2, VolumeX, Move, Film, X } from 'lucide-react'
import './style.css'

export default function App() {
  const [mainUrl, setMainUrl] = useState('')
  const [overlayUrl, setOverlayUrl] = useState('')
  const [mainName, setMainName] = useState('')
  const [overlayName, setOverlayName] = useState('')
  const [mainFile, setMainFile] = useState(null)
  const [overlayFile, setOverlayFile] = useState(null)
  const [dubLanguage, setDubLanguage] = useState('es')
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true)
  const [dubBusy, setDubBusy] = useState(false)
  const [dubbedUrl, setDubbedUrl] = useState('')
  const [dubDownloadUrl, setDubDownloadUrl] = useState('')
  const [playing, setPlaying] = useState(false)
  const [overlaySize, setOverlaySize] = useState(30)
  const [overlayX, setOverlayX] = useState(66)
  const [overlayY, setOverlayY] = useState(60)
  const [overlayOpacity, setOverlayOpacity] = useState(100)
  const [mainVolume, setMainVolume] = useState(100)
  const [overlayVolume, setOverlayVolume] = useState(100)
  const [filterPreset, setFilterPreset] = useState('normal')
  const [filterBrightness, setFilterBrightness] = useState(100)
  const [filterContrast, setFilterContrast] = useState(100)
  const [filterSaturation, setFilterSaturation] = useState(100)
  const [filterSepia, setFilterSepia] = useState(0)
  const [filterBlur, setFilterBlur] = useState(0)
  const filterPresets = {
    normal: { brightness: 100, contrast: 100, saturation: 100, sepia: 0 },
    vivid: { brightness: 108, contrast: 115, saturation: 145, sepia: 0 },
    cinematic: { brightness: 92, contrast: 125, saturation: 85, sepia: 12 },
    mono: { brightness: 100, contrast: 115, saturation: 0, sepia: 0 },
    retro: { brightness: 105, contrast: 95, saturation: 85, sepia: 38 },
    warm: { brightness: 105, contrast: 105, saturation: 120, sepia: 22 }
  }
  const videoFilter = `brightness(${filterBrightness}%) contrast(${filterContrast}%) saturate(${filterSaturation}%) sepia(${filterSepia}%) blur(${filterBlur}px)`
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportDownloadUrl, setExportDownloadUrl] = useState('')
  const [message, setMessage] = useState('Carga dos videos para comenzar tu reacción.')
  const [dragging, setDragging] = useState(false)
  const mainInput = useRef(null)
  const overlayInput = useRef(null)
  const mainRef = useRef(null)
  const overlayRef = useRef(null)
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const dragRef = useRef(null)
  const urlsRef = useRef([])

  useEffect(() => {
    return () => urlsRef.current.forEach(url => URL.revokeObjectURL(url))
  }, [])

  useEffect(() => {
    if (mainRef.current) mainRef.current.volume = mainVolume / 100
    if (overlayRef.current) overlayRef.current.volume = overlayVolume / 100
  }, [mainVolume, overlayVolume, mainUrl, overlayUrl])

  useEffect(() => {
    let frame
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const drawFit = (video, x, y, w, h) => {
      if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return
      const scale = Math.min(w / video.videoWidth, h / video.videoHeight)
      const dw = video.videoWidth * scale
      const dh = video.videoHeight * scale
      ctx.filter = `brightness(${filterBrightness}%) contrast(${filterContrast}%) saturate(${filterSaturation}%) sepia(${filterSepia}%) blur(${filterBlur}px)`
      ctx.drawImage(video, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
      ctx.filter = 'none'
    }
    const draw = () => {
      if (ctx && canvas) {
        ctx.fillStyle = '#050509'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        const main = mainRef.current
        drawFit(main, 0, 0, canvas.width, canvas.height)
        const overlay = overlayRef.current
        if (overlay && overlay.readyState >= 2 && overlay.videoWidth) {
          const w = canvas.width * overlaySize / 100
          const h = w * overlay.videoHeight / overlay.videoWidth
          ctx.save()
          ctx.globalAlpha = overlayOpacity / 100
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 5
          ctx.fillStyle = '#08080c'
          ctx.fillRect(canvas.width * overlayX / 100 - 3, canvas.height * overlayY / 100 - 3, w + 6, h + 6)
          drawFit(overlay, canvas.width * overlayX / 100, canvas.height * overlayY / 100, w, h)
          ctx.strokeRect(canvas.width * overlayX / 100, canvas.height * overlayY / 100, w, h)
          ctx.restore()
        }
        // Permanent creator signature: burned into every canvas-based export.
        ctx.save()
        ctx.font = 'bold 34px Arial, sans-serif'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'bottom'
        ctx.lineJoin = 'round'
        ctx.lineWidth = 6
        ctx.strokeStyle = 'rgba(0,0,0,0.72)'
        ctx.fillStyle = 'rgba(255,255,255,0.88)'
        ctx.strokeText('Gato-tv', canvas.width - 42, canvas.height - 34)
        ctx.fillText('Gato-tv', canvas.width - 42, canvas.height - 34)
        ctx.restore()
      }
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [mainUrl, overlayUrl, overlaySize, overlayX, overlayY, overlayOpacity, filterBrightness, filterContrast, filterSaturation, filterSepia, filterBlur])

  function loadFile(file, layer) {
    // iOS Files/Photos can provide an empty or generic MIME type for valid MOV/MP4 files.
    const videoExtension = /\.(mp4|m4v|mov|webm|ogv|ogg|3gp|3g2|mkv|avi)$/i.test(file?.name || '')
    const videoMime = /^video\//i.test(file?.type || '')
    if (!file || (!videoMime && !videoExtension)) {
      setMessage('No pude reconocer ese archivo como video. Prueba con MP4 o MOV.')
      return
    }
    const url = URL.createObjectURL(file)
    urlsRef.current.push(url)
    if (layer === 'main') {
      setMainFile(file)
      setDubbedUrl('')
      setMainUrl(url)
      setMainName(file.name)
      setPlaying(false)
      setCurrentTime(0)
      setMessage('Video seleccionado. NINA está comprobando si Safari puede reproducirlo…')
    } else {
      setOverlayFile(file)
      setDubbedUrl('')
      setOverlayUrl(url)
      setOverlayName(file.name)
      setMessage('Video de reacción seleccionado. NINA está comprobando si Safari puede reproducirlo…')
    }
  }

  function togglePlayback() {
    const main = mainRef.current
    const overlay = overlayRef.current
    if (!main) {
      setMessage('Primero carga el video principal.')
      return
    }
    if (!main.paused) {
      main.pause()
      overlay?.pause()
      setPlaying(false)
      return
    }

    // iOS Safari may reject play() if it is called after an awaited load event.
    // Start BOTH media elements synchronously inside this tap to preserve the
    // user's playback gesture, then handle their promises together.
    if (overlay && Number.isFinite(overlay.duration) && overlay.duration > 0) {
      try { overlay.currentTime = Math.min(main.currentTime, Math.max(0, overlay.duration - 0.05)) } catch {}
    }
    let mainPromise
    let overlayPromise
    try {
      mainPromise = main.play()
      overlayPromise = overlay ? overlay.play() : Promise.resolve()
    } catch (error) {
      main.pause()
      overlay?.pause()
      setPlaying(false)
      setMessage(error?.message || 'Safari no pudo iniciar los videos. Comprueba que ambos archivos sean compatibles.')
      return
    }

    Promise.all([mainPromise, overlayPromise]).then(() => {
      setPlaying(true)
      setMessage(overlay ? 'Los dos videos están reproduciéndose juntos.' : 'Video principal reproduciéndose.')
    }).catch(error => {
      main.pause()
      overlay?.pause()
      setPlaying(false)
      const code = overlay?.error?.code
      setMessage(overlay && (code === 4 || overlay.error)
        ? 'Safari no puede reproducir el video de reacción. Convierte ese archivo a MP4 con H.264 y vuelve a cargarlo.'
        : (error?.message || 'Safari no pudo iniciar los videos. Toca reproducir de nuevo.'))
    })
  }

  function seek(value) {
    const time = Number(value)
    if (mainRef.current) mainRef.current.currentTime = time
    if (overlayRef.current && overlayRef.current.duration) {
      overlayRef.current.currentTime = Math.min(time, overlayRef.current.duration)
    }
    setCurrentTime(time)
  }

  function startDrag(event) {
    if (!overlayUrl || !stageRef.current) return
    event.preventDefault()
    const rect = stageRef.current.getBoundingClientRect()
    dragRef.current = { dx: event.clientX - rect.left - rect.width * overlayX / 100, dy: event.clientY - rect.top - rect.height * overlayY / 100, rect }
    setDragging(true)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function moveDrag(event) {
    if (!dragRef.current) return
    const { dx, dy, rect } = dragRef.current
    const x = Math.max(0, Math.min(100 - overlaySize, ((event.clientX - rect.left - dx) / rect.width) * 100))
    const y = Math.max(0, Math.min(100 - overlaySize * .75, ((event.clientY - rect.top - dy) / rect.height) * 100))
    setOverlayX(x)
    setOverlayY(y)
  }

  function stopDrag() {
    dragRef.current = null
    setDragging(false)
  }


  async function createDubbedVideo() {
    if (!mainFile || !overlayFile) {
      setMessage('Carga el video principal y el video de reacción para doblarlos.')
      return
    }
    setDubBusy(true)
    setMessage('NINA está reconociendo las voces, traduciendo y creando los subtítulos. La primera vez puede tardar.')
    try {
      const data = new FormData()
      data.append('main_video', mainFile)
      data.append('reaction_video', overlayFile)
      data.append('language', dubLanguage)
      data.append('overlay_x', String(overlayX))
      data.append('overlay_y', String(overlayY))
      data.append('overlay_size', String(overlaySize))
      data.append('subtitles', String(subtitlesEnabled))
      const response = await fetch('http://127.0.0.1:8765/dub-render', { method: 'POST', body: data })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.detail || 'No se pudo generar el doblaje. Abre el motor local de NINA.')
      setDubbedUrl(result.video_url)
      setDubDownloadUrl(result.download_url)
      setMessage('¡Doblaje terminado! El audio original se eliminó y los subtítulos se incorporaron al video.')
    } catch (error) {
      setMessage(error.message || 'No se pudo conectar con el motor local. Abre INICIAR-NINA.bat y vuelve a intentarlo.')
    } finally {
      setDubBusy(false)
    }
  }

  async function exportVideo() {
    const main = mainRef.current
    const overlay = overlayRef.current
    const canvas = canvasRef.current
    if (!main || !mainUrl) {
      setMessage('Carga el video principal antes de exportar.')
      return
    }
    if (!window.MediaRecorder || !canvas?.captureStream) {
      setMessage('Tu navegador no permite exportar video desde este editor. Usa Chrome actualizado.')
      return
    }
    if (exporting) return
    // Give immediate feedback so the user can see the button was activated.
    setExporting(true)
    setExportDownloadUrl('')
    setMessage('Preparando la exportación…')

    let stream
    let audioContext
    let audioSources = []
    let recorder
    let endedHandler
    const cleanAudio = () => {
      audioSources.forEach(source => { try { source.disconnect() } catch {} })
      audioSources = []
      if (audioContext && audioContext.state !== 'closed') audioContext.close().catch(() => {})
    }

    const waitFor = (element, eventName, timeoutMs, errorText) => new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        cleanup()
        reject(new Error(errorText))
      }, timeoutMs)
      const cleanup = () => {
        window.clearTimeout(timer)
        element.removeEventListener(eventName, onReady)
        element.removeEventListener('error', onError)
      }
      const onReady = () => { cleanup(); resolve() }
      const onError = () => { cleanup(); reject(new Error(errorText)) }
      element.addEventListener(eventName, onReady, { once: true })
      element.addEventListener('error', onError, { once: true })
    })

    try {
      main.pause()
      overlay?.pause()
      setMessage('Preparando los videos y el sonido…')

      // On iPhone Safari, play() must be called directly in the user's tap.
      // Do not await loadeddata/seeked first: that loses the transient gesture
      // and Safari then rejects the second (reaction) video.
      try { main.currentTime = 0 } catch {}
      if (overlay) {
        try { overlay.currentTime = 0 } catch {}
      }
      const mainPlayPromise = main.play()
      const overlayPlayPromise = overlay ? overlay.play() : Promise.resolve()

      setMessage('Iniciando la grabación de tu reacción…')
      stream = canvas.captureStream(30)
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext
        if (AudioContextClass) {
          audioContext = new AudioContextClass()
          const destination = audioContext.createMediaStreamDestination()
          for (const video of [main, overlay].filter(Boolean)) {
            const capture = video.captureStream || video.mozCaptureStream
            if (!capture) continue
            const audioTracks = capture.call(video).getAudioTracks()
            if (!audioTracks.length) continue
            const source = audioContext.createMediaStreamSource(new MediaStream(audioTracks))
            source.connect(destination)
            audioSources.push(source)
          }
          if (destination.stream.getAudioTracks().length) {
            destination.stream.getAudioTracks().forEach(track => stream.addTrack(track))
            audioContext.resume().catch(() => {})
          }
        }
      } catch (audioError) {
        console.warn('No se pudo mezclar el audio; se exportará el video:', audioError)
      }

      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : (MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : ''))
      recorder = new MediaRecorder(stream, {
        ...(mime ? { mimeType: mime } : {}),
        videoBitsPerSecond: 12000000,
        audioBitsPerSecond: 192000
      })
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onerror = () => {
        setMessage('El navegador interrumpió la exportación. Prueba de nuevo con Chrome actualizado.')
        if (recorder.state !== 'inactive') recorder.stop()
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' })
        if (!blob.size) {
          setMessage('NINA no recibió datos del video. Comprueba que el video se reproduzca y vuelve a exportar.')
        } else {
          const downloadUrl = URL.createObjectURL(blob)
          urlsRef.current.push(downloadUrl)
          setExportDownloadUrl(downloadUrl)
          // Try the automatic download, but keep a visible manual download link too.
          const link = document.createElement('a')
          link.href = downloadUrl
          link.download = 'Gato-tv-reaccion.webm'
          link.style.display = 'none'
          document.body.appendChild(link)
          link.click()
          link.remove()
          setMessage('¡Video exportado! Si no comenzó la descarga automáticamente, pulsa el enlace Descargar video que aparece aquí.')
        }
        setExporting(false)
        setPlaying(false)
        stream?.getTracks().forEach(track => track.stop())
        cleanAudio()
        recorderRef.current = null
      }

      endedHandler = () => {
        if (recorder.state !== 'inactive') recorder.stop()
        overlay?.pause()
        setPlaying(false)
      }
      main.addEventListener('ended', endedHandler, { once: true })
      recorder.start(1000)
      setMessage('Exportando tu reacción. Espera a que termine el video o pulsa Detener exportación.')
      await Promise.all([mainPlayPromise, overlayPlayPromise])
      setPlaying(true)
    } catch (error) {
      if (endedHandler) main.removeEventListener('ended', endedHandler)
      if (recorder && recorder.state !== 'inactive') {
        try { recorder.stop() } catch {}
      } else {
        stream?.getTracks().forEach(track => track.stop())
        cleanAudio()
        setExporting(false)
      }
      setPlaying(false)
      setExporting(false)
      setMessage('No se pudo exportar: ' + (error?.message || 'error del navegador'))
    }
  }

  function stopExport() {
    if (recorderRef.current?.state && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
    mainRef.current?.pause()
    overlayRef.current?.pause()
    setPlaying(false)
  }

  const timeLabel = value => {
    const n = Math.max(0, Math.floor(value || 0))
    return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0')
  }

  return (
    <div className="reaction-app">
      <header className="reaction-header">
        <div className="reaction-brand"><span className="reaction-logo">N</span><div><strong>NINA</strong><small>EDITOR DE REACCIONES</small></div></div>
        <span className="editor-status"><i /> {exporting ? 'EXPORTANDO' : 'EDITOR LISTO'}</span>
      </header>
      <main className="reaction-workspace">
        <section className="editor-intro"><div><span className="editor-kicker">TU ESTUDIO DE VIDEO</span><h1>Crea videos de <em>reacción</em></h1><p>Combina un video principal con tu reacción superpuesta. Mueve, ajusta y exporta.</p></div></section>
        <div className="editor-layout">
          <section className="editor-main">
            <div className="editor-panel">
              <div className="editor-panel-heading"><div><Film size={18}/><div><strong>Vista previa</strong><small>Arrastra el video pequeño para colocarlo donde quieras.</small></div></div><span className="preview-tag">16:9</span></div>
              <div className="reaction-stage" ref={stageRef} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onPointerLeave={stopDrag}>
                {mainUrl ? <video ref={mainRef} src={mainUrl} playsInline webkit-playsinline="true" controls preload="metadata" style={{ filter: videoFilter }} onLoadedMetadata={e => { setDuration(e.currentTarget.duration || 0); setMessage("Video principal listo para reproducirse.") }} onCanPlay={() => setMessage("Video principal listo para reproducirse.")} onError={e => { const code = e.currentTarget.error?.code; setMessage(code === 4 ? "Safari no reconoce el códec de este video. Convierte el archivo a MP4 H.264 y vuelve a cargarlo." : "Safari no pudo abrir el video. Prueba guardarlo en Archivos y seleccionarlo de nuevo.") }} onTimeUpdate={e => { const time = e.currentTarget.currentTime; setCurrentTime(time); const overlay = overlayRef.current; if (overlay && Number.isFinite(overlay.duration) && Math.abs(overlay.currentTime - time) > 0.6) { try { overlay.currentTime = Math.min(time, Math.max(0, overlay.duration - 0.05)) } catch {} } }} onSeeking={e => { const overlay = overlayRef.current; if (overlay && Number.isFinite(overlay.duration)) { try { overlay.currentTime = Math.min(e.currentTarget.currentTime, Math.max(0, overlay.duration - 0.05)) } catch {} } }} onEnded={() => { overlayRef.current?.pause(); setPlaying(false) }} /> : <button className="stage-empty" onClick={() => mainInput.current?.click()}><Upload size={30}/><strong>Sube el video principal</strong><span>El video que vas a comentar</span></button>}
                {overlayUrl && <div className={'reaction-overlay ' + (dragging ? 'dragging' : '')} style={{ left: overlayX + '%', top: overlayY + '%', width: overlaySize + '%', opacity: overlayOpacity / 100 }} onPointerDown={startDrag}><video ref={overlayRef} src={overlayUrl} playsInline webkit-playsinline="true" muted={false} preload="auto" style={{ filter: videoFilter }} onLoadedMetadata={e => { const main = mainRef.current; if (main && Number.isFinite(e.currentTarget.duration)) { try { e.currentTarget.currentTime = Math.min(main.currentTime, Math.max(0, e.currentTarget.duration - 0.05)) } catch {} } }} onError={() => setMessage('No se pudo cargar el video de reacción. Usa MP4 H.264 para mayor compatibilidad.')}/><span><Move size={12}/> TU REACCIÓN</span></div>}
                {!overlayUrl && mainUrl && <button className="add-overlay-hint" onClick={() => overlayInput.current?.click()}><Upload size={17}/> Añadir video de reacción</button>}
              </div>
              <div className="editor-transport">
                <button className="transport-play" onClick={togglePlayback} disabled={!mainUrl}>{playing ? <Pause size={18}/> : <Play size={18}/>}</button>
                <span className="time-readout">{timeLabel(currentTime)} / {timeLabel(duration)}</span>
                <input aria-label="Posición del video" type="range" min="0" max={duration || 0} step="0.1" value={Math.min(currentTime, duration || 0)} onChange={e => seek(e.target.value)} disabled={!duration}/>
              </div>
            </div>
            <div className="editor-panel layers-panel">
              <div className="editor-panel-heading"><div><Move size={18}/><div><strong>Capas de video</strong><small>Dos videos en una sola composición</small></div></div></div>
              <div className="layer-row"><div className="layer-number">1</div><div className="layer-info"><strong>Video principal</strong><small>{mainName || 'Todavía no has cargado un video'}</small></div><button className="layer-add" onClick={() => mainInput.current?.click()}><Upload size={15}/> {mainUrl ? 'Cambiar' : 'Cargar'}</button>{mainUrl && <button className="layer-remove" title="Quitar video principal" onClick={() => { mainRef.current?.pause(); setMainUrl(''); setMainFile(null); setMainName(''); setDuration(0); setCurrentTime(0); setPlaying(false) }}><X size={16}/></button>}</div>
              <div className="layer-row"><div className="layer-number overlay-number">2</div><div className="layer-info"><strong>Video superpuesto / reacción</strong><small>{overlayName || 'Tu cámara, reacción u otro video'}</small></div><button className="layer-add" onClick={() => overlayInput.current?.click()}><Upload size={15}/> {overlayUrl ? 'Cambiar' : 'Cargar'}</button>{overlayUrl && <button className="layer-remove" title="Quitar superposición" onClick={() => { overlayRef.current?.pause(); setOverlayUrl(''); setOverlayFile(null); setOverlayName('') }}><X size={16}/></button>}</div>
              <input ref={mainInput} type="file" accept="video/*" hidden onChange={e => loadFile(e.target.files?.[0], 'main')}/>
              <input ref={overlayInput} type="file" accept="video/*" hidden onChange={e => loadFile(e.target.files?.[0], 'overlay')}/>
            </div>
          </section>
          <aside className="editor-sidebar">
            <section className="editor-panel filters-panel filters-panel-featured">
              <div className="editor-panel-heading"><div><Film size={18}/><div><strong>Filtros y efectos</strong><small>Elige un estilo y ajusta la imagen</small></div></div></div>
              <label className="control-label"><span>Estilo</span>
                <select value={filterPreset} onChange={e => {
                  const preset = e.target.value
                  setFilterPreset(preset)
                  const values = filterPresets[preset]
                  setFilterBrightness(values.brightness)
                  setFilterContrast(values.contrast)
                  setFilterSaturation(values.saturation)
                  setFilterSepia(values.sepia)
                  setFilterBlur(0)
                }}>
                  <option value="normal">Original</option>
                  <option value="vivid">Vibrante</option>
                  <option value="cinematic">Cinematográfico</option>
                  <option value="mono">Blanco y negro</option>
                  <option value="retro">Retro</option>
                  <option value="warm">Cálido</option>
                </select>
              </label>
              <label className="control-label"><span>Brillo</span><b>{filterBrightness}%</b><input type="range" min="50" max="160" value={filterBrightness} onChange={e => {setFilterBrightness(Number(e.target.value));setFilterPreset('personalizado')}}/></label>
              <label className="control-label"><span>Contraste</span><b>{filterContrast}%</b><input type="range" min="50" max="160" value={filterContrast} onChange={e => {setFilterContrast(Number(e.target.value));setFilterPreset('personalizado')}}/></label>
              <label className="control-label"><span>Saturación</span><b>{filterSaturation}%</b><input type="range" min="0" max="200" value={filterSaturation} onChange={e => {setFilterSaturation(Number(e.target.value));setFilterPreset('personalizado')}}/></label>
              <label className="control-label"><span>Tono sepia</span><b>{filterSepia}%</b><input type="range" min="0" max="100" value={filterSepia} onChange={e => {setFilterSepia(Number(e.target.value));setFilterPreset('personalizado')}}/></label>
              <label className="control-label"><span>Desenfoque</span><b>{filterBlur}px</b><input type="range" min="0" max="5" step="0.5" value={filterBlur} onChange={e => {setFilterBlur(Number(e.target.value));setFilterPreset('personalizado')}}/></label>
              <button className="layer-add" style={{width:'100%',justifyContent:'center'}} onClick={() => {setFilterPreset('normal');setFilterBrightness(100);setFilterContrast(100);setFilterSaturation(100);setFilterSepia(0);setFilterBlur(0)}}>Restablecer filtros</button>
            </section>
            <section className="editor-panel controls-panel">
              <div className="editor-panel-heading"><div><Move size={18}/><div><strong>Editar superposición</strong><small>Selecciona y ajusta tu reacción</small></div></div></div>
              {overlayUrl ? <>
                <label className="control-label"><span>Tamaño del video</span><b>{overlaySize}%</b><input type="range" min="12" max="65" value={overlaySize} onChange={e => setOverlaySize(Number(e.target.value))}/></label>
                <label className="control-label"><span>Transparencia</span><b>{overlayOpacity}%</b><input type="range" min="20" max="100" value={overlayOpacity} onChange={e => setOverlayOpacity(Number(e.target.value))}/></label>
                <div className="control-label"><span>Posición rápida</span><div className="position-grid"><button onClick={() => {setOverlayX(4);setOverlayY(5)}}>↖</button><button onClick={() => {setOverlayX(66);setOverlayY(5)}}>↗</button><button onClick={() => {setOverlayX(4);setOverlayY(60)}}>↙</button><button onClick={() => {setOverlayX(66);setOverlayY(60)}}>↘</button></div></div>
              </> : <div className="control-empty">Carga el segundo video para habilitar los controles de superposición.</div>}
              <div className="audio-heading"><Volume2 size={16}/> Mezcla de audio</div>
              <label className="control-label"><span>Video principal</span><b>{mainVolume}%</b><input type="range" min="0" max="100" value={mainVolume} onChange={e => setMainVolume(Number(e.target.value))}/></label>
              <label className="control-label"><span>Video de reacción</span><b>{overlayVolume}%</b><input type="range" min="0" max="100" value={overlayVolume} onChange={e => setOverlayVolume(Number(e.target.value))}/></label>
            </section>

            <section className="editor-panel dub-panel">
              <div className="editor-panel-heading"><div><Volume2 size={18}/><div><strong>Doblaje y subtítulos automáticos</strong><small>Traduce las voces de los dos videos</small></div></div></div>
              <label className="control-label"><span>Idioma del doblaje</span>
                <select value={dubLanguage} onChange={e => { setDubLanguage(e.target.value); setDubbedUrl('') }}>
                  <option value="es">Español</option>
                  <option value="en">Inglés</option>
                  <option value="fr">Francés</option>
                  <option value="pt">Portugués</option>
                </select>
              </label>
              <label className="subtitle-toggle"><input type="checkbox" checked={subtitlesEnabled} onChange={e => setSubtitlesEnabled(e.target.checked)}/> Añadir subtítulos automáticamente</label>
              <button className="export-reaction-button dub-button" onClick={createDubbedVideo} disabled={!mainFile || !overlayFile || dubBusy}>
                {dubBusy ? 'Procesando doblaje y subtítulos…' : 'Doblar y crear subtítulos'}
              </button>
              {dubbedUrl && <div className="dub-result"><strong>Video doblado listo</strong><video controls playsInline src={dubbedUrl}/><a href={dubDownloadUrl}>Descargar video doblado</a></div>}
              <p className="dub-note">Necesita el motor local de NINA abierto en tu PC. Requiere conexión a internet para traducir y generar la voz.</p>
            </section>
            <section className="editor-panel export-panel">
              <div className="editor-panel-heading"><div><Download size={18}/><div><strong>Exportar video</strong><small>Descarga tu composición</small></div></div></div>
              <div className="export-format"><strong>WEBM · 1080p / 60 FPS</strong><small>Calidad Full HD, 60 FPS y mezcla del audio de ambas capas.</small></div>
              {exporting ? <button className="export-reaction-button stop-export" onClick={stopExport}>Detener exportación</button> : <button className="export-reaction-button" onClick={exportVideo} disabled={!mainUrl}><Download size={17}/> Exportar reacción</button>}
              <p className="editor-message" role="status">{message}</p>
              {exportDownloadUrl && <a className="export-download-link" href={exportDownloadUrl} download="Gato-tv-reaccion.webm"><Download size={15}/> Descargar video Gato-tv</a>}
            </section>
          </aside>
        </div>
        <footer className="editor-footer">NINA · Editor sencillo de videos de reacción. Tus archivos se procesan en tu navegador.</footer>
      </main>
      <canvas ref={canvasRef} width="1920" height="1080" className="render-canvas" />
    </div>
  )
}
