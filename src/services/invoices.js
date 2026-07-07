import { supabase } from '@/lib/supabaseClient'

const BUCKET = 'invoices'

export async function uploadInvoice(eventId, file) {
  const ext = file.name.split('.').pop()
  const path = `${eventId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false })
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  const fileType = ['pdf'].includes(ext.toLowerCase()) ? 'pdf' : 'image'

  const { data, error } = await supabase
    .from('invoices')
    .insert({ event_id: eventId, file_url: publicUrl, file_type: fileType })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteInvoice(invoiceId, fileUrl) {
  // Extraer path relativo del bucket
  const path = fileUrl.split(`${BUCKET}/`)[1]
  await supabase.storage.from(BUCKET).remove([path])

  const { error } = await supabase.from('invoices').delete().eq('id', invoiceId)
  if (error) throw error
}
