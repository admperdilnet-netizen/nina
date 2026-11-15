import { useEffect, useRef, useState } from 'react'
import { Clapperboard, Mic2, Play, Pause, Upload, Volume2, VolumeX, Sparkles, Settings2, MessageCircle, Captions, Move, Download, Radio, WandSparkles } from 'lucide-react'

const MODES = [
  { id: 'commentator', name: 'Comentarista', detail: 'Reacciona y comenta las escenas.', icon: MessageCircle },
  { id: 'narrator', name: 'Narradora', detail: 'Cuenta lo que sucede en el vídeo.', icon: Captions },
  { id: 'character', name: 'Protagonista', detail: 'Participa en la historia.', icon: Clapperboard },
  { id: 'auto', name: 'Automático', detail: 'Elige cómo participar según el contenido.', icon: WandSparkles },
]

export default function App() {
  const [mode, setMode] = useState('auto')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoName, setVideoName] = useState('')
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [avatarVisible, setAvatarVisible] = useState(true)
  const [avatarSize, setAvatarSize] = useState(34)
  const [avatarPosition, setAvatarPosition] = useState('right')
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [status, setStatus] = useState('Lista para comenzar')
  const videoRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl) }, [videoUrl])

  function loadVideo(file) {
    if (!file || !file.type.startsWith('video/')) {
      setStatus('Selecciona un archivo de vídeo válido.')
      return
    }
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoUrl(URL.createObjectURL(file))
    setVideoName(file.name)
    setPlaying(false)
    setStatus('Vídeo cargado. Puedes reproducirlo.')
  }

  async function togglePlay() {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      try { await videoRef.current.play(); setPlaying(true) }
      catch { setStatus('No se pudo reproducir este vídeo en el navegador.') }
    } else {
      videoRef.current.pause()
      setPlaying(false)
    }
  }

  function toggleVoice() {
    const next = !voiceEnabled
    setVoiceEnabled(next)
    setStatus(next
      ? 'Voz de NINA: pendiente de conectar el motor de voz dominicana.'
      : 'Voz desactivada.')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="NINA inicio">
          <span className="brand-mark">N</span><span>NINA</span>
        </a>
        <div className="topbar-center"><span className="live-dot" /> PRESENTADORA VIRTUAL DOMINICANA</div>
        <div className="topbar-right"><span className="status-pill"><span className="tiny-dot" /> {status}</span></div>
      </header>

      <main className="workspace">
        <section className="intro">
          <div>
            <p className="eyebrow"><Sparkles size={14} /> TU COMPAÑERA DE HISTORIAS</p>
            <h1>Hola, soy <span>NINA.</span></h1>
            <p className="intro-copy">Dame un vídeo. Yo pongo la personalidad, las reacciones y la chispa dominicana.</p>
          </div>
          <div className="intro-tag"><Radio size={16} /> ESTUDIO PERSONAL</div>
        </section>

        <div className="studio-grid">
          <section className="video-column">
            <div className="section-heading">
              <div><span className="step-number">01</span><div><h2>Tu vídeo</h2><p>Sube un vídeo desde tu computadora</p></div></div>
              <button className="secondary-button" onClick={() => fileRef.current?.click()}><Upload size={16} /> Subir vídeo</button>
              <input ref={fileRef} type="file" accept="video/*" hidden onChange={e => loadVideo(e.target.files?.[0])} />
            </div>

            <div className="video-stage">
              {videoUrl ? (
                <video ref={videoRef} src={videoUrl} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} controls={false} playsInline />
              ) : (
                <button className="empty-upload" onClick={() => fileRef.current?.click()}>
                  <span className="upload-icon"><Upload size={25} /></span>
                  <strong>Arrastra tu vídeo aquí</strong>
                  <span>o pulsa para buscarlo en tu PC</span>
                  <small>MP4 · WebM · MOV</small>
                </button>
              )}
              {videoUrl && avatarVisible && (
                <div className={`avatar-overlay ${avatarPosition}`} style={{'--avatar-size': `${avatarSize}%`}}>
                  <div className="avatar-glow" />
                  <div className="avatar-placeholder">
                    <div className="avatar-hair" /><div className="avatar-face"><span className="eye left-eye" /><span className="eye right-eye" /><span className="mouth" /></div>
                    <div className="avatar-body"><span className="neck" /><span className="jacket left-jacket" /><span className="jacket right-jacket" /></div>
                  </div>
                  <span className="avatar-label">NINA <i>•</i> {MODES.find(m => m.id === mode)?.name}</span>
                </div>
              )}
              {videoUrl && <div className="video-controls"><button onClick={togglePlay} aria-label={playing ? 'Pausar' : 'Reproducir'}>{playing ? <Pause size={19} /> : <Play size={19} />}</button><span>{videoName}</span></div>}
            </div>

            <div className="video-tools">
              <button className="tool-button" onClick={() => setAvatarVisible(v => !v)}><Move size={16} /> {avatarVisible ? 'Ocultar NINA' : 'Mostrar NINA'}</button>
              <button className="tool-button" onClick={() => setMuted(v => !v)}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />} {muted ? 'Activar sonido' : 'Silenciar vista'}</button>
              <div className="size-control"><span>Tamaño</span><input type="range" min="20" max="55" value={avatarSize} onChange={e => setAvatarSize(Number(e.target.value))} /></div>
            </div>
            {videoUrl && <div className="file-loaded"><span className="file-check">✓</span><span>{videoName}</span><button onClick={() => { URL.revokeObjectURL(videoUrl); setVideoUrl(''); setVideoName(''); setPlaying(false) }}>Quitar</button></div>}
          </section>

          <aside className="side-column">
            <section className="panel mode-panel">
              <div className="panel-heading"><div><span className="step-number">02</span><div><h2>Modo de actuación</h2><p>¿Cómo quieres que participe?</p></div></div><Settings2 size={18} /></div>
              <div className="mode-list">
                {MODES.map(({id, name, detail, icon: Icon}) => (
                  <button key={id} className={`mode-option ${mode === id ? 'selected' : ''}`} onClick={() => { setMode(id); setStatus(`Modo seleccionado: ${name}. El motor de actuación se conectará en la siguiente fase.`) }}>
                    <span className="mode-icon"><Icon size={18} /></span><span className="mode-text"><strong>{name}</strong><small>{detail}</small></span><span className="radio-mark">{mode === id ? '✓' : ''}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel voice-panel">
              <div className="panel-heading"><div><span className="step-number">03</span><div><h2>Voz de NINA</h2><p>Femenina · acento dominicano</p></div></div><Mic2 size={19} /></div>
              <div className="voice-card">
                <div className="voice-orb"><Mic2 size={20} /></div>
                <div className="voice-copy"><strong>Voz dominicana auténtica</strong><small>Expresiva, natural y carismática</small></div>
                <span className="soon-tag">SIGUIENTE FASE</span>
              </div>
              <button className={`primary-button ${voiceEnabled ? 'active' : ''}`} onClick={toggleVoice}><Mic2 size={17} /> {voiceEnabled ? 'Desactivar voz' : 'Activar voz'}</button>
              <p className="microcopy">El motor de voz y la sincronización labial se integrarán después de validar esta base.</p>
            </section>

            <section className="panel export-panel">
              <div className="panel-heading"><div><span className="step-number">04</span><div><h2>Exportar a vídeo</h2><p>Personaje con fondo transparente</p></div></div><Download size={18} /></div>
              <div className="export-preview"><div className="checker"><span className="mini-avatar">N</span></div><div><strong>WebM transparente</strong><small>También estudiaremos MOV ProRes 4444</small></div></div>
              <button className="export-button" disabled><Download size={16} /> Exportación — próximamente</button>
            </section>
          </aside>
        </div>

        <footer className="footer-note"><span>✦</span> NINA está en su primera etapa de construcción. Las funciones marcadas como siguientes fases todavía no generan voz ni reacciones automáticas.</footer>
      </main>
    </div>
  )
}