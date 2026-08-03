import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Functional fallback UI. Rendered as a child of the class boundary so it can
 * use hooks (`useNavigate`, `useTranslation`) — class components cannot.
 */
function ErrorFallback({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation('errors')
  const { t: tCommon } = useTranslation()
  const navigate = useNavigate()

  return (
    <div
      data-testid="error-fallback"
      role="alert"
      className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground"
    >
      <h1 className="text-2xl font-bold">{t('unexpected')}</h1>
      <p className="text-muted-foreground">{t('retry')}</p>
      <div className="flex gap-3">
        <Button onClick={onReset} data-testid="error-retry">
          {t('retry')}
        </Button>
        <Button variant="outline" onClick={() => navigate('/')}>
          {tCommon('back')}
        </Button>
      </div>
    </div>
  )
}

/**
 * Route-level error boundary. Wired into every route via `errorElement` so a
 * render error in any page (or its lazy chunk) shows the fallback instead of a
 * blank screen.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Dev logging — intentional; the boundary is the last line of defense.
    console.error('Uncaught error in app:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={this.handleReset} />
    }
    return this.props.children
  }
}

export default ErrorBoundary
