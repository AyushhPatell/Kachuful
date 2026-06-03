import { useEffect, useMemo, useState } from 'react'
import {
  fetchJoinRequests,
  mergeJoinRequestLists,
  parseJoinRequests,
  subscribeToJoinRequests,
} from '../firebase/sessions.js'

/**
 * Owner lobby/game: live list from joinRequests subcollection (one doc per joiner),
 * merged with legacy session fields for older sessions.
 */
export function useJoinRequests(code, session, isOwner) {
  const [fromSubcollection, setFromSubcollection] = useState([])
  const [listenError, setListenError] = useState(null)

  useEffect(() => {
    if (!isOwner) {
      setFromSubcollection([])
      setListenError(null)
      return undefined
    }

    let cancelled = false

    fetchJoinRequests(code)
      .then((fetched) => {
        if (!cancelled) setFromSubcollection(fetched)
      })
      .catch((err) => {
        console.error('fetchJoinRequests failed:', err)
      })

    const unsub = subscribeToJoinRequests(
      code,
      setFromSubcollection,
      (err) => setListenError(err),
    )

    return () => {
      cancelled = true
      unsub()
    }
  }, [code, isOwner])

  const joinRequests = useMemo(
    () => mergeJoinRequestLists(fromSubcollection, parseJoinRequests(session)),
    [fromSubcollection, session],
  )

  return { joinRequests, listenError }
}
