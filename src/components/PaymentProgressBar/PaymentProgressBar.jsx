import { formatCRC } from '@/utils/format'
import styles from './PaymentProgressBar.module.css'

export default function PaymentProgressBar({ participants = [] }) {
  const total = participants.length
  const paid = participants.filter((p) => p.payment_status === 'paid').length
  const partial = participants.filter((p) => p.payment_status === 'partial').length
  const pending = total - paid - partial

  const paidPct = total ? (paid / total) * 100 : 0
  const partialPct = total ? (partial / total) * 100 : 0

  const totalAmount = participants.reduce((s, p) => s + (p.amount_owed ?? 0), 0)
  const collectedAmount = participants
    .filter((p) => p.payment_status === 'paid')
    .reduce((s, p) => s + (p.amount_owed ?? 0), 0)

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.label}>Progreso de cobros</span>
        <span className={styles.amount}>
          {formatCRC(collectedAmount)}{' '}
          <span className={styles.amountTotal}>/ {formatCRC(totalAmount)}</span>
        </span>
      </div>

      <div className={styles.bar}>
        <div
          className={`${styles.fill} ${styles.paid}`}
          style={{ width: `${paidPct}%` }}
        />
        <div
          className={`${styles.fill} ${styles.partial}`}
          style={{ width: `${partialPct}%` }}
        />
      </div>

      <div className={styles.legend}>
        <span className={`${styles.dot} ${styles.dotPaid}`} />
        <span className={styles.legendText}>Pagado ({paid})</span>
        {partial > 0 && (
          <>
            <span className={`${styles.dot} ${styles.dotPartial}`} />
            <span className={styles.legendText}>Parcial ({partial})</span>
          </>
        )}
        <span className={`${styles.dot} ${styles.dotPending}`} />
        <span className={styles.legendText}>Pendiente ({pending})</span>
      </div>
    </div>
  )
}
