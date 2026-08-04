import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router'

import { ErrorBoundary } from '@/components/error-boundary'
import { AppLayout } from '@/components/layout'
import { PageLoading } from '@/components/loading-spinner'

/**
 * All routes are mounted under the Vite `base` path (`/fishing/`)
 * so the app works on GitHub Pages. `import.meta.env.BASE_URL` carries a
 * trailing slash, which `createBrowserRouter` accepts for `basename`.
 */
const basename = import.meta.env.BASE_URL

/** Suspense wrapper shared by every lazy route — single definition, no repetition. */
function SuspensePage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoading />}>{children}</Suspense>
}

// Every page is code-split via React.lazy; each becomes its own JS chunk.
const Dashboard = lazy(() => import('@/pages/dashboard'))
const Study = lazy(() => import('@/pages/study'))
const Exam = lazy(() => import('@/pages/exam'))
const Categories = lazy(() => import('@/pages/categories'))
const Statistics = lazy(() => import('@/pages/statistics'))
const Search = lazy(() => import('@/pages/search'))
const Favorites = lazy(() => import('@/pages/favorites'))
const Notes = lazy(() => import('@/pages/notes'))
const Flashcards = lazy(() => import('@/pages/flashcards'))
const Encyclopedia = lazy(() => import('@/pages/encyclopedia'))
const EncyclopediaDetail = lazy(() => import('@/pages/encyclopedia/[id]'))
const Glossary = lazy(() => import('@/pages/glossary'))
const Import = lazy(() => import('@/pages/import'))
const Settings = lazy(() => import('@/pages/settings'))

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppLayout />,
      errorElement: <ErrorBoundary />,
      children: [
        {
          index: true,
          element: (
            <SuspensePage>
              <Dashboard />
            </SuspensePage>
          ),
          errorElement: <ErrorBoundary />,
        },
        {
          path: 'study',
          element: (
            <SuspensePage>
              <Study />
            </SuspensePage>
          ),
          errorElement: <ErrorBoundary />,
        },
        {
          path: 'exam',
          element: (
            <SuspensePage>
              <Exam />
            </SuspensePage>
          ),
          errorElement: <ErrorBoundary />,
        },
        {
          path: 'categories',
          element: (
            <SuspensePage>
              <Categories />
            </SuspensePage>
          ),
          errorElement: <ErrorBoundary />,
        },
        {
          path: 'stats',
          element: (
            <SuspensePage>
              <Statistics />
            </SuspensePage>
          ),
          errorElement: <ErrorBoundary />,
        },
        {
          path: 'search',
          element: (
            <SuspensePage>
              <Search />
            </SuspensePage>
          ),
          errorElement: <ErrorBoundary />,
        },
        {
          path: 'favorites',
          element: (
            <SuspensePage>
              <Favorites />
            </SuspensePage>
          ),
          errorElement: <ErrorBoundary />,
        },
        {
          path: 'notes',
          element: (
            <SuspensePage>
              <Notes />
            </SuspensePage>
          ),
          errorElement: <ErrorBoundary />,
        },
        {
          path: 'flashcards',
          element: (
            <SuspensePage>
              <Flashcards />
            </SuspensePage>
          ),
          errorElement: <ErrorBoundary />,
        },
        {
          path: 'encyclopedia',
          element: (
            <SuspensePage>
              <Encyclopedia />
            </SuspensePage>
          ),
          errorElement: <ErrorBoundary />,
        },
        {
          path: 'encyclopedia/:id',
          element: (
            <SuspensePage>
              <EncyclopediaDetail />
            </SuspensePage>
          ),
          errorElement: <ErrorBoundary />,
        },
        {
          path: 'glossary',
          element: (
            <SuspensePage>
              <Glossary />
            </SuspensePage>
          ),
          errorElement: <ErrorBoundary />,
        },
        {
          path: 'import',
          element: (
            <SuspensePage>
              <Import />
            </SuspensePage>
          ),
          errorElement: <ErrorBoundary />,
        },
        {
          path: 'settings',
          element: (
            <SuspensePage>
              <Settings />
            </SuspensePage>
          ),
          errorElement: <ErrorBoundary />,
        },
      ],
    },
  ],
  { basename },
)

export default router
