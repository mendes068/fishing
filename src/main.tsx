import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { PageLoading } from './components/loading-spinner.tsx'
import { ThemeProvider } from './components/theme-provider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<PageLoading />}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </Suspense>
  </StrictMode>,
)
