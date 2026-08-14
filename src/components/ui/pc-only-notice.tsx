import { Monitor } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

// Mobile guidance card: the route stays reachable and shows read-only
// context, but the actual work is desktop-only. Wrap the desktop UI in
// `hidden lg:block` and render this in `lg:hidden`.
export function PcOnlyNotice({
  reason,
  status,
}: {
  reason: string
  status?: Array<{ label: string; value: string }>
}) {
  return (
    <Card className="mx-4 my-6 lg:hidden">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-primary" />
          <p className="font-semibold">이 작업은 PC에서 하세요</p>
        </div>
        <p className="text-sm text-muted-foreground">{reason}</p>
        {status && status.length > 0 && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            {status.map((item) => (
              <div key={item.label} className="flex justify-between py-0.5">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
