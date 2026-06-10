import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

export function useLeaveSession() {
  const navigate = useNavigate()

  return useCallback(() => {
    navigate('/')
  }, [navigate])
}
