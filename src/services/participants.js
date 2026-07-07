import { supabase } from '@/lib/supabaseClient'

export async function getParticipantByToken(token) {
  const { data, error } = await supabase
    .from('participants')
    .select(`
      *,
      events (name, slug, date, description, service_tax_rate, iv_rate, owner_id, invoices(*)),
      item_splits (*, event_items (*))
    `)
    .eq('payment_token', token)
    .single()
  if (error) throw error
  return data
}

export async function addParticipant(payload) {
  const { data, error } = await supabase
    .from('participants')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateParticipant(id, payload) {
  const { data, error } = await supabase
    .from('participants')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteParticipant(id) {
  const { error } = await supabase.from('participants').delete().eq('id', id)
  if (error) throw error
}

// Called by participant: submits payment for admin approval
export async function requestPayment(id, { is_total, amount_paid, amount_owed, payment_method, payment_date, notes }) {
  return updateParticipant(id, {
    payment_status: 'pending_approval',
    amount_paid: is_total ? amount_owed : amount_paid,
    payment_method,
    payment_date,
    notes,
  })
}

// Called by admin: approve a pending payment
export async function approvePayment(id, { amount_paid, amount_owed }) {
  const isFull = amount_paid >= amount_owed
  return updateParticipant(id, {
    payment_status: isFull ? 'paid' : 'partial',
  })
}

// Called by admin: reject a pending payment
export async function rejectPayment(id, { previous_amount_paid }) {
  const wasPreviouslyPartial = previous_amount_paid > 0
  return updateParticipant(id, {
    payment_status: wasPreviouslyPartial ? 'partial' : 'pending',
    amount_paid: previous_amount_paid ?? 0,
  })
}

// Legacy aliases (kept for compatibility)
export async function markAsPaid(id, opts) {
  return approvePayment(id, opts)
}
export async function markAsPartial(id, opts) {
  return updateParticipant(id, { payment_status: 'partial', ...opts })
}
