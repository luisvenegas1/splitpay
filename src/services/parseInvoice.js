import { supabase } from '@/lib/supabaseClient'

/**
 * Convierte un File a base64
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // Quitar el prefijo "data:image/jpeg;base64,"
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Manda la factura a la Edge Function y devuelve los ítems parseados
 * @param {File} file
 * @returns {{ items, iv_rate, service_rate, total_detected, notes }}
 */
export async function parseInvoice(file) {
  const imageBase64 = await fileToBase64(file)
  const mimeType = file.type || 'image/jpeg'

  const { data, error } = await supabase.functions.invoke('parse-invoice', {
    body: { imageBase64, mimeType },
  })

  if (error) throw new Error(error.message ?? 'Error al analizar la factura')
  if (data?.error) throw new Error(data.error)

  return data
}
