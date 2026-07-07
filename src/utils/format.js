/**
 * Formatea un número como colones costarricenses.
 * Ej: 7500 → "₡7.500"
 */
export function formatCRC(amount) {
  if (amount == null) return '₡0'
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formatea una fecha ISO a texto legible en español.
 * Ej: "2024-07-15" → "15 de julio, 2024"
 */
export function formatDate(dateString) {
  if (!dateString) return ''
  // Parse as local date to avoid UTC offset shifting the day
  // '2026-07-07' → new Date(2026, 6, 7) stays on July 7 regardless of timezone
  const [year, month, day] = String(dateString).substring(0, 10).split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat('es-CR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

/**
 * Genera un slug URL-friendly desde un texto.
 * Ej: "Carne Asada Julio" → "carne-asada-julio"
 */
export function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/**
 * Genera un token único para el enlace de pago.
 * Ej: "ABX92831"
 */
export function generatePaymentToken() {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}
