import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Download, X } from 'lucide-react'
import App from './App.jsx'
import './style.css'

function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null)
  const [installed, setInstalled] = useState(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true)
  const [dismissed, setDismissed] = useState(false)
  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
  const isSafari = /^((?!chrome|crios|fxios|edgios|opios).)*safari/i.test(window.navigator.userAgent)

  useEffect(() => {
    const onPrompt = event => { event.preventDefault(); setPromptEvent(event) }
    const onInstalled = () => { setInstalled(true); setPromptEvent(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    if (!promptEvent) return
    await promptEvent.prompt()
    await promptEvent.userChoice
    setPromptEvent(null)
  }

  if (installed || dismissed) return null
  return (
    <aside className="install-prompt" aria-label="Instalar NINA">
      <div><strong>Instala NINA en tu dispositivo</strong><small>{isIOS ? 'En Safari: pulsa Compartir y luego “Añadir a pantalla de inicio”.' : 'Ábrela desde tu pantalla de inicio como una aplicación.'}</small></div>
      {promptEvent ? <button onClick={install}><Download size={16}/> Instalar</button> : isIOS && !isSafari ? <span className="install-hint">Abre este enlace en Safari para instalar NINA.</span> : <span className="install-hint">{isIOS ? 'Compartir · Añadir a pantalla de inicio' : 'Menú del navegador · Añadir a pantalla de inicio'}</span>}
      <button className="install-close" aria-label="Cerrar" onClick={() => setDismissed(true)}><X size={16}/></button>
    </aside>
  )
}

const isNativeApp = Boolean(window.Capacitor?.isNativePlatform?.())
if (!isNativeApp && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/nina/sw.js').catch(error => console.warn('NINA offline shell:', error))
  })
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode><><App /><InstallPrompt /></></React.StrictMode>
)
