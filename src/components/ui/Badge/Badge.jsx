import styles from './Badge.module.css'

/**
 * variant: 'default' | 'success' | 'warning' | 'danger' | 'accent'
 */
export default function Badge({ children, variant = 'default' }) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {children}
    </span>
  )
}
