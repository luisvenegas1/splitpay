import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout/Layout'
import Button from '@/components/ui/Button/Button'
import Badge from '@/components/ui/Badge/Badge'
import Spinner from '@/components/ui/Spinner/Spinner'
import Modal from '@/components/ui/Modal/Modal'
import EventForm from '@/components/EventForm/EventForm'
import { useAuth } from '@/context/AuthContext'
import { deleteEvent } from '@/services/events'
import { approvePayment, rejectPayment } from '@/services/participants'
import { supabase } from '@/lib/supabaseClient'
import { formatCRC, formatDate } from '@/utils/format'
import styles from './Dashboard.module.css'

const statusConfig = {
  active: { label: 'Activo',  variant: 'accent' },
  closed: { label: 'Cerrado', variant: 'default' },
}

const paymentStatusConfig = {
  pending:          { label: 'Pendiente',   variant: 'danger' },
  partial:          { label: 'Parcial',     variant: 'warning' },
  paid:             { label: 'Pagado',      variant: 'success' },
  pending_approval: { label: 'En revisión', variant: 'warning' },
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statLabel}>{label}</span>
      <span className={`${styles.statValue} ${color ? styles[color] : ''}`}>{value}</span>
      {sub && <span className={styles.statSub}>{sub}</span>}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()

  const [myEvents, setMyEvents]                 = useState([])
  const [participatedEvents, setParticipated]   = useState([])
  const [eventsLoading, setEventsLoading]       = useState(true)

  const [stats, setStats]           = useState(null)
  const [pendingPayments, setPending] = useState([])
  const [approvingId, setApprovingId] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)

  const [modalOpen, setModalOpen]   = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [showClosed, setShowClosed] = useState(false)

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!user) return
    loadAll()
  }, [user, refreshKey])

  async function loadAll() {
    setEventsLoading(true)
    try {
      await Promise.all([loadMyEvents(), loadParticipated(), loadStats(), loadPending()])
    } finally {
      setEventsLoading(false)
    }
  }

  async function loadMyEvents() {
    const { data } = await supabase
      .from('events')
      .select('id, name, slug, date, status, total_amount, owner_id')
      .eq('owner_id', user.id)
      .order('date', { ascending: false })
    setMyEvents(data ?? [])
  }

  async function loadParticipated() {
    // Eventos donde soy participante (user_id = user.id) pero no soy el owner
    const { data } = await supabase
      .from('participants')
      .select('id, name, amount_owed, payment_status, events(id, name, slug, date, status, total_amount, owner_id)')
      .eq('user_id', user.id)
    // filtrar los que yo no soy dueño
    const rows = (data ?? []).filter((p) => p.events?.owner_id !== user.id)
    setParticipated(rows)
  }

  async function loadStats() {
    // Solo eventos activos para stats relevantes
    const { data: parts } = await supabase
      .from('participants')
      .select('amount_owed, amount_paid, payment_status, events!inner(owner_id, status)')
      .eq('events.owner_id', user.id)
      .eq('events.status', 'active')

    const { data: evs } = await supabase
      .from('events')
      .select('id, status')
      .eq('owner_id', user.id)

    if (!parts) return
    let totalActive = 0, totalCollected = 0, totalPending = 0
    parts.forEach((p) => {
      totalActive    += parseFloat(p.amount_owed) || 0
      totalCollected += parseFloat(p.amount_paid) || 0
      totalPending   += Math.max((parseFloat(p.amount_owed) || 0) - (parseFloat(p.amount_paid) || 0), 0)
    })

    setStats({
      totalActive,
      totalCollected,
      totalPending,
      activeEvents: (evs ?? []).filter((e) => e.status === 'active').length,
      closedEvents: (evs ?? []).filter((e) => e.status === 'closed').length,
      totalParticipants: parts.length,
    })
  }

  async function loadPending() {
    const { data } = await supabase
      .from('participants')
      .select('id, name, amount_owed, amount_paid, payment_method, payment_date, notes, events!inner(name, slug, owner_id)')
      .eq('payment_status', 'pending_approval')
      .eq('events.owner_id', user.id)
      .order('payment_date', { ascending: false })
    setPending(data ?? [])
  }

  function openCreate() { setEditingEvent(null); setModalOpen(true) }
  function openEdit(ev) { setEditingEvent(ev); setModalOpen(true) }

  function handleFormSuccess() {
    setModalOpen(false)
    setEditingEvent(null)
    setRefreshKey((k) => k + 1)
  }

  async function handleApprove(p) {
    setApprovingId(p.id)
    try {
      await approvePayment(p.id, { amount_paid: p.amount_paid, amount_owed: p.amount_owed })
      setRefreshKey((k) => k + 1)
    } catch { alert('Error al aprobar el pago.') }
    finally { setApprovingId(null) }
  }

  async function confirmReject() {
    const p = rejectTarget
    if (!p) return
    setApprovingId(p.id)
    setRejectTarget(null)
    try {
      await rejectPayment(p.id, { previous_amount_paid: 0 })
      setRefreshKey((k) => k + 1)
    } catch { alert('Error al rechazar el pago.') }
    finally { setApprovingId(null) }
  }

  async function handleDelete(ev) {
    if (!window.confirm(`¿Eliminar "${ev.name}"? Esta acción no se puede deshacer.`)) return
    setDeletingId(ev.id)
    try {
      await deleteEvent(ev.id)
      setRefreshKey((k) => k + 1)
    } catch { alert('Error al eliminar el evento.') }
    finally { setDeletingId(null) }
  }

  return (
    <Layout>
      <div className={`${styles.page} container`}>

        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Dashboard</h1>
            <p className={styles.pageSubtitle}>Gestioná tus eventos y cobros.</p>
          </div>
          <Button onClick={openCreate} size="md">+ Nuevo evento</Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className={styles.statsGrid}>
            <StatCard label="Por cobrar"      value={formatCRC(stats.totalPending)}   color="warning" sub="Eventos activos" />
            <StatCard label="Ya cobrado"      value={formatCRC(stats.totalCollected)} color="success" sub="Eventos activos" />
            <StatCard label="Total en juego"  value={formatCRC(stats.totalActive)}    color="neutral" sub="Eventos activos" />
            <StatCard label="Eventos activos" value={stats.activeEvents} sub={`${stats.closedEvents} cerrados`} />
            <StatCard label="Participantes"   value={stats.totalParticipants} sub="En eventos activos" />
          </div>
        )}

        {/* Pagos por aprobar */}
        {pendingPayments.length > 0 && (
          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} ${styles.pendingTitle}`}>
              ⏳ Pagos por aprobar ({pendingPayments.length})
            </h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Participante</th>
                    <th>Evento</th>
                    <th>Fecha</th>
                    <th>Método</th>
                    <th className={styles.right}>Monto</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pendingPayments.map((p) => (
                    <tr key={p.id} className={styles.row}>
                      <td className={styles.bold}>{p.name}</td>
                      <td>
                        <Link to={`/evento/${p.events?.slug}`} className={styles.eventLink}>
                          {p.events?.name}
                        </Link>
                      </td>
                      <td className={styles.secondary}>{p.payment_date ? formatDate(p.payment_date) : '—'}</td>
                      <td className={styles.secondary}>{p.payment_method || '—'}</td>
                      <td className={`${styles.right} ${styles.bold}`}>{formatCRC(p.amount_paid)}</td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            className={`${styles.actionBtn} ${styles.approveBtn}`}
                            onClick={() => handleApprove(p)}
                            disabled={approvingId === p.id}
                            title="Aprobar"
                          >✓</button>
                          <button
                            className={`${styles.actionBtn} ${styles.danger}`}
                            onClick={() => setRejectTarget(p)}
                            disabled={approvingId === p.id}
                            title="Rechazar"
                          >✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Mis eventos */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Mis eventos</h2>
            {myEvents.some((ev) => ev.status === 'closed') && (
              <button
                className={styles.toggleBtn}
                onClick={() => setShowClosed((v) => !v)}
              >
                {showClosed ? '🙈 Ocultar anteriores' : '🕐 Ver eventos anteriores'}
              </button>
            )}
          </div>

          {eventsLoading && <Spinner />}

          {!eventsLoading && myEvents.filter(ev => ev.status === 'active').length === 0 && !showClosed && (
            <div className={styles.empty}>
              <p>No hay eventos activos.</p>
              <Button variant="secondary" onClick={openCreate}>Crear uno</Button>
            </div>
          )}

          {!eventsLoading && (
            (() => {
              const visible = myEvents.filter((ev) => showClosed || ev.status === 'active')
              if (!visible.length) return null
              return (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Fecha</th>
                        <th className={styles.right}>Total</th>
                        <th>Estado</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((ev) => {
                        const st = statusConfig[ev.status] ?? statusConfig.active
                        return (
                          <tr key={ev.id} className={`${styles.row} ${ev.status === 'closed' ? styles.rowClosed : ''}`}>
                            <td>
                              <Link to={`/evento/${ev.slug}`} className={styles.eventLink}>{ev.name}</Link>
                            </td>
                            <td className={styles.secondary}>{formatDate(ev.date)}</td>
                            <td className={`${styles.right} ${styles.bold}`}>{formatCRC(ev.total_amount)}</td>
                            <td><Badge variant={st.variant}>{st.label}</Badge></td>
                            <td>
                              <div className={styles.actions}>
                                <button className={styles.actionBtn} onClick={() => openEdit(ev)} title="Editar">✏️</button>
                                <button
                                  className={`${styles.actionBtn} ${styles.danger}`}
                                  onClick={() => handleDelete(ev)}
                                  disabled={deletingId === ev.id}
                                  title="Eliminar"
                                >🗑️</button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })()
          )}
        </section>

        {/* Eventos en que participo */}
        {participatedEvents.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Eventos en que participo</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Fecha</th>
                    <th className={styles.right}>Mi parte</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {participatedEvents.map((p) => {
                    const ev = p.events
                    const pst = paymentStatusConfig[p.payment_status] ?? paymentStatusConfig.pending
                    return (
                      <tr key={p.id} className={styles.row}>
                        <td>
                          <Link to={`/evento/${ev?.slug}`} className={styles.eventLink}>{ev?.name}</Link>
                        </td>
                        <td className={styles.secondary}>{ev?.date ? formatDate(ev.date) : '—'}</td>
                        <td className={`${styles.right} ${styles.bold}`}>{formatCRC(p.amount_owed)}</td>
                        <td><Badge variant={pst.variant}>{pst.label}</Badge></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>

      {/* Modal crear/editar evento */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEvent(null) }}
        title={editingEvent ? 'Editar evento' : 'Nuevo evento'}
        size="lg"
      >
        <EventForm
          event={editingEvent}
          onSuccess={handleFormSuccess}
          onCancel={() => { setModalOpen(false); setEditingEvent(null) }}
        />
      </Modal>

      {/* Modal confirmar rechazo */}
      <Modal isOpen={Boolean(rejectTarget)} onClose={() => setRejectTarget(null)} title="Rechazar pago" size="sm">
        {rejectTarget && (
          <div className={styles.rejectModal}>
            <div className={styles.rejectIcon}>✕</div>
            <p className={styles.rejectMsg}>¿Rechazar el pago de <strong>{rejectTarget.name}</strong>?</p>
            <p className={styles.rejectSub}>
              El participante quedará con estado <em>pendiente</em> y deberá registrar el pago nuevamente.
            </p>
            <div className={styles.rejectActions}>
              <Button variant="ghost" onClick={() => setRejectTarget(null)}>Cancelar</Button>
              <Button variant="danger" onClick={confirmReject}>Sí, rechazar</Button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  )
}
