import { useEffect, useState } from 'react'
import { getStats } from '@/services/stats'

export function useStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  return { stats, loading, error }
}
