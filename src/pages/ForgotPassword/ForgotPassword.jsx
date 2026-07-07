import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import Button from '@/components/ui/Button/Button'
import styles from './ForgotPassword.module.css'

export default function ForgotPassword() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (err) throw err
      setSent(true)
    } catch (err) {
      setError('No se pudo enviar el correo. Verificá la dirección ingresada.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoArea}>
          <span className={styles.logoIcon}>⚡</span>
          <span className={styles.logoText}>SplitPay</span>
        </div>

        <h1 className={styles.title}>Recuperar contraseña</h1>

        {sent ? (
          <div className={styles.successBox}>
            <div className={styles.successIcon}>📧</div>
            <p className={styles.successMsg}>
              Te enviamos un correo a <strong>{email}</strong> con el enlace para restablecer tu contraseña.
            </p>
            <p className={styles.successSub}>Revisá también la carpeta de spam.</p>
            <Link to="/login" className={styles.backLink}>← Volver al login</Link>
          </div>
        ) : (
          <>
            <p className={styles.subtitle}>
              Ingresá tu correo y te enviamos un enlace para crear una nueva contraseña.
            </p>
            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  autoFocus
                />
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <Button type="submit" fullWidth loading={loading}>
                Enviar enlace
              </Button>
            </form>
            <p className={styles.backRow}>
              <Link to="/login" className={styles.backLink}>← Volver al login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
