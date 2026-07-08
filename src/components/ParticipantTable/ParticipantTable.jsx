import { Link } from 'react-router-dom'
import Badge from '@/components/ui/Badge/Badge'
import { formatCRC, formatDate } from '@/utils/format'
import styles from './ParticipantTable.module.css'

const statusConfig = {
  pending: { label: 'Pendiente', variant: 'danger' },
  partial: { label: 'Parcial',   variant: 'warning' },
  paid:    { label: 'Pagado',    variant: 'success' },
}

export default function ParticipantTable({ participants = [], showLink = true }) {
  if (participants.length === 0) {
    return (
      <div className={styles.empty}>
        No hay participantes registrados aún.
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th className={styles.right}>Monto</th>
              <th>Estado</th>
              <th className={styles.colDate}>Fecha de pago</th>
              <th className={styles.colMethod}>Método</th>
              {showLink && <th />}
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => {
              const status = statusConfig[p.payment_status] ?? statusConfig.pending
              if (p.is_payer) {
                return (
                  <tr key={p.id} className={`${styles.row} ${styles.rowPayer}`}>
                    <td className={styles.name}>
                      {p.name} <span className={styles.payerTag}>💰 Puso la plata</span>
                    </td>
                    <td className={`${styles.amount} ${styles.right} ${styles.payerAmount}`}>—</td>
                    <td><Badge variant="success">Pagó</Badge></td>
                    <td className={`${styles.secondary} ${styles.colDate}`}>—</td>
                    <td className={`${styles.secondary} ${styles.colMethod}`}>—</td>
                    {showLink && (
                      <td>
                        <Link to={`/pago/${p.payment_token}`} className={styles.link}>Ver →</Link>
                      </td>
                    )}
                  </tr>
                )
              }

              return (
                <tr key={p.id} className={styles.row}>
                  <td className={styles.name}>{p.name}</td>
                  <td className={`${styles.amount} ${styles.right}`}>
                    {formatCRC(p.amount_owed)}
                  </td>
                  <td>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </td>
                  <td className={`${styles.secondary} ${styles.colDate}`}>
                    {p.payment_date ? formatDate(p.payment_date) : '—'}
                  </td>
                  <td className={`${styles.secondary} ${styles.colMethod}`}>{p.payment_method ?? '—'}</td>
                  {showLink && (
                    <td>
                      <Link
                        to={`/pago/${p.payment_token}`}
                        className={styles.link}
                        title="Ver enlace personal"
                      >
                        Ver →
                      </Link>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
