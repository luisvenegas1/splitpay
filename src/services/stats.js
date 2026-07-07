import { supabase } from '@/lib/supabaseClient'

export async function getStats() {
  const { data: events, error } = await supabase
    .from('events')
    .select('id, status, total_amount, participants(amount_owed, payment_status)')

  if (error) throw error

  const totalEvents = events.length
  const activeEvents = events.filter((e) => e.status === 'active').length
  const closedEvents = events.filter((e) => e.status === 'closed').length

  let totalLent = 0
  let totalCollected = 0
  let totalPending = 0
  let totalParticipants = 0

  for (const ev of events) {
    totalLent += ev.total_amount ?? 0
    for (const p of ev.participants ?? []) {
      totalParticipants++
      if (p.payment_status === 'paid') {
        totalCollected += p.amount_owed ?? 0
      } else {
        totalPending += p.amount_owed ?? 0
      }
    }
  }

  return {
    totalEvents,
    activeEvents,
    closedEvents,
    totalLent,
    totalCollected,
    totalPending,
    totalParticipants,
  }
}
