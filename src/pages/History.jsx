import { Link } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout.jsx'
import Button from '../components/ui/Button.jsx'

export default function History() {
  return (
    <PageLayout title="History">
      <div className="rounded-xl border border-border bg-surface-raised p-5 sm:p-6">
        <p className="text-sm text-muted">
          Your last 4–5 completed sessions will appear here in Phase 3.
        </p>
        <p className="mt-3 text-sm text-muted">
          No completed sessions yet. Finish a game and your stats will show up here.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link to="/" className="sm:col-span-2">
          <Button variant="secondary" className="min-h-12 w-full">
            Back to Menu
          </Button>
        </Link>
      </div>
    </PageLayout>
  )
}
