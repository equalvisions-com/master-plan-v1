'use client'

interface BookmarkErrorProps {
  error: Error
  resetErrorBoundary: () => void
}

export function BookmarkError({ error, resetErrorBoundary }: BookmarkErrorProps) {
  return (
    <div role="alert" className="inline-flex flex-col gap-2">
      <button 
        onClick={resetErrorBoundary}
        className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium
          bg-red-50 text-red-700 hover:bg-red-100"
      >
        Try again
      </button>
    </div>
  )
} 