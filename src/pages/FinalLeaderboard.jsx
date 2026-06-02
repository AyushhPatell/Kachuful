import { Link, useParams } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout.jsx'
import Button from '../components/ui/Button.jsx'

export default function FinalLeaderboard() {
  const { code } = useParams()

  return (
    <PageLayout title="Final Standings">
      <section className="rounded-xl border border-border bg-surface-raised p-5 sm:p-6">
        <p className="text-sm text-muted">Session code</p>
        <p className="mt-1 break-all font-mono text-lg font-semibold tracking-wider text-accent">{code}</p>
        <p className="mt-4 text-sm text-muted">
          Round summary, voting, and final rankings will be wired up next.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link to="/" className="sm:col-span-2">
          <Button className="min-h-12 w-full">Back to Menu</Button>
        </Link>
      </div>
    </PageLayout>
  )
}
