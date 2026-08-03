import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import './index.css'
import './i18n'
import { router } from './router.tsx'
import { PageLoading } from './components/loading-spinner.tsx'
import { ThemeProvider } from './components/theme-provider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<PageLoading />}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </Suspense>
  </StrictMode>,
)
