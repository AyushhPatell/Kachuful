import { Component } from 'react'

// React only supports error boundaries via class components — no hook
// equivalent exists. Without this, any uncaught render error unmounts the
// whole app to a blank white screen with no way to recover, which is
// especially bad on a home-screen-saved iOS app (no URL bar, no reload).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-2xl">🃏</p>
          <p className="text-sm text-zinc-300">Something went wrong.</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #c9963a, #a67828)' }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
