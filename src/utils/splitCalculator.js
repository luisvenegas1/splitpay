/**
 * Divide el total en partes iguales entre los participantes.
 * Redondea el sobrante al primer participante.
 */
export function splitEqual(total, participantCount) {
  if (participantCount === 0) return []
  const base = Math.floor(total / participantCount)
  const remainder = total - base * participantCount
  return Array.from({ length: participantCount }, (_, i) =>
    i === 0 ? base + remainder : base
  )
}

/**
 * Divide por porcentaje.
 * percentages: [33, 33, 34] (deben sumar 100)
 */
export function splitByPercentage(total, percentages) {
  return percentages.map((pct) => Math.round((total * pct) / 100))
}

/**
 * Calcula el total a pagar por participante según sus item_splits.
 */
export function calcParticipantTotal(itemSplits) {
  return itemSplits.reduce((sum, split) => sum + (split.amount ?? 0), 0)
}
