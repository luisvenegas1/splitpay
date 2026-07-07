import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '@/components/Layout/Layout'
import Spinner from '@/components/ui/Spinner/Spinner'
import Badge from '@/components/ui/Badge/Badge'
import PaymentProgressBar from '@/components/PaymentProgressBar/PaymentProgressBar'
import InvoiceViewer from '@/components/InvoiceViewer/InvoiceViewer'
import ParticipantTable from '@/components/ParticipantTable/ParticipantTable'
import Calculator from '@/components/Calculator/Calculator'
import { useEvent } from '@/hooks/useEvent'
import { formatCRC, formatDate } from '@/utils/format'
import styles from './EventDetail.module.css'

const statusConfig = {
  active: { label: 'Activo',  variant: 'accent' },
  closed: { label: 'Cerrado', variant: 'default' },
}

export default function EventDetail() {
  const { slug } = useParams()
  const { event, loading, error } = useEvent(slug)
  const [copied, setCopied] = useState(false)

  if (loading) {
    return (
      <Layout>
        <Spinner />
      </Layout>
    )
  }

  if (error || !event) {
    return (
      <Layout>
        <div className={styles.errorState}>
          <h2>Evento no encontrado</h2>
          <p>El enlace puede estar incorrecto o el evento fue eliminado.</p>
          <Link to="/" className={styles.backLink}>← Volver al inicio</Link>
        </div>
      </Layout>
    )
  }

  const status = statusConfig[event.status] ?? statusConfig.active

  function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: event.name, url })
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  return (
    <Layout>
      <div className={`${styles.page} container`}>

        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <Link to="/" className={styles.breadcrumbLink}>Inicio</Link>
          <span className={styles.breadcrumbSep}>›</span>
          <span>{event.name}</span>
        </nav>

        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>{event.name}</h1>
                <Badge variant={status.variant}>{status.label}</Badge>
                <button className={styles.shareBtn} onClick={handleShare} title="Compartir evento">
                  {copied ? '✅ Copiado' : '🔗 Compartir'}
                </button>
              </div>
              <p className={styles.date}>{formatDate(event.date)}</p>
            </div>
            <div className={styles.totalBox}>
              <span className={styles.totalLabel}>Total del evento</span>
              <span className={styles.totalAmount}>{formatCRC(event.total_amount)}</span>
            </div>
          </div>

          {event.description && (
            <p className={styles.description}>{event.description}</p>
          )}
        </header>

        {/* Grid de contenido */}
        <div className={styles.grid}>

          {/* Columna principal */}
          <div className={styles.main}>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Participantes</h2>
              <ParticipantTable participants={event.participants ?? []} />
            </section>

            {event.event_items?.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Detalle de ítems</h2>
                <div className={styles.itemsTable}>
                  <div className={styles.itemsScroll}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Descripción</th>
                          <th className={styles.right}>Cant.</th>
                          <th className={`${styles.right} ${styles.colHideMobile}`}>Precio unit.</th>
                          <th className={styles.right}>Con IV</th>
                        </tr>
                      </thead>
                      <tbody>
                        {event.event_items.map((item) => (
                          <tr key={item.id}>
                            <td>{item.description}</td>
                            <td className={styles.right}>{item.quantity}</td>
                            <td className={`${styles.right} ${styles.colHideMobile}`}>{formatCRC(item.unit_price)}</td>
                            <td className={`${styles.right} ${styles.bold}`}>
                              {formatCRC(item.price_with_iv)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Columna lateral */}
          <aside className={styles.aside}>
            <PaymentProgressBar participants={event.participants ?? []} />

            {/* Card de impuestos */}
            <div className={styles.taxCard}>
              <h3 className={styles.taxTitle}>Impuestos aplicados</h3>
              <div className={styles.taxRow}>
                <span className={styles.taxLabel}>Impuesto de ventas (IV)</span>
                <span className={styles.taxValue}>{((event.iv_rate ?? 0.13) * 100).toFixed(0)}%</span>
              </div>
              <div className={styles.taxRow}>
                <span className={styles.taxLabel}>Servicio</span>
                <span className={styles.taxValue}>{((event.service_tax_rate ?? 0.10) * 100).toFixed(0)}%</span>
              </div>
              <div className={`${styles.taxRow} ${styles.taxTotal}`}>
                <span className={styles.taxLabel}>Total impuestos</span>
                <span className={styles.taxValue}>
                  {(((event.iv_rate ?? 0.13) + (event.service_tax_rate ?? 0.10)) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <InvoiceViewer invoices={event.invoices ?? []} />
          </aside>

          {/* Calculadora — siempre al final en móvil */}
          <div className={styles.calcWrapper}>
            <Calculator />
          </div>

        </div>
      </div>
    </Layout>
  )
}
