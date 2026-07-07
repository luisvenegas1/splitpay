import { useEffect, useState } from 'react'
import { getParticipantByToken } from '@/services/participants'

export function useParticipant(token) {
  const [participant, setParticipant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    getParticipantByToken(token)
      .then(setParticipant)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [token])

  return { participant, loading, error, setParticipant }
}
