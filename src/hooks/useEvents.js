import { useEffect, useState } from 'react'
import { getEvents } from '@/services/events'

export function useEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  return { events, loading, error }
}
