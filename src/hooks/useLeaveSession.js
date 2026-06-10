import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { markPlayerDisconnected, transferHostOnLeave } from '../firebase/sessions.js'

export function useLeaveSession(code, userId) {
  const navigate = useNavigate()
  return useCallback(async () => {
    if (code && userId) {
      await Promise.all([
        transferHostOnLeave(code),
        markPlayerDisconnected(code, userId),
      ]).catch(() => {})
    }
    navigate('/')
  }, [navigate, code, userId])
}
