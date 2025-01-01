import { Card, CardHeader, CardContent } from '@/app/components/ui/card'
import { Skeleton } from '@/app/components/ui/skeleton'
import { AppDock } from '@/app/components/AppDock'

export default function Loading() {
  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <header className="border-b">
        <div className="container mx-auto px-4">
          <div className="h-16" /> {/* Nav height placeholder */}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="flex-1">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                  </div>
                  <Skeleton className="h-8 w-20 ml-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 md:hidden">
        <AppDock />
      </div>
    </div>
  )
} 