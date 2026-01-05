'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="ko">
      <body className="bg-background text-foreground">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-red-500/10 p-6">
                <AlertTriangle className="h-12 w-12 text-red-500" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-2">예상치 못한 오류가 발생했습니다</h1>
            <p className="text-muted-foreground mb-6">
              서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.
            </p>
            
            {error.message && process.env.NODE_ENV === 'development' && (
              <div className="p-3 rounded-lg bg-muted text-xs font-mono text-muted-foreground overflow-auto max-h-32 mb-6 text-left">
                {error.message}
              </div>
            )}

            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
