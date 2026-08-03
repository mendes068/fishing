import { useTranslation } from 'react-i18next'

declare global {
  interface Window {
    /** Test hook: when true, the dashboard throws so the error boundary is exercised. */
    __THROW_IN_DASHBOARD__?: boolean
  }
}

export default function Dashboard() {
  const { t } = useTranslation('dashboard')
  if (window.__THROW_IN_DASHBOARD__) {
    throw new Error('Test error from dashboard (__THROW_IN_DASHBOARD__)')
  }
  return (
    <div>
      <h1>{t('title')}</h1>
      <p className="text-muted-foreground">{t('title')}</p>
    </div>
  )
}
