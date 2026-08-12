import React from 'react'

export default class ErrorBoundary extends React.Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Keep diagnostics in the browser console without exposing implementation details to users.
    console.error('Tarteel UI error', error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return <main className="grid min-h-screen place-items-center bg-[#f7faf8] px-5 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-7 text-center shadow-sm" role="alert">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-700" aria-hidden="true">!</div>
        <h1 className="mt-5 text-xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Tarteel could not render this screen. Your saved reading progress is kept locally.</p>
        <button
          type="button"
          onClick={this.handleRetry}
          className="mt-6 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
        >
          Try again
        </button>
      </section>
    </main>
  }
}
