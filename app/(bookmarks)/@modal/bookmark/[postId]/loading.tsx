export default function BookmarkModalLoading() {
  return (
    <div className="fixed inset-0 bg-black/30 z-50">
      <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white p-6 shadow-lg">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
          <div className="h-10 w-24 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  )
} 