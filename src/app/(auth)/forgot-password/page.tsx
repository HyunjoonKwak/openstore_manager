'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, Rocket, Shield, Send, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      toast.error('이메일을 입력해주세요.')
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/settings`,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      setIsEmailSent(true)
      toast.success('비밀번호 재설정 이메일이 전송되었습니다.')
    } catch {
      toast.error('요청 처리 중 오류가 발생했습니다.')
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
              비밀번호 찾기
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed font-light">
              비밀번호를 잊으셨나요? 걱정하지 마세요. 등록된 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-12 space-y-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground font-mono">
            <Shield className="h-4 w-4 text-primary" />
            <span>안전한 재설정 프로토콜</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground font-mono">
            <Mail className="h-4 w-4 text-primary" />
            <span>이메일 인증 필요</span>
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-card">
        {isEmailSent ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight mb-2">
              이메일 전송 완료
            </h3>
            <p className="text-muted-foreground mb-6">
              비밀번호 재설정 링크가 <strong>{email}</strong>으로 전송되었습니다.
              이메일을 확인해주세요.
            </p>
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsEmailSent(false)}
              >
                다른 이메일로 다시 시도
              </Button>
              <Link href="/login">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  로그인으로 돌아가기
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <Link
                href="/login"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                로그인으로 돌아가기
              </Link>
              <h3 className="text-2xl font-bold tracking-tight">
                비밀번호 재설정
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                가입 시 사용한 이메일 주소를 입력해주세요.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  이메일
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full h-12 text-sm font-bold"
                  disabled={isLoading}
                >
                  <Send className="h-5 w-5 mr-2" />
                  {isLoading ? '전송 중...' : '재설정 링크 전송'}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
