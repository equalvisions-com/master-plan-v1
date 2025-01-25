export function SidebarLoading() {
  return (
    <aside className="w-[var(--activity-sidebar-width)] hidden lg:block">
      <div className="space-y-4">
        <div className="rounded-lg border bg-card">
          <div className="p-4 pb-0">
            <div className="flex items-start gap-4">
              <div className="relative w-20 h-20 shrink-0 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 pt-2 space-y-2">
                <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
                <div className="flex gap-2">
                  <div className="h-9 w-24 bg-muted animate-pulse rounded-full" />
                  <div className="h-9 w-9 bg-muted animate-pulse rounded-full" />
                  <div className="h-9 w-9 bg-muted animate-pulse rounded-full" />
                </div>
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
} 