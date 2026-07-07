import { supabase } from '@/lib/supabaseClient'

// ── Perfil ──────────────────────────────────────────────────

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data ?? null
}

export async function upsertProfile(userId, payload) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...payload }, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Lista todos los usuarios registrados (selector de admin en EventForm) */
export async function getAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, phone')
    .order('name')
  if (error) throw error
  return data ?? []
}

// ── Cuentas bancarias ────────────────────────────────────────

export async function getBankAccounts(profileId) {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('profile_id', profileId)
    .order('currency')
    .order('created_at')
  if (error) throw error
  return data ?? []
}

export async function addBankAccount(profileId, payload) {
  const { data, error } = await supabase
    .from('bank_accounts')
    .insert({ profile_id: profileId, ...payload })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateBankAccount(id, payload) {
  const { data, error } = await supabase
    .from('bank_accounts')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBankAccount(id) {
  const { error } = await supabase.from('bank_accounts').delete().eq('id', id)
  if (error) throw error
}
