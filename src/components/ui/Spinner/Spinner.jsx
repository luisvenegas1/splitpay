import styles from './Spinner.module.css'

export default function Spinner({ size = 'md', label = 'Cargando...' }) {
  return (
    <div className={styles.wrapper} role="status" aria-label={label}>
      <span className={`${styles.spinner} ${styles[size]}`} />
    </div>
  )
}
