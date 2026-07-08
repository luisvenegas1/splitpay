import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button/Button'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const displayName = profile?.name || user?.email?.split('@')[0] || ''

  return (
    <header className={styles.header}>
      <nav className={`${styles.nav} container`}>
        <Link to="/" className={styles.logo}>
          <img src="/logo.svg" alt="SplitPay" className={styles.logoImg} />
        </Link>

        <div className={styles.actions}>
          {user ? (
            <>
              <Link to="/dashboard" className={styles.navLink}>
                Dashboard
              </Link>
              <Link to="/perfil" className={styles.profileLink}>
                <span className={styles.profileAvatar}>
                  {displayName.charAt(0).toUpperCase()}
                </span>
                <span className={styles.profileName}>{displayName}</span>
              </Link>
              <Button variant="secondary" size="sm" onClick={handleSignOut}>
                Salir
              </Button>
            </>
          ) : (
            <>
              <Link to="/registro" className={styles.navLink}>
                Registrarse
              </Link>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/login')}
              >
                Iniciar sesión
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
