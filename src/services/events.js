import { supabase } from '@/lib/supabaseClient'

export async function getEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('id, name, slug, date, status, total_amount')
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function getEventBySlug(slug) {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      participants (*),
      event_items (*, item_splits (*)),
      invoices (*)
    `)
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

export async function createEvent(payload) {
  const { data, error } = await supabase
    .from('events')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEvent(id, payload) {
  const { data, error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteEvent(id) {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw error
}
