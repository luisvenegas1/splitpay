import { Link } from 'react-router-dom'
import Badge from '@/components/ui/Badge/Badge'
import { formatCRC, formatDate } from '@/utils/format'
import styles from './EventCard.module.css'

const statusConfig = {
  active:  { label: 'Activo',  variant: 'accent' },
  closed:  { label: 'Cerrado', variant: 'default' },
}

export default function EventCard({ event }) {
  const status = statusConfig[event.status] ?? statusConfig.active

  const paid = event.participants?.filter((p) => p.payment_status === 'paid').length ?? 0
  const total = event.participants?.length ?? 0

  return (
    <Link to={`/evento/${event.slug}`} className={styles.card}>
      <div className={styles.top}>
        <div>
          <h2 className={styles.name}>{event.name}</h2>
          <p className={styles.date}>{formatDate(event.date)}</p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      {event.description && (
        <p className={styles.description}>{event.description}</p>
      )}

      <div className={styles.footer}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total</span>
          <span className={styles.statValue}>{formatCRC(event.total_amount)}</span>
        </div>
        {total > 0 && (
          <div className={styles.stat}>
            <span className={styles.statLabel}>Pagos</span>
            <span className={styles.statValue}>
              {paid}/{total}
            </span>
          </div>
        )}
        <span className={styles.arrow}>→</span>
      </div>
    </Link>
  )
}
