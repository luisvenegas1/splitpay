import { useEffect, useState } from 'react'
import styles from './InstallModal.module.css'

function detectPlatform() {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'other'
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
}

export default function InstallModal({ onClose }) {
  const platform = detectPlatform()

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        <div className={styles.icon}>📲</div>
        <h2 className={styles.title}>Agregar a pantalla de inicio</h2>
        <p className={styles.subtitle}>
          Usá SplitPay como una app nativa, sin abrir el navegador.
        </p>

        {platform === 'ios' && (
          <ol className={styles.steps}>
            <li>
              <span className={styles.stepIcon}>1</span>
              <span>Tocá el botón <strong>Compartir</strong> en Safari <span className={styles.emoji}>⎙</span></span>
            </li>
            <li>
              <span className={styles.stepIcon}>2</span>
              <span>Seleccioná <strong>"Agregar a pantalla de inicio"</strong></span>
            </li>
            <li>
              <span className={styles.stepIcon}>3</span>
              <span>Tocá <strong>"Agregar"</strong> en la esquina superior derecha</span>
            </li>
          </ol>
        )}

        {platform === 'android' && (
          <ol className={styles.steps}>
            <li>
              <span className={styles.stepIcon}>1</span>
              <span>Tocá el menú <strong>⋮</strong> en Chrome (arriba a la derecha)</span>
            </li>
            <li>
              <span className={styles.stepIcon}>2</span>
              <span>Seleccioná <strong>"Agregar a pantalla de inicio"</strong></span>
            </li>
            <li>
              <span className={styles.stepIcon}>3</span>
              <span>Tocá <strong>"Agregar"</strong> para confirmar</span>
            </li>
          </ol>
        )}

        {platform === 'other' && (
          <div className={styles.other}>
            <p>En <strong>iPhone / iPad</strong>: Safari → botón Compartir ⎙ → "Agregar a pantalla de inicio"</p>
            <p>En <strong>Android</strong>: Chrome → menú ⋮ → "Agregar a pantalla de inicio"</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function InstallLink() {
  const [open, setOpen] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Solo mostrar si no está ya instalada como app
    if (!isStandalone()) setShow(true)
  }, [])

  if (!show) return null

  return (
    <>
      <button className={styles.footerLink} onClick={() => setOpen(true)}>
        📲 Instalar app
      </button>
      {open && <InstallModal onClose={() => setOpen(false)} />}
    </>
  )
}
