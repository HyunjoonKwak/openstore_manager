'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, LogIn, User, KeyRound, Rocket, CheckCircle, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

function LoginErrorHandler() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'auth_callback_error') {
      toast.error('인증 처리 중 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }, [searchParams])

  return null
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('로그인 성공!')
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('로그인 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Suspense fallback={null}>
        <LoginErrorHandler />
      </Suspense>
      <div className="flex flex-col md:flex-row shadow-2xl rounded-2xl overflow-hidden border border-border bg-card">
      <div className="w-full md:w-1/2 bg-background p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-card rounded flex items-center justify-center border border-border">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-wider">스마트스토어</h1>
          </div>

          <div className="mt-12">
            <h2 className="text-4xl font-black leading-tight tracking-tight mb-4">
              로그인
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed font-light">
              스마트스토어 관리 시스템에 오신 것을 환영합니다. 재고 관리, 주문 처리, AI 상세페이지 생성까지 한 곳에서 관리하세요.
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-12 space-y-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground font-mono">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>시스템 정상 운영 중</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground font-mono">
            <Lock className="h-4 w-4 text-green-500" />
            <span>보안 연결 활성화</span>
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-card">
        <div className="mb-8">
          <h3 className="text-2xl font-bold tracking-tight">
            계정 로그인
          </h3>
          <p className="text-muted-foreground mt-2 text-sm">
            이메일과 비밀번호를 입력하여 로그인하세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              이메일
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 bg-background"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              비밀번호
            </Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12 bg-background"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <Button
              type="submit"
              className="w-full h-12 text-sm font-bold"
              disabled={isLoading}
            >
              <LogIn className="h-5 w-5 mr-2" />
              {isLoading ? '로그인 중...' : '로그인'}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <Link
                href="/forgot-password"
                className="font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                비밀번호 찾기
                <span className="text-xs">&rarr;</span>
              </Link>
              <Link
                href="/signup"
                className="font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                회원가입
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
    </>
  )
}
