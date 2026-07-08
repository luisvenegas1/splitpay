import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout/Layout'
import Spinner from '@/components/ui/Spinner/Spinner'
import Badge from '@/components/ui/Badge/Badge'
import Button from '@/components/ui/Button/Button'
import InvoiceViewer from '@/components/InvoiceViewer/InvoiceViewer'
import Modal from '@/components/ui/Modal/Modal'
import { useParticipant } from '@/hooks/useParticipant'
import { useAuth } from '@/context/AuthContext'
import { getProfile, getBankAccounts } from '@/services/profiles'
import { requestPayment, approvePayment, updateParticipant } from '@/services/participants'
import { formatCRC, formatDate } from '@/utils/format'
import styles from './PaymentDetail.module.css'

const statusConfig = {
  pending:          { label: 'Pendiente',          variant: 'danger' },
  partial:          { label: 'Parcial',            variant: 'warning' },
  paid:             { label: 'Pagado',             variant: 'success' },
  pending_approval: { label: 'En revisión',        variant: 'warning' },
}

export default function PaymentDetail() {
  const { token } = useParams()
  const { participant, loading, error, setParticipant } = useParticipant(token)
  const navigate = useNavigate()
  const { user } = useAuth()

  // isAdmin = el usuario actual es el dueño (owner) del evento
  const isAdmin = Boolean(user) && user.id === participant?.events?.owner_id

  // Perfil + cuentas del owner (para la tarjeta de "¿Cómo pagar?")
  const [ownerProfile, setOwnerProfile]   = useState(null)
  const [ownerAccounts, setOwnerAccounts] = useState([])
  useEffect(() => {
    const ownerId = participant?.events?.owner_id
    if (!ownerId) return
    Promise.all([getProfile(ownerId), getBankAccounts(ownerId)])
      .then(([p, accts]) => { setOwnerProfile(p); setOwnerAccounts(accts) })
      .catch(() => {})
  }, [participant?.events?.owner_id])

  // Admin edit modal state
  const [editOpen, setEditOpen]       = useState(false)
  const [editStatus, setEditStatus]   = useState('')
  const [editAmount, setEditAmount]   = useState('')
  const [editMethod, setEditMethod]   = useState('')
  const [editDate, setEditDate]       = useState('')
  const [editNotes, setEditNotes]     = useState('')
  const [editSaving, setEditSaving]   = useState(false)
  const [editError, setEditError]     = useState('')
  // Reject confirm modal
  const [rejectTarget, setRejectTarget] = useState(null)

  const [modalOpen, setModalOpen]       = useState(false)
  const [payType, setPayType]           = useState('total')   // 'total' | 'partial'
  const [payAmount, setPayAmount]       = useState('')
  const [payMethod, setPayMethod]       = useState('')
  const [payNotes, setPayNotes]         = useState('')
  const [payDate, setPayDate]           = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [payError, setPayError]         = useState('')

  function openEdit() {
    setEditStatus(participant.payment_status)
    setEditAmount(participant.amount_paid ?? '')
    setEditMethod(participant.payment_method ?? '')
    setEditDate(participant.payment_date ?? '')
    setEditNotes(participant.notes ?? '')
    setEditError('')
    setEditOpen(true)
  }

  async function handleEditSave(e) {
    e.preventDefault()
    setEditError('')
    setEditSaving(true)
    try {
      const updated = await updateParticipant(participant.id, {
        payment_status: editStatus,
        amount_paid: parseFloat(editAmount) || 0,
        payment_method: editMethod || null,
        payment_date: editDate || null,
        notes: editNotes || null,
      })
      setParticipant((prev) => ({ ...prev, ...updated }))
      setEditOpen(false)
    } catch (err) {
      setEditError(err?.message ?? 'Error al guardar.')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDeletePayment() {
    setEditSaving(true)
    try {
      const updated = await updateParticipant(participant.id, {
        payment_status: 'pending',
        amount_paid: 0,
        payment_method: null,
        payment_date: null,
        notes: null,
      })
      setParticipant((prev) => ({ ...prev, ...updated }))
      setEditOpen(false)
    } catch (err) {
      setEditError(err?.message ?? 'Error al eliminar.')
    } finally {
      setEditSaving(false)
    }
  }

  function openModal() {
    setPayType('total')
    setPayAmount('')
    setPayMethod('')
    setPayNotes('')
    setPayDate(new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0])
    setPayError('')
    setModalOpen(true)
  }

  async function handleSubmitPay(e) {
    e.preventDefault()
    setPayError('')

    if (payType === 'partial') {
      const amt = parseFloat(payAmount)
      if (!amt || amt <= 0) {
        setPayError('Ingresá un monto válido mayor a 0.')
        return
      }
      if (amt >= participant.amount_owed) {
        setPayError('El monto parcial debe ser menor al total. Para pago completo usá "Pago total".')
        return
      }
    }

    setSubmitting(true)
    try {
      let updated

      const totalAmt = isPartial ? amountLeft : amountOwed
      const paidAmt  = payType === 'total' ? totalAmt : parseFloat(payAmount) || 0

      if (isAdmin) {
        // Admin registers payment → auto-approved
        updated = await updateParticipant(participant.id, {
          payment_status: payType === 'total' ? 'paid' : 'partial',
          amount_paid: paidAmt,
          payment_method: payMethod || null,
          payment_date: payDate || new Date().toISOString().split('T')[0],
          notes: payNotes || null,
        })
      } else {
        // Participant submits → goes to pending_approval
        updated = await requestPayment(participant.id, {
          is_total: payType === 'total',
          amount_paid: paidAmt,
          amount_owed: totalAmt,
          payment_method: payMethod || null,
          payment_date: payDate || new Date().toISOString().split('T')[0],
          notes: payNotes || null,
        })
      }

      setParticipant((prev) => ({ ...prev, ...updated }))
      setModalOpen(false)
    } catch (err) {
      console.error('Payment error:', err)
      setPayError(err?.message ?? 'Error al registrar el pago. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Layout><Spinner /></Layout>

  if (error || !participant) {
    return (
      <Layout>
        <div className={styles.errorState}>
          <h2>Enlace no válido</h2>
          <p>Este enlace de pago no existe o fue eliminado.</p>
          <Link to="/" className={styles.backLink}>← Ir al inicio</Link>
        </div>
      </Layout>
    )
  }

  const ev            = participant.events
  const isPayer       = participant.is_payer === true
  const status        = statusConfig[participant.payment_status] ?? statusConfig.pending
  const isPaid              = participant.payment_status === 'paid'
  const isPendingApproval   = participant.payment_status === 'pending_approval'
  const isPartial     = participant.payment_status === 'partial'
  const amountPaid    = participant.amount_paid ?? 0
  const amountOwed    = participant.amount_owed ?? 0
  const amountLeft    = Math.max(amountOwed - amountPaid, 0)
  const invoices      = ev?.invoices ?? []

  const whatsappMsg = encodeURIComponent(
    `Hola ${participant.name} 👋\n\nTe comparto el detalle de la cuenta para "${ev?.name}".\n\nTotal: ${formatCRC(amountOwed)}${isPartial ? `\nPagado: ${formatCRC(amountPaid)}\nPendiente: ${formatCRC(amountLeft)}` : ''}\n\nPodés verlo aquí: ${window.location.href}`
  )

  return (
    <Layout>
      <div className={`${styles.page} container`}>

        {/* Back button */}
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          ← Atrás
        </button>

        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.avatar}>
            {participant.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className={styles.name}>{participant.name}</h1>
            <p className={styles.eventName}>{ev?.name}</p>
            {ev?.date && <p className={styles.eventDate}>{formatDate(ev.date)}</p>}
          </div>
        </div>

        {/* Pagador: vista especial */}
        {isPayer && (
          <div className={styles.payerCard}>
            <div className={styles.payerCardIcon}>💰</div>
            <h2 className={styles.payerCardTitle}>Vos pusiste la plata</h2>
            <p className={styles.payerCardDesc}>
              Sos quien pagó la cuenta de <strong>{ev?.name}</strong>.
              A vos te van a pagar los demás participantes.
            </p>
            <Link to={`/evento/${ev?.slug}`} className={styles.payerCardLink}>
              Ver estado del evento →
            </Link>
          </div>
        )}

        <div className={styles.grid}>
          <div className={styles.main}>

            {/* Monto card */}
            <div className={styles.amountCard}>
              <div className={styles.amountTop}>
                <span className={styles.amountLabel}>Tu parte</span>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <span className={styles.amount}>{formatCRC(amountOwed)}</span>

              {/* Pago parcial: mostrar desglose */}
              {isPartial && (
                <div className={styles.partialBreakdown}>
                  <div className={styles.partialRow}>
                    <span className={styles.partialLabel}>✅ Pagado</span>
                    <span className={styles.partialPaid}>{formatCRC(amountPaid)}</span>
                  </div>
                  <div className={styles.partialRow}>
                    <span className={styles.partialLabel}>⏳ Pendiente</span>
                    <span className={styles.partialLeft}>{formatCRC(amountLeft)}</span>
                  </div>
                  {participant.payment_date && (
                    <p className={styles.paidInfo}>
                      Último pago: {formatDate(participant.payment_date)}
                      {participant.payment_method ? ` · ${participant.payment_method}` : ''}
                    </p>
                  )}
                </div>
              )}

              {isPaid && participant.payment_date && (
                <p className={styles.paidInfo}>
                  ✅ Pagado el {formatDate(participant.payment_date)}
                  {participant.payment_method ? ` · ${participant.payment_method}` : ''}
                </p>
              )}
            </div>

            {/* Detalle de ítems */}
            {participant.item_splits?.length > 0 && (
              <div className={styles.itemsCard}>
                <h2 className={styles.cardTitle}>Detalle de tu cuenta</h2>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Ítem</th>
                      <th className={styles.right}>Porción</th>
                      <th className={styles.right}>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participant.item_splits.map((split) => {
                      const itemQty = parseFloat(split.event_items?.quantity) || 1
                      const myQty   = parseFloat(split.quantity) || 0
                      const pct     = Math.round((myQty / itemQty) * 100)
                      const label   = pct >= 100 ? 'completo' : `${pct}%`
                      return (
                        <tr key={split.id}>
                          <td>
                            <span>{split.event_items?.description ?? '—'}</span>
                            {pct < 100 && (
                              <span className={styles.splitNote}>
                                {pct}% del ítem (dividido entre {Math.round(1 / (myQty / itemQty))} personas)
                              </span>
                            )}
                          </td>
                          <td className={styles.right}>
                            <span className={styles.portion}>{label}</span>
                          </td>
                          <td className={`${styles.right} ${styles.bold}`}>
                            {formatCRC(split.amount)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {participant.notes && (
              <div className={styles.notesCard}>
                <h2 className={styles.cardTitle}>Notas</h2>
                <p className={styles.notesText}>{participant.notes}</p>
              </div>
            )}

            {/* Acciones */}
            <div className={styles.actions}>
              {!isPaid && !isPendingApproval && (
                <Button onClick={openModal} fullWidth>
                  {isPartial ? '💰 Registrar otro pago' : '✓ Ya pagué'}
                </Button>
              )}
              {isPendingApproval && !isAdmin && (
                <div className={styles.pendingNotice}>
                  ⏳ Tu pago está pendiente de aprobación por el administrador.
                </div>
              )}
              {isAdmin && participant.payment_status !== 'pending' && (
                <Button variant="ghost" onClick={openEdit} fullWidth>
                  ✏️ Editar pago registrado
                </Button>
              )}
              <a
                href={`https://wa.me/?text=${whatsappMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.waBtn}
              >
                📱 Compartir por WhatsApp
              </a>
            </div>
          </div>

          <aside className={styles.aside}>
            {invoices.length > 0 && <InvoiceViewer invoices={invoices} />}
            <div className={styles.payInfoCard}>
              <h3 className={styles.payInfoTitle}>¿Cómo pagar?</h3>

              {/* SINPE Móvil (del perfil del owner) */}
              {ownerProfile?.phone && (
                <div className={styles.payMethod}>
                  <div className={styles.payMethodHeader}>
                    <span className={styles.payMethodIcon}>📱</span>
                    <span className={styles.payMethodLabel}>SINPE Móvil</span>
                  </div>
                  <div className={styles.payMethodRow}>
                    <div>
                      <span className={styles.payMethodValue}>{ownerProfile.phone}</span>
                      <span className={styles.payMethodSub}>{ownerProfile.name}</span>
                    </div>
                    <button className={styles.copyBtn}
                      onClick={() => { navigator.clipboard.writeText(ownerProfile.phone); alert('¡Número copiado!') }}
                    >📋 Copiar</button>
                  </div>
                </div>
              )}

              {/* Cuentas bancarias */}
              {ownerAccounts.map((acct) => (
                <div className={styles.payMethod} key={acct.id}>
                  <div className={styles.payMethodHeader}>
                    <span className={styles.payMethodIcon}>🏦</span>
                    <span className={styles.payMethodLabel}>
                      {acct.bank_name} — {acct.currency === 'USD' ? 'Dólares' : 'Colones'}
                    </span>
                  </div>
                  {ownerProfile?.name && (
                    <div className={styles.payMethodMeta}>
                      <span className={styles.payMethodSub}>{ownerProfile.name}</span>
                    </div>
                  )}
                  {acct.account && (
                    <div className={styles.payMethodRow}>
                      <div>
                        <span className={styles.payMethodSubLabel}>Cuenta</span>
                        <span className={styles.payMethodValue}>{acct.account}</span>
                      </div>
                      <button className={styles.copyBtn}
                        onClick={() => { navigator.clipboard.writeText(acct.account); alert('¡Cuenta copiada!') }}
                      >📋 Copiar</button>
                    </div>
                  )}
                  {acct.iban && (
                    <div className={styles.payMethodRow}>
                      <div>
                        <span className={styles.payMethodSubLabel}>IBAN</span>
                        <span className={styles.payMethodValueSm}>{acct.iban}</span>
                      </div>
                      <button className={styles.copyBtn}
                        onClick={() => { navigator.clipboard.writeText(acct.iban); alert('¡IBAN copiado!') }}
                      >📋 Copiar</button>
                    </div>
                  )}
                </div>
              ))}

              {ownerProfile && !ownerProfile.phone && ownerAccounts.length === 0 && (
                <p className={styles.payInfoHint}>El organizador no ha configurado sus datos de pago aún.</p>
              )}
              {!ownerProfile && (
                <p className={styles.payInfoHint}>Contactá al organizador para obtener los datos de pago.</p>
              )}

              <p className={styles.payInfoHint}>
                Después de pagar, presioná "Ya pagué" para registrarlo.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Modal editar pago (solo admin) */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar pago"
        size="sm"
      >
        <form onSubmit={handleEditSave} className={styles.payForm}>
          <div className={styles.payField}>
            <label className={styles.payLabel}>Estado</label>
            <select
              className={styles.payInput}
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
            >
              <option value="pending">Pendiente</option>
              <option value="partial">Parcial</option>
              <option value="paid">Pagado</option>
              <option value="pending_approval">En revisión</option>
            </select>
          </div>

          <div className={styles.payField}>
            <label className={styles.payLabel}>Monto pagado (₡)</label>
            <input
              type="number"
              className={styles.payInput}
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              min="0"
              step="1"
            />
          </div>

          <div className={styles.payField}>
            <label className={styles.payLabel}>Método de pago</label>
            <select
              className={styles.payInput}
              value={editMethod}
              onChange={(e) => setEditMethod(e.target.value)}
            >
              <option value="">— Ninguno —</option>
              <option value="SINPE Móvil">SINPE Móvil</option>
              <option value="Transferencia">Transferencia bancaria</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div className={styles.payField}>
            <label className={styles.payLabel}>Fecha de pago</label>
            <input
              type="date"
              className={styles.payInput}
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
            />
          </div>

          <div className={styles.payField}>
            <label className={styles.payLabel}>Notas</label>
            <textarea
              className={styles.payTextarea}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={2}
            />
          </div>

          {editError && <p className={styles.payError}>{editError}</p>}

          <div className={styles.payActions}>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeletePayment}
              loading={editSaving}
            >
              🗑 Eliminar pago
            </Button>
            <div className={styles.payActionsRight}>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={editSaving}>
                Guardar
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal registrar pago */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registrar pago"
        size="sm"
      >
        <form onSubmit={handleSubmitPay} className={styles.payForm}>

          {/* Tipo de pago */}
          <div className={styles.payTypeRow}>
            <button
              type="button"
              className={`${styles.payTypeBtn} ${payType === 'total' ? styles.payTypeActive : ''}`}
              onClick={() => setPayType('total')}
            >
              Pago total
            </button>
            <button
              type="button"
              className={`${styles.payTypeBtn} ${payType === 'partial' ? styles.payTypeActive : ''}`}
              onClick={() => setPayType('partial')}
            >
              Pago parcial
            </button>
          </div>

          <p className={styles.payAmount}>
            {payType === 'total'
              ? <>Total: <strong>{formatCRC(isPartial ? amountLeft : amountOwed)}</strong></>
              : <>Pendiente: <strong>{formatCRC(isPartial ? amountLeft : amountOwed)}</strong></>
            }
          </p>

          {payType === 'partial' && (
            <div className={styles.payField}>
              <label className={styles.payLabel}>Monto a pagar (₡) *</label>
              <input
                type="number"
                className={styles.payInput}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Ej: 25000"
                min="1"
                max={isPartial ? amountLeft : amountOwed - 1}
                step="1"
                required
              />
            </div>
          )}

          <div className={styles.payField}>
            <label className={styles.payLabel}>Método de pago (opcional)</label>
            <select
              className={styles.payInput}
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
            >
              <option value="">— Seleccionar —</option>
              <option value="SINPE Móvil">SINPE Móvil</option>
              <option value="Transferencia">Transferencia bancaria</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div className={styles.payField}>
            <label className={styles.payLabel}>Fecha de pago</label>
            <input
              type="date"
              className={styles.payInput}
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
          </div>

          <div className={styles.payField}>
            <label className={styles.payLabel}>Notas (opcional)</label>
            <textarea
              className={styles.payTextarea}
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Ej: comprobante #12345"
              rows={2}
            />
          </div>

          {payError && <p className={styles.payError}>{payError}</p>}

          <div className={styles.payActions}>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              Confirmar
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
