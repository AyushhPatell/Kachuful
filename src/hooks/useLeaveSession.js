import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { leaveGame } from '../firebase/sessions.js'

export function useLeaveSession(code) {
  const navigate = useNavigate()

  return useCallback(async () => {
    try {
      await leaveGame(code)
    } catch (err) {
      console.error('Error leaving session:', err)
    }
    navigate('/')
  }, [code, navigate])
}
