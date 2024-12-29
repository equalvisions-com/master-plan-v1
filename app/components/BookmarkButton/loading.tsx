'use client'

export function BookmarkLoading() {
  return (
    <button 
      disabled
      className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium
        bg-gray-100 text-gray-400 animate-pulse"
      aria-label="Loading bookmark state"
    >
      <span className="w-20 h-5 bg-gray-200 rounded"></span>
    </button>
  )
} 