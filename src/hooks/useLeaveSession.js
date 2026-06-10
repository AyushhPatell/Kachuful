<<<<<<< HEAD
import { useCallback } from 'react'
=======
>>>>>>> 6d43acd (Some Improvements)
import { useNavigate } from 'react-router-dom'

export function useLeaveSession() {
  const navigate = useNavigate()
<<<<<<< HEAD

  return useCallback(() => {
    navigate('/')
  }, [navigate])
=======
  return () => navigate('/')
>>>>>>> 6d43acd (Some Improvements)
}
