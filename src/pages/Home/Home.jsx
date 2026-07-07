import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Layout from '@/components/Layout/Layout'
import Button from '@/components/ui/Button/Button'
import styles from './Home.module.css'

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Usuarios autenticados van directo al dashboard
  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user])

  return (
    <Layout>
      <section className={styles.hero}>
        <div className={`${styles.heroInner} container`}>
          <div className={styles.badge}>✦ Cuentas compartidas</div>
          <h1 className={styles.title}>
            Pagá vos,<br />cobrales después.
          </h1>
          <p className={styles.subtitle}>
            Dividí facturas y gastos compartidos entre amigos, familia o compañeros.
            Cada quien ve exactamente cuánto debe y puede registrar su pago al instante.
          </p>

          <div className={styles.ctaRow}>
            <Button size="lg" onClick={() => navigate('/registro')}>
              Crear cuenta gratis
            </Button>
            <Link to="/login" className={styles.loginLink}>
              Ya tengo cuenta →
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={`${styles.features} container`}>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>🧾</span>
            <h3 className={styles.featureTitle}>Cargá la factura</h3>
            <p className={styles.featureDesc}>
              Ingresá los ítems de la factura y asignales a cada persona exactamente lo que consumió.
            </p>
          </div>
          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>🔗</span>
            <h3 className={styles.featureTitle}>Compartí el link</h3>
            <p className={styles.featureDesc}>
              Cada participante recibe un link personal con su monto y la info de pago.
            </p>
          </div>
          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>✅</span>
            <h3 className={styles.featureTitle}>Confirmá los pagos</h3>
            <p className={styles.featureDesc}>
              Los participantes registran su pago y vos aprobás o rechazás desde el dashboard.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  )
}
