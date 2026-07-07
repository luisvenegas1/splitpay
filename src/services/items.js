import { supabase } from '@/lib/supabaseClient'

export async function upsertItems(eventId, items) {
  // Eliminar splits e ítems anteriores
  const { data: existing } = await supabase
    .from('event_items')
    .select('id')
    .eq('event_id', eventId)

  if (existing?.length) {
    await supabase
      .from('item_splits')
      .delete()
      .in('item_id', existing.map((i) => i.id))
  }
  await supabase.from('event_items').delete().eq('event_id', eventId)

  if (!items.length) return []

  const { data, error } = await supabase
    .from('event_items')
    .insert(
      items.map((item) => ({
        event_id: eventId,
        description: item.description,
        quantity: item.quantity ?? 1,
        unit_price: item.unit_price,
        price_with_iv: item.price_with_iv,
      }))
    )
    .select()
  if (error) throw error
  return data
}

export async function upsertParticipantsAndSplits(eventId, participants) {
  // Eliminar participantes anteriores (cascada elimina splits)
  await supabase.from('participants').delete().eq('event_id', eventId)

  if (!participants.length) return []

  const { data: inserted, error } = await supabase
    .from('participants')
    .insert(
      participants.map((p) => ({
        event_id: eventId,
        name: p.name,
        email: p.email || null,
        phone: p.phone || null,
        amount_owed: p.amount_owed ?? 0,
        payment_status: 'pending',
        payment_token: p.payment_token,
      }))
    )
    .select()
  if (error) throw error
  return inserted
}

/**
 * Inserta los item_splits dados los ítems y participantes ya guardados en DB.
 * @param {Array} savedItems    - registros de event_items con {id, ...}
 * @param {Array} savedParts    - registros de participants con {id, ...}
 * @param {Object} splits       - { [itemIdx]: { [participantIdx]: quantity } }
 */
export async function insertItemSplits(savedItems, savedParts, splits) {
  const rows = []

  savedItems.forEach((item, itemIdx) => {
    const row = splits[itemIdx] ?? {}
    const rowTotal = Object.values(row).reduce((s, v) => s + (parseFloat(v) || 0), 0)
    if (!rowTotal) return

    savedParts.forEach((participant, partIdx) => {
      const qty = parseFloat(splits[itemIdx]?.[partIdx]) || 0
      if (qty > 0) {
        const proportion = qty / rowTotal
        const itemQty = parseFloat(item.quantity) || 1
        rows.push({
          item_id: item.id,
          participant_id: participant.id,
          quantity: proportion * itemQty,
          amount: proportion * item.price_with_iv,  // price_with_iv = total item cost
        })
      }
    })
  })

  if (!rows.length) return

  const { error } = await supabase.from('item_splits').insert(rows)
  if (error) throw error
}
