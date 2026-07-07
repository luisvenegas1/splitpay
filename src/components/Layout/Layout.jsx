import Navbar from '@/components/Navbar/Navbar'
import styles from './Layout.module.css'

const VERSION = '1.0.0'
const WA_LINK = 'https://wa.me/50688238325'
const YEAR    = new Date().getFullYear()

export default function Layout({ children }) {
  return (
    <div className={styles.root}>
      <Navbar />
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <span>© {YEAR} SplitPay. Todos los derechos reservados.</span>
        <span className={styles.sep}>·</span>
        <span>
          Desarrollado por{' '}
          <a href={WA_LINK} target="_blank" rel="noopener noreferrer">
            Luis Diego Venegas
          </a>
        </span>
        <span className={styles.sep}>·</span>
        <span className={styles.version}>v{VERSION}</span>
      </footer>
    </div>
  )
}
