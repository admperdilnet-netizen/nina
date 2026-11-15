import { useEffect, useRef, useState } from 'react'
import { Clapperboard, Mic2, Play, Pause, Upload, Volume2, VolumeX, Sparkles, Settings2, MessageCircle, Captions, Move, Download, Radio, WandSparkles, UserRound, Users, Shirt, Scissors } from 'lucide-react'

const MODES = [
  { id: 'commentator', name: 'Comentarista automático', detail: 'Hace comentarios breves sobre el vídeo completo.', icon: MessageCircle },
]

const CHARACTERS = [
  {id:'luna',name:'Luna',gender:'Mujer',initials:'LU',skin:'#c98568',hair:'#21151a',outfit:'#17151e',style:'Glamour',hairStyles:['Largo ondulado','Liso largo','Coleta alta','Bob moderno','Rizos definidos']},
  {id:'sofia',name:'Sofía',gender:'Mujer',initials:'SO',skin:'#e0ad88',hair:'#3b211b',outfit:'#a52d55',style:'Elegante',hairStyles:['Liso largo','Trenzas','Afro natural','Bob moderno','Coleta alta']},
  {id:'camila',name:'Camila',gender:'Mujer',initials:'CA',skin:'#8c573f',hair:'#100e0e',outfit:'#e0a52d',style:'Urbano',hairStyles:['Afro natural','Rizos definidos','Trenzas','Corto rizado','Largo ondulado']},
  {id:'valentina',name:'Valentina',gender:'Mujer',initials:'VA',skin:'#f0c4a4',hair:'#a66a36',outfit:'#4d79a8',style:'Casual',hairStyles:['Bob moderno','Liso largo','Coleta alta','Corto rizado','Largo ondulado']},
  {id:'yara',name:'Yara',gender:'Mujer',initials:'YA',skin:'#6e4435',hair:'#17100f',outfit:'#7d3f91',style:'Artístico',hairStyles:['Afro natural','Trenzas','Rizos definidos','Corto rizado','Coleta alta']},
  {id:'isabela',name:'Isabela',gender:'Mujer',initials:'IS',skin:'#d99b7b',hair:'#4c2c20',outfit:'#247c72',style:'Clásico',hairStyles:['Largo ondulado','Liso largo','Bob moderno','Trenzas','Coleta alta']},
  {id:'mateo',name:'Mateo',gender:'Hombre',initials:'MA',skin:'#bd8062',hair:'#171313',outfit:'#253e65',style:'Elegante',hairStyles:['Degradado','Rizos cortos','Clásico peinado','Trenzas cortas','Rapado']},
  {id:'gabriel',name:'Gabriel',gender:'Hombre',initials:'GA',skin:'#e0b18c',hair:'#513426',outfit:'#854052',style:'Casual',hairStyles:['Clásico peinado','Degradado','Rizos cortos','Largo recogido','Rapado']},
  {id:'dylan',name:'Dylan',gender:'Hombre',initials:'DY',skin:'#87533e',hair:'#111010',outfit:'#c17b28',style:'Urbano',hairStyles:['Degradado','Afro corto','Trenzas cortas','Rapado','Rizos cortos']},
  {id:'sebastian',name:'Sebastián',gender:'Hombre',initials:'SE',skin:'#f0c4a2',hair:'#a66e3e',outfit:'#356f69',style:'Moderno',hairStyles:['Largo recogido','Clásico peinado','Degradado','Rizos cortos','Rapado']},
  {id:'enzo',name:'Enzo',gender:'Hombre',initials:'EN',skin:'#9c6249',hair:'#1c1715',outfit:'#68468b',style:'Artístico',hairStyles:['Afro corto','Trenzas cortas','Degradado','Rapado','Rizos cortos']},
  {id:'nicolas',name:'Nicolás',gender:'Hombre',initials:'NI',skin:'#d49a79',hair:'#39251d',outfit:'#9a3941',style:'Clásico',hairStyles:['Clásico peinado','Largo recogido','Degradado','Rapado','Rizos cortos']},
]
const OUTFITS = ['Elegante','Casual','Urbano','Glamour','Deportivo','Formal','Tropical','Artístico']
const OUTFIT_COLORS = {Elegante:'#263c66',Casual:'#477d70',Urbano:'#b27627',Glamour:'#a52d55',Deportivo:'#287b9a',Formal:'#403d62',Tropical:'#d18b25',Artístico:'#784b91'}
const HAIR_STYLES = ['Largo ondulado','Liso largo','Coleta alta','Bob moderno','Rizos definidos','Afro natural','Trenzas','Corto rizado','Degradado','Rizos cortos','Clásico peinado','Trenzas cortas','Rapado','Largo recogido','Afro corto']

