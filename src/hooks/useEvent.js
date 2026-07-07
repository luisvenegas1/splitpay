import { useEffect, useState } from 'react'
import { getEventBySlug } from '@/services/events'

export function useEvent(slug) {
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)

    getEventBySlug(slug)
      .then(setEvent)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [slug])

  return { event, loading, error }
}
