'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border bg-card p-8">
          <h2 className="text-xl font-semibold text-red-600">
            Error loading bookmarks
          </h2>
          <p className="mt-2 text-gray-600">{error.message}</p>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={reset}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  )
} 