import { Header } from '@/components/layouts/Header'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function OrdersLoading() {
  return (
    <>
      <Header title="주문 관리" subtitle="Order Management" />

      <div className="flex-1 overflow-hidden p-3 lg:p-4 pb-16 lg:pb-4 flex flex-col">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-7 w-20" />
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-2 mb-3">
          <Skeleton className="h-8 flex-1 max-w-sm" />
          <div className="flex flex-wrap gap-1.5">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>

        <Card className="flex-1">
          <CardContent className="p-4">
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
