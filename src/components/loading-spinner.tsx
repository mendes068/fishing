import { cn } from '@/lib/utils'

/**
 * Reusable loading spinner. Uses only CSS-variable-based Tailwind classes
 * (no hardcoded hex colors) so it adapts to light/dark theme automatically.
 */
export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div
      data-testid="loading-spinner"
      className={cn(
        'size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary',
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  )
}

/**
 * Full-page loading fallback (route-level Suspense): skeleton blocks that
 * mimic the app shell so navigation feels instant.
 */
export function PageLoading() {
  return (
    <div
      data-testid="loading-spinner"
      className="flex min-h-dvh w-full items-center justify-center bg-background"
      role="status"
      aria-label="Loading"
    >
      <div className="flex w-full max-w-md flex-col gap-4 p-6">
        <div className="h-8 w-2/3 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-3 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-16 animate-pulse rounded-lg bg-muted',
                i % 2 === 1 && 'w-5/6',
              )}
            />
          ))}
        </div>
        <div className="flex items-center justify-center pt-6">
          <LoadingSpinner />
        </div>
      </div>
    </div>
  )
}
