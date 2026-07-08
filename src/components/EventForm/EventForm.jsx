import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button/Button'
import { useAuth } from '@/context/AuthContext'
import { createEvent, updateEvent } from '@/services/events'
import { upsertItems, upsertParticipantsAndSplits, insertItemSplits } from '@/services/items'
import { uploadInvoice } from '@/services/invoices'
import { slugify, generatePaymentToken } from '@/utils/format'
import { parseInvoice } from '@/services/parseInvoice'
import styles from './EventForm.module.css'

function emptyItem() {
  return { description: '', quantity: '', unit_price: '', total_pretax: '', price_with_iv: '' }
}

function emptyParticipant() {
  return { name: '', email: '', phone: '' }
}

export default function EventForm({ event, onSuccess, onCancel }) {
  const isEditing = Boolean(event)
  const { user } = useAuth()

  // El dueño del evento siempre es quien lo crea/edita
  const ownerId = event?.owner_id ?? user?.id ?? null

  const [name, setName] = useState(event?.name ?? '')
  const [date, setDate] = useState(event?.date ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [status, setStatus] = useState(event?.status ?? 'active')
  const [ivRate, setIvRate] = useState(((event?.iv_rate ?? 0.13) * 100).toFixed(0))
  const [serviceTax, setServiceTax] = useState(((event?.service_tax_rate ?? 0.10) * 100).toFixed(0))

  const [items, setItems] = useState(
    event?.event_items?.length
      ? event.event_items.map((i) => ({
          description: i.description,
          quantity: i.quantity ?? '',
          unit_price: i.unit_price,
          total_pretax: i.unit_price && i.quantity ? (i.unit_price * i.quantity).toFixed(2) : '',
          price_with_iv: i.price_with_iv,
        }))
      : [emptyItem()]
  )

  const [participants, setParticipants] = useState(
    event?.participants?.length
      ? event.participants.map((p) => ({
          name: p.name,
          email: p.email ?? '',
          phone: p.phone ?? '',
        }))
      : [emptyParticipant()]
  )

  // splits[itemIdx][participantIdx] = qty
  const [payerIdx, setPayerIdx] = useState(-1)
  const [splits, setSplits] = useState({})
  const [invoiceFile, setInvoiceFile] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [parseResult, setParseResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleParseInvoice() {
    if (!invoiceFile) return
    setParsing(true)
    setError('')
    try {
      const result = await parseInvoice(invoiceFile)
      setParseResult(result)

      // Auto-fill tax rates
      if (result.iv_rate) setIvRate(String(result.iv_rate))
      if (result.service_rate !== undefined) setServiceTax(String(result.service_rate))

      // Auto-fill items
      if (result.items?.length) {
        const newItems = result.items.map((item) => {
          const qty = parseFloat(item.quantity) || 1
          const unitPrice = parseFloat(item.unit_price) || 0
          const pretax = qty * unitPrice
          return {
            description: item.description,
            quantity: String(qty),
            unit_price: unitPrice.toFixed(2),
            total_pretax: pretax.toFixed(2),
            price_with_iv: '', // se recalcula con el useEffect de taxFactor
          }
        })
        setItems(newItems)
        setSplits({})
      }
    } catch (err) {
      setError('No se pudo leer la factura: ' + (err.message ?? 'Error desconocido'))
    } finally {
      setParsing(false)
    }
  }

  const taxFactor = 1 + (parseFloat(ivRate) || 0) / 100 + (parseFloat(serviceTax) || 0) / 100

  // Recalculate all items' price_with_iv when IV rate changes
  useEffect(() => {
    setItems((prev) =>
      prev.map((item) => {
        const pretax = parseFloat(item.total_pretax) || 0
        const withTax = pretax * taxFactor
        return { ...item, price_with_iv: withTax ? withTax.toFixed(2) : '' }
      })
    )
  }, [ivRate, serviceTax])

  function getSplit(itemIdx, partIdx) {
    return splits[itemIdx]?.[partIdx] ?? ''
  }

  function setSplit(itemIdx, partIdx, value) {
    setSplits((prev) => ({
      ...prev,
      [itemIdx]: { ...(prev[itemIdx] ?? {}), [partIdx]: value },
    }))
  }

  function splitEquallyForItem(itemIdx) {
    const newRow = {}
    participants.forEach((p, j) => { newRow[j] = p.name.trim() ? 1 : 0 })
    setSplits((prev) => ({ ...prev, [itemIdx]: newRow }))
  }

  function participantTotal(partIdx) {
    return items.reduce((sum, item, itemIdx) => {
      const mySplit = parseFloat(getSplit(itemIdx, partIdx)) || 0
      if (!mySplit) return sum
      const rowTotal = Object.values(splits[itemIdx] ?? {})
        .reduce((s, v) => s + (parseFloat(v) || 0), 0)
      if (!rowTotal) return sum
      // price_with_iv is now the TOTAL item cost (qty * unit_price * taxFactor)
      const totalCost = parseFloat(item.price_with_iv) || 0
      return sum + (mySplit / rowTotal) * totalCost
    }, 0)
  }

  const grandTotal = participants.reduce((sum, _, j) => sum + participantTotal(j), 0)

  // Every valid item must have at least one participant assigned
  const allItemsAssigned = items.every((item, idx) => {
    if (!item.description.trim()) return true  // skip blank rows
    const rowTotal = Object.values(splits[idx] ?? {})
      .reduce((s, v) => s + (parseFloat(v) || 0), 0)
    return rowTotal > 0
  })

  function handleItemChange(index, field, value) {
    setItems((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }

      const qty        = parseFloat(field === 'quantity'    ? value : updated[index].quantity)    || 0
      const unitPrice  = parseFloat(field === 'unit_price'  ? value : updated[index].unit_price)  || 0
      const totalPre   = parseFloat(field === 'total_pretax'? value : updated[index].total_pretax)|| 0

      if (field === 'total_pretax') {
        // Back-calculate unit_price from total ÷ qty
        const derived = qty > 0 ? totalPre / qty : 0
        updated[index].unit_price = derived ? derived.toFixed(4) : ''
        const finalTotal = totalPre * taxFactor
        updated[index].price_with_iv = finalTotal ? finalTotal.toFixed(2) : ''
      } else if (field === 'unit_price' || field === 'quantity') {
        // Forward-calculate total_pretax and price_with_iv from unit_price × qty
        const tp = qty * unitPrice
        updated[index].total_pretax = tp ? tp.toFixed(2) : ''
        updated[index].price_with_iv = tp ? (tp * taxFactor).toFixed(2) : ''
      }

      return updated
    })
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index))
    setSplits((prev) => {
      const next = {}
      Object.keys(prev).forEach((k) => {
        const ki = parseInt(k)
        if (ki < index) next[ki] = prev[k]
        else if (ki > index) next[ki - 1] = prev[k]
      })
      return next
    })
  }

  function handleParticipantChange(index, field, value) {
    setParticipants((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  function addParticipant() {
    setParticipants((prev) => [...prev, emptyParticipant()])
  }

  function removeParticipant(index) {
    setParticipants((prev) => prev.filter((_, i) => i !== index))
    setSplits((prev) => {
      const next = {}
      Object.keys(prev).forEach((k) => {
        const row = prev[k]
        const newRow = {}
        Object.keys(row).forEach((j) => {
          const ji = parseInt(j)
          if (ji < index) newRow[ji] = row[j]
          else if (ji > index) newRow[ji - 1] = row[j]
        })
        next[k] = newRow
      })
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!name.trim() || !date) {
      setError('Nombre y fecha son obligatorios.')
      return
    }

    const validPartIndices = participants
      .map((p, j) => ({ p, j }))
      .filter(({ p }) => p.name.trim())

    if (!validPartIndices.length) {
      setError('Agregá al menos un participante.')
      return
    }

    const validItems = items.filter((i) => i.description.trim())

    setLoading(true)
    try {
      const payload = {
        name: name.trim(),
        slug: slugify(name.trim()),
        date,
        description: description.trim() || null,
        total_amount: grandTotal,
        status,
        iv_rate: parseFloat(ivRate) / 100,
        service_tax_rate: parseFloat(serviceTax) / 100,
        owner_id: ownerId || user?.id || null,
      }

      let savedEvent
      if (isEditing) {
        savedEvent = await updateEvent(event.id, payload)
      } else {
        savedEvent = await createEvent(payload)
      }

      // Guardar ítems — quantity = suma de splits de ese ítem
      let savedItems = []
      if (validItems.length) {
        const itemsToSave = validItems.map((item) => ({
          ...item,
          quantity: parseFloat(item.quantity) || 1,
        }))
        savedItems = await upsertItems(savedEvent.id, itemsToSave)
      }

      // Guardar participantes con amount_owed calculado
      const participantsToSave = validPartIndices.map(({ p, j }, savedIdx) => ({
        name: p.name.trim(),
        email: p.email || null,
        phone: p.phone || null,
        amount_owed: participantTotal(j),
        is_payer: payerIdx >= 0 && validPartIndices[savedIdx].j === payerIdx,
        payment_token: generatePaymentToken(),
      }))

      const savedParticipants = await upsertParticipantsAndSplits(
        savedEvent.id,
        participantsToSave
      )

      // Guardar item_splits
      if (savedItems.length && savedParticipants?.length) {
        const remappedSplits = {}
        savedItems.forEach((_, savedItemIdx) => {
          const origItemIdx = items.indexOf(validItems[savedItemIdx])
          remappedSplits[savedItemIdx] = {}
          validPartIndices.forEach(({ j }, savedPartIdx) => {
            remappedSplits[savedItemIdx][savedPartIdx] =
              parseFloat(getSplit(origItemIdx, j)) || 0
          })
        })
        await insertItemSplits(savedItems, savedParticipants, remappedSplits)
      }

      if (invoiceFile) {
        await uploadInvoice(savedEvent.id, invoiceFile)
      }

      onSuccess()
    } catch (err) {
      console.error(err)
      setError(err.message ?? 'Error al guardar el evento. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n) => n.toLocaleString('es-CR', { minimumFractionDigits: 2 })

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>

      {/* ── 1. Info del evento ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Información del evento</h3>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label}>Nombre *</label>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Carne Asada Julio"
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Fecha *</label>
            <input
              type="date"
              className={styles.input}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Descripción</label>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalle opcional..."
            rows={2}
          />
        </div>
        <div className={styles.row3}>
          <div className={styles.field}>
            <label className={styles.label}>Estado</label>
            <select className={styles.input} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">Activo</option>
              <option value="closed">Cerrado</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>IV — ventas (%)</label>
            <input
              type="number" className={styles.input}
              value={ivRate} onChange={(e) => setIvRate(e.target.value)}
              min="0" max="100" step="1" placeholder="13"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Servicio (%)</label>
            <input
              type="number" className={styles.input}
              value={serviceTax} onChange={(e) => setServiceTax(e.target.value)}
              min="0" max="100" step="1" placeholder="10"
            />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Factura (imagen)</label>
          <div className={styles.invoiceRow}>
            <label className={styles.fileBtn}>
              📁 Elegir / tomar foto
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => { setInvoiceFile(e.target.files[0] ?? null); setParseResult(null) }}
              />
            </label>
            {invoiceFile && (
              <span className={styles.fileName}>✓ {invoiceFile.name}</span>
            )}
            {invoiceFile && (
              <button
                type="button"
                className={styles.parseBtn}
                onClick={handleParseInvoice}
                disabled={parsing}
              >
                {parsing ? '⏳ Leyendo...' : '🤖 Leer factura'}
              </button>
            )}
          </div>
          {parseResult && (
            <div className={styles.parseResult}>
              <span>✅ {parseResult.establishment_type === 'restaurant' ? 'Restaurante' : 'Establecimiento'} detectado
                · IV {parseResult.iv_rate}%{parseResult.service_rate > 0 ? ` + Servicio ${parseResult.service_rate}%` : ''}
                · Total en factura: ₡{Number(parseResult.total_detected).toLocaleString('es-CR')}
              </span>
              {parseResult.notes && <span className={styles.parseNotes}>⚠ {parseResult.notes}</span>}
            </div>
          )}
        </div>
      </section>

      {/* ── 2. Participantes ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Participantes</h3>
          <button type="button" className={styles.addBtn} onClick={addParticipant}>
            + Agregar
          </button>
        </div>
        <p className={styles.payerHint}>💰 Marcá quién puso la plata — esa persona no paga, a ella le pagan.</p>
        {participants.map((p, i) => (
          <div key={i} className={`${styles.participantRow} ${payerIdx === i ? styles.participantPayer : ''}`}>
            <button
              type="button"
              className={`${styles.payerBtn} ${payerIdx === i ? styles.payerBtnActive : ''}`}
              onClick={() => setPayerIdx(payerIdx === i ? -1 : i)}
              title={payerIdx === i ? 'Quitar como pagador' : 'Marcar como quien puso la plata'}
            >💰</button>
            <input
              className={styles.input}
              value={p.name}
              onChange={(e) => handleParticipantChange(i, 'name', e.target.value)}
              placeholder="Nombre *"
            />
            <input
              className={styles.input}
              value={p.email}
              onChange={(e) => handleParticipantChange(i, 'email', e.target.value)}
              placeholder="Email (opcional)"
              type="email"
            />
            <input
              className={styles.input}
              value={p.phone}
              onChange={(e) => handleParticipantChange(i, 'phone', e.target.value)}
              placeholder="Teléfono (opcional)"
            />
            <button
              type="button" className={styles.removeBtn}
              onClick={() => removeParticipant(i)}
              disabled={participants.length === 1}
            >✕</button>
          </div>
        ))}
      </section>

      {/* ── 3. Ítems ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Ítems de la factura</h3>
          <button type="button" className={styles.addBtn} onClick={addItem}>
            + Agregar ítem
          </button>
        </div>

        <div className={styles.itemsHeader}>
          <span>Descripción</span>
          <span>Cant.</span>
          <span>Precio unit.</span>
          <span>Total s/imp.</span>
          <span>Total c/imp.</span>
          <span />
        </div>

        {items.map((item, i) => (
          <div key={i} className={styles.itemRow}>
            <input
              className={styles.input}
              value={item.description}
              onChange={(e) => handleItemChange(i, 'description', e.target.value)}
              placeholder="Descripción"
            />
            <input
              className={styles.input} type="number" min="0" step="1"
              value={item.quantity}
              onChange={(e) => handleItemChange(i, 'quantity', e.target.value)}
              placeholder="1"
            />
            <input
              className={styles.input} type="number" min="0" step="0.01"
              value={item.unit_price}
              onChange={(e) => handleItemChange(i, 'unit_price', e.target.value)}
              placeholder="0.00"
            />
            <input
              className={styles.input} type="number" min="0" step="0.01"
              value={item.total_pretax}
              onChange={(e) => handleItemChange(i, 'total_pretax', e.target.value)}
              placeholder="0.00"
            />
            <input
              className={`${styles.input} ${styles.inputReadonly}`}
              type="number" min="0" step="0.01"
              value={item.price_with_iv}
              readOnly
              placeholder="auto"
            />
            <button
              type="button" className={styles.removeBtn}
              onClick={() => removeItem(i)}
              disabled={items.length === 1}
            >✕</button>
          </div>
        ))}
      </section>

      {/* ── 4. Matriz de asignación ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>¿Quién consumió qué?</h3>
          <span className={styles.matrixHint}>
            Cantidad por persona · ÷ divide entre todos
          </span>
        </div>

        <div className={styles.matrixWrap}>
          <table className={styles.matrix}>
            <thead>
              <tr>
                <th className={styles.matrixItemCol}>Ítem</th>
                {participants.map((p, j) => (
                  <th key={j} className={styles.matrixPartCol}>
                    {p.name.trim() || `P${j + 1}`}
                  </th>
                ))}
                <th className={styles.matrixActionCol} />
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td className={styles.matrixItemName}>
                    <span>{item.description || `Ítem ${i + 1}`}</span>
                    {item.price_with_iv && (
                      <span className={styles.matrixItemPrice}>
                        Total: ₡{fmt(parseFloat(item.price_with_iv) || 0)}
                      </span>
                    )}
                  </td>
                  {participants.map((_, j) => (
                    <td key={j} className={styles.matrixCell}>
                      <input
                        className={styles.matrixInput}
                        type="number" min="0" step="1"
                        value={getSplit(i, j)}
                        onChange={(e) => setSplit(i, j, e.target.value)}
                        placeholder="0"
                      />
                    </td>
                  ))}
                  <td className={styles.matrixActionCol}>
                    <button
                      type="button"
                      className={styles.splitAllBtn}
                      onClick={() => splitEquallyForItem(i)}
                      title="Dividir entre todos"
                    >÷</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={styles.totalsRow}>
                <td className={styles.totalsLabel}>Total a pagar</td>
                {participants.map((_, j) => (
                  <td key={j} className={`${styles.totalsCell} ${payerIdx === j ? styles.totalsCellPayer : ''}`}>
                    {payerIdx === j ? '💰 Puso la plata' : `₡${fmt(participantTotal(j))}`}
                  </td>
                ))}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className={styles.grandTotal}>
          <span className={styles.grandTotalLabel}>Total del evento:</span>
          <span className={styles.grandTotalValue}>₡{fmt(grandTotal)}</span>
        </div>
      </section>

      {error && <p className={styles.error}>{error}</p>}

      {!allItemsAssigned && (
        <p className={styles.assignHint}>
          ⚠ Asigná al menos una persona a cada ítem antes de guardar.
        </p>
      )}
      <div className={styles.formFooter}>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading} disabled={!allItemsAssigned}>
          {isEditing ? 'Guardar cambios' : 'Crear evento'}
        </Button>
      </div>
    </form>
  )
}
