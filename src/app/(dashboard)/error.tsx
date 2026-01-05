'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-500/10 p-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <CardTitle className="text-xl">문제가 발생했습니다</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            페이지를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
          </p>
          
          {error.message && process.env.NODE_ENV === 'development' && (
            <div className="p-3 rounded-lg bg-muted text-xs font-mono text-muted-foreground overflow-auto max-h-32">
              {error.message}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={reset} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              다시 시도
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                대시보드로
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
