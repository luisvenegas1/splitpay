import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import Button from '@/components/ui/Button/Button'
import styles from './ResetPassword.module.css'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPwd, setShowPwd]     = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [ready, setReady]         = useState(false)

  useEffect(() => {
    // Supabase redirige con #access_token en el hash — lo procesa automáticamente
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }

    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      navigate('/dashboard')
    } catch (err) {
      setError('No se pudo actualizar la contraseña. El enlace puede haber expirado.')
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

        <h1 className={styles.title}>Nueva contraseña</h1>

        {!ready ? (
          <p className={styles.subtitle}>Verificando enlace...</p>
        ) : (
          <>
            <p className={styles.subtitle}>Ingresá tu nueva contraseña.</p>
            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              <div className={styles.field}>
                <label htmlFor="password" className={styles.label}>Nueva contraseña</label>
                <div className={styles.passwordWrap}>
                  <input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    className={styles.input}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPwd((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPwd ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="confirm" className={styles.label}>Confirmar contraseña</label>
                <div className={styles.passwordWrap}>
                  <input
                    id="confirm"
                    type={showPwd ? 'text' : 'password'}
                    className={styles.input}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repetir contraseña"
                    required
                  />
                </div>
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <Button type="submit" fullWidth loading={loading}>
                Guardar contraseña
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
