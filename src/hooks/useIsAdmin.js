import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { subscribeToAdminStatus } from '../lib/admin.js'

/** True when the signed-in user is a bootstrap-email admin or has an `admins/{uid}` doc. */
export function useIsAdmin() {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  // subscribeToAdminStatus resolves false itself when there's no user.
  useEffect(() => subscribeToAdminStatus(user, setIsAdmin), [user])
  return isAdmin
}
