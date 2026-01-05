'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, UserPlus, User, KeyRound, Mail, Rocket, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다.')
      return
    }

    if (password.length < 6) {
      toast.error('비밀번호는 6자 이상이어야 합니다.')
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('회원가입 완료! 이메일을 확인해주세요.')
      router.push('/login')
    } catch {
      toast.error('회원가입 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
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
              회원가입
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed font-light">
              스마트스토어 관리 시스템에 가입하고 효율적인 이커머스 운영을 시작하세요.
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-12 space-y-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground font-mono">
            <Shield className="h-4 w-4 text-primary" />
            <span>안전한 데이터 암호화</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground font-mono">
            <Mail className="h-4 w-4 text-primary" />
            <span>이메일 인증 필요</span>
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-card">
        <div className="mb-8">
          <h3 className="text-2xl font-bold tracking-tight">
            계정 만들기
          </h3>
          <p className="text-muted-foreground mt-2 text-sm">
            아래 정보를 입력하여 계정을 생성하세요.
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
                minLength={6}
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              비밀번호 확인
            </Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 h-12 bg-background"
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <Button
              type="submit"
              className="w-full h-12 text-sm font-bold"
              disabled={isLoading}
            >
              <UserPlus className="h-5 w-5 mr-2" />
              {isLoading ? '가입 중...' : '회원가입'}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">이미 계정이 있으신가요? </span>
              <Link
                href="/login"
                className="font-medium hover:text-primary transition-colors"
              >
                로그인
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
