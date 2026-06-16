const { onDocumentUpdated } = require('firebase-functions/v2/firestore')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')

initializeApp()
const db = getFirestore()

// Fires whenever a session doc changes. Only acts when currentTurn actually
// changed to a new (non-null) player, and only pushes if that player isn't
// already looking at this exact game (isForeground on their player doc).
exports.notifyOnTurnChange = onDocumentUpdated('sessions/{code}', async (event) => {
  const before = event.data.before.data()
  const after = event.data.after.data()
  const code = event.params.code

  const newTurn = after.currentTurn
  if (!newTurn || newTurn === before.currentTurn) return

  const playerSnap = await db.doc(`sessions/${code}/players/${newTurn}`).get()
  const player = playerSnap.data()
  if (!player || player.status === 'disconnected' || player.isForeground) return

  const userSnap = await db.doc(`users/${newTurn}`).get()
  const tokens = userSnap.data()?.fcmTokens ?? []
  if (!tokens.length) return

  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification: {
      title: 'Kachuful',
      body: `Round ${after.currentRound ?? ''} — it's your turn!`.trim(),
    },
    webpush: {
      fcmOptions: { link: `https://kachuful-70077.web.app/game/${code}` },
      notification: { icon: '/icon-192.png' },
    },
  })

  const invalidTokens = response.responses
    .map((r, i) => (!r.success && isUnregisteredError(r.error) ? tokens[i] : null))
    .filter(Boolean)

  if (invalidTokens.length) {
    await db.doc(`users/${newTurn}`).update({ fcmTokens: FieldValue.arrayRemove(...invalidTokens) })
  }
})

function isUnregisteredError(error) {
  return (
    error?.code === 'messaging/invalid-registration-token' ||
    error?.code === 'messaging/registration-token-not-registered'
  )
}
