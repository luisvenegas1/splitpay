import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button/Button'
import styles from './Login.module.css'

export default function Login() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Si ya está autenticado, redirigir al dashboard
  if (user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn({ email, password })
      navigate('/dashboard')
    } catch (err) {
      setError('Credenciales incorrectas. Verificá tu email y contraseña.')
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

        <h1 className={styles.title}>Iniciar sesión</h1>
        <p className={styles.subtitle}>Ingresá para gestionar tus eventos y cobros.</p>

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
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Contraseña</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <Button type="submit" fullWidth loading={loading}>
            Iniciar sesión
          </Button>
        </form>

        <p className={styles.registerLink}>
          ¿No tenés cuenta? <Link to="/registro">Registrate gratis</Link>
        </p>
      </div>
    </div>
  )
}