export default function App() {
  const [mode, setMode] = useState('auto')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoName, setVideoName] = useState('')
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [avatarVisible, setAvatarVisible] = useState(true)
  const [avatarSize, setAvatarSize] = useState(34)
  const [avatarPosition, setAvatarPosition] = useState('right')
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [engineStatus, setEngineStatus] = useState('Comprobando motor local…')
  const [engineReady, setEngineReady] = useState(false)
  const [commentInterval, setCommentInterval] = useState(60)
  const [localVideoId, setLocalVideoId] = useState('')
  const [status, setStatus] = useState('Lista para comenzar')
  const [genderFilter, setGenderFilter] = useState('Todos')
  const [characterId, setCharacterId] = useState('luna')
  const [outfit, setOutfit] = useState('Glamour')
  const [hairStyle, setHairStyle] = useState('Largo ondulado')
  const videoRef = useRef(null)
  const fileRef = useRef(null)
  const character = CHARACTERS.find(c => c.id === characterId) || CHARACTERS[0]

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted, videoUrl])

  useEffect(() => {
    fetch('http://127.0.0.1:8765/health')
      .then(r => { if (!r.ok) throw new Error('offline'); return r.json() })
      .then(data => {
        setEngineReady(true)
        setEngineStatus(data.ffmpeg_ready ? 'Motor local conectado · FFmpeg listo' : 'Motor conectado · falta FFmpeg')
      })
      .catch(() => {
        setEngineReady(false)
        setEngineStatus('Motor local desconectado · inicia NINA en tu PC')
      })
  }, [])

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl) }, [videoUrl])

  async function loadVideo(file) {
    if (!file || !file.type.startsWith('video/')) {
      setStatus('Selecciona un archivo de vídeo válido.')
      return
    }
    setVideoUrl(URL.createObjectURL(file))
    setVideoName(file.name)
    setPlaying(false)
    setLocalVideoId('')
    setStatus('Vídeo cargado. Conectando con el motor local…')
    try {
      const form = new FormData()
      form.append('file', file)
      const response = await fetch('http://127.0.0.1:8765/upload', { method: 'POST', body: form })
      if (!response.ok) throw new Error('No se pudo enviar el vídeo al motor local.')
      const result = await response.json()
      setLocalVideoId(result.video_id)
      setStatus('Vídeo completo guardado en tu PC · listo para preparar')
    } catch {
      setStatus('Vista previa cargada. Inicia NINA Local Engine para procesar en tu PC.')
    }
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

  function chooseCharacter(c) {
    setCharacterId(c.id)
    setOutfit(c.style)
    setHairStyle(c.hairStyles[0])
    setStatus(`Personaje seleccionado: ${c.name}`)
  }

  function toggleVoice() {
    const next = !voiceEnabled
    setVoiceEnabled(next)
    setStatus(next ? 'Voz de NINA: pendiente de conectar el motor de voz dominicana.' : 'Voz desactivada.')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="NINA inicio"><span className="brand-mark">N</span><span>NINA</span></a>
        <div className="topbar-center"><span className="live-dot" /> PRESENTADORA VIRTUAL DOMINICANA</div>
        <div className="topbar-right"><span className="status-pill"><span className="tiny-dot" /> {status}</span></div>
      </header>
      <main className="workspace">
        <section className="intro">
          <div><p className="eyebrow"><Sparkles size={14} /> TU ESTUDIO DE PERSONAJES E HISTORIAS</p><h1>Hola, soy <span>NINA.</span></h1><p className="intro-copy">Elige un presentador. NINA conservará tu vídeo completo y añadirá comentarios y reacciones para YouTube.</p></div>
          <div className="intro-tag"><Radio size={16} /> ESTUDIO PERSONAL</div>
        </section>
        <div className="studio-grid">
          <section className="video-column">
            <div className="section-heading"><div><span className="step-number">01</span><div><h2>Tu vídeo</h2><p>Sube un vídeo desde tu computadora</p></div></div><button className="secondary-button" onClick={() => fileRef.current?.click()}><Upload size={16} /> Subir vídeo</button><input ref={fileRef} type="file" accept="video/*" hidden onChange={e => loadVideo(e.target.files?.[0])} /></div>
            <div className="video-stage">
              {videoUrl ? <video ref={videoRef} src={videoUrl} muted={muted} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} controls={false} playsInline /> : <button className="empty-upload" onClick={() => fileRef.current?.click()}><span className="upload-icon"><Upload size={25} /></span><strong>Arrastra tu vídeo aquí</strong><span>o pulsa para buscarlo en tu PC</span><small>MP4 · WebM · MOV</small></button>}
              {videoUrl && avatarVisible && <div className={`avatar-overlay ${avatarPosition}`} style={{'--avatar-size': `${avatarSize}%`, '--skin': character.skin, '--hair': character.hair, '--outfit': OUTFIT_COLORS[outfit] || character.outfit}}><div className={`avatar-placeholder hair-${hairStyle.toLowerCase().replaceAll(' ','-')}`}><div className="avatar-hair" /><div className="avatar-face"><span className="eye left-eye" /><span className="eye right-eye" /><span className="mouth" /></div><div className="avatar-body"><span className="neck" /><span className="jacket left-jacket" /><span className="jacket right-jacket" /></div></div><span className="avatar-label">{character.name.toUpperCase()} <i>•</i> {outfit}</span></div>}
              {videoUrl && <div className="video-controls"><button onClick={togglePlay} aria-label={playing ? 'Pausar' : 'Reproducir'}>{playing ? <Pause size={19} /> : <Play size={19} />}</button><span>{videoName}</span></div>}
            </div>
            <div className="video-tools"><button className="tool-button" onClick={() => setAvatarVisible(v => !v)}><Move size={16} /> {avatarVisible ? 'Ocultar personaje' : 'Mostrar personaje'}</button><button className="tool-button" onClick={() => setAvatarPosition(p => p === 'right' ? 'left' : 'right')}>⇄ Cambiar lado</button><button className="tool-button" onClick={() => setMuted(v => !v)}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />} {muted ? 'Activar sonido' : 'Silenciar vista'}</button><div className="size-control"><span>Tamaño</span><input type="range" min="20" max="55" value={avatarSize} onChange={e => setAvatarSize(Number(e.target.value))} /></div></div>
            {videoUrl && <div className="file-loaded"><span className="file-check">✓</span><span>{videoName}</span><button onClick={() => { setVideoUrl(''); setVideoName(''); setPlaying(false) }}>Quitar</button></div>}
            <section className="panel character-panel">
              <div className="panel-heading"><div><span className="step-number">02</span><div><h2>Elige tu personaje</h2><p>12 personajes iniciales: mujeres y hombres</p></div></div><Users size={19} /></div>
              <div className="gender-filter">{['Todos','Mujer','Hombre'].map(g => <button key={g} className={genderFilter===g?'active':''} onClick={()=>setGenderFilter(g)}>{g==='Todos'?'Todos':g==='Mujer'?'Mujeres':'Hombres'}</button>)}</div>
              <div className="character-grid">{CHARACTERS.filter(c=>genderFilter==='Todos'||c.gender===genderFilter).map(c=><button key={c.id} className={`character-card ${characterId===c.id?'chosen':''}`} onClick={()=>chooseCharacter(c)}><span className="character-portrait" style={{'--skin':c.skin,'--hair':c.hair,'--outfit':c.outfit}}><i className="portrait-hair"/><i className="portrait-face"/><i className="portrait-body"/></span><strong>{c.name}</strong><small>{c.gender}</small></button>)}</div>
              <div className="customize-row"><label><span><Shirt size={14}/> Vestimenta</span><select value={outfit} onChange={e=>setOutfit(e.target.value)}>{OUTFITS.map(x=><option key={x}>{x}</option>)}</select></label><label><span><Scissors size={14}/> Corte / peinado</span><select value={hairStyle} onChange={e=>setHairStyle(e.target.value)}>{HAIR_STYLES.map(x=><option key={x}>{x}</option>)}</select></label></div>
              <p className="microcopy">Esta biblioteca es la primera selección visual. La personalización avanzada de ropa y cabello se ampliará con modelos animados reales.</p>
            </section>
          </section>
          <aside className="side-column">
            <section className="panel mode-panel"><div className="panel-heading"><div><span className="step-number">03</span><div><h2>Modo de actuación</h2><p>¿Cómo quieres que participe?</p></div></div><Settings2 size={18}/></div><div className="mode-list">{MODES.map(({id,name,detail,icon:Icon})=><button key={id} className={`mode-option ${mode===id?'selected':''}`} onClick={()=>{setMode(id);setStatus(`Modo seleccionado: ${name}`)}}><span className="mode-icon"><Icon size={18}/></span><span className="mode-text"><strong>{name}</strong><small>{detail}</small></span><span className="radio-mark">{mode===id?'✓':''}</span></button>)}</div></section>
            <section className="panel voice-panel">
              <div className="panel-heading"><div><span className="step-number">04</span><div><h2>Comentarios automáticos</h2><p>Un solo vídeo completo · sin recortes</p></div></div><Mic2 size={19}/></div>
              <div className="voice-card"><div className="voice-orb"><Mic2 size={20}/></div><div className="voice-copy"><strong>Voz según el personaje</strong><small>{character.gender === 'Mujer' ? 'Voz femenina dominicana' : 'Voz masculina dominicana'} · selección automática</small></div><span className="soon-tag">MOTOR EN DESARROLLO</span></div>
              <label className="comment-frequency"><span>Frecuencia de comentarios</span><strong>Cada {commentInterval} segundos</strong><input type="range" min="20" max="180" step="10" value={commentInterval} onChange={e=>setCommentInterval(Number(e.target.value))}/></label>
              <p className="microcopy">NINA conservará el vídeo entero y añadirá comentarios breves cuando haya algo interesante que comentar. La voz, el análisis de escenas y las expresiones todavía requieren integración.</p>
            </section>
            <section className="panel export-panel"><div className="panel-heading"><div><span className="step-number">05</span><div><h2>Vídeo final para YouTube</h2><p>Vídeo completo con personaje y comentarios</p></div></div><Download size={18}/></div><div className="export-preview"><div className="checker"><span className="mini-avatar">N</span></div><div><strong>WebM transparente</strong><small>También estudiaremos MOV ProRes 4444</small></div></div><button className="export-button" disabled><Download size={16}/> Exportación aún no conectada</button><p className="microcopy">{engineStatus}{localVideoId ? ' · archivo recibido localmente' : ''}</p></section>
          </aside>
        </div>
        <footer className="footer-note"><span>✦</span> NINA incluye ahora una biblioteca seleccionable de personajes y estilos. Las voces, animación real, análisis de escenas y exportación todavía están pendientes de integración.</footer>
      </main>
    </div>
  )
}
