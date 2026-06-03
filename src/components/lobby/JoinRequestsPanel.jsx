import Button from '../ui/Button.jsx'

export default function JoinRequestsPanel({
  joinRequests,
  newRequestPing = false,
  onAccept,
  onReject,
  compact = false,
}) {
  if (!joinRequests.length && compact) return null

  return (
    <section
      className={`rounded-xl border bg-surface-raised p-4 transition ${
        newRequestPing && joinRequests.length
          ? 'border-accent ring-1 ring-accent/40'
          : 'border-border'
      }`}
    >
      <h2 className="mb-3 text-sm font-medium text-muted">
        Join requests ({joinRequests.length})
      </h2>
      {joinRequests.length ? (
        <ul className="space-y-2">
          {joinRequests.map((request) => (
            <li
              key={request.userId}
              className="flex flex-col gap-3 rounded-lg bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="truncate">{request.name}</span>
              <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex">
                <Button className="min-h-11 px-3 py-2 text-xs" onClick={() => onAccept(request)}>
                  Accept
                </Button>
                <Button
                  variant="danger"
                  className="min-h-11 px-3 py-2 text-xs"
                  onClick={() => onReject(request.userId)}
                >
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg bg-surface px-4 py-3 text-sm text-muted">
          No pending requests right now.
        </p>
      )}
    </section>
  )
}
