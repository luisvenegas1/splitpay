import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button/Button'
import styles from './Register.module.css'

export default function Register() {
  const { user, signUp } = useAuth()
  const navigate = useNavigate()

  const [name, setName]         = useState('')
  const [phone, setPhone]       = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!name.trim()) { setError('El nombre es obligatorio.'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }

    setLoading(true)
    try {
      await signUp({ email, password, name: name.trim(), phone: phone.trim() || null })
      navigate('/dashboard')
    } catch (err) {
      setError(err?.message ?? 'Error al crear la cuenta. Intentá de nuevo.')
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

        <h1 className={styles.title}>Crear cuenta</h1>
        <p className={styles.subtitle}>Registrá tu cuenta para gestionar tus cuentas compartidas.</p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>Nombre completo *</label>
            <input
              id="name"
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="María García"
              required
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="phone" className={styles.label}>Teléfono / SINPE Móvil</label>
            <input
              id="phone"
              type="tel"
              className={styles.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="88001234"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>Correo electrónico *</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Contraseña *</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              autoComplete="new-password"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="confirm" className={styles.label}>Confirmar contraseña *</label>
            <input
              id="confirm"
              type="password"
              className={styles.input}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repetir contraseña"
              required
              autoComplete="new-password"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <Button type="submit" fullWidth loading={loading}>
            Crear cuenta
          </Button>
        </form>

        <p className={styles.loginLink}>
          ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
        </p>
      </div>
    </div>
  )
}
