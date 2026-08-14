'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Download, Loader2, RotateCcw, Send, Sparkles, User } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layouts/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  createInterviewSession,
  submitInterviewAnswer,
  generateFromInterview,
  type InterviewState,
} from '@/lib/actions/interview'
import { INTERVIEW_FLOW } from '@/lib/studio/interview-flow'

// Chat-style Socratic interview ported from detailpage_maker. One
// question at a time; answers accumulate into the session context and
// generation renders the category template.

interface ChatMessage {
  role: 'assistant' | 'user'
  text: string
}

export function InterviewClient() {
  const [state, setState] = useState<InterviewState | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, generatedHtml])

  const start = async () => {
    setIsBusy(true)
    setGeneratedHtml(null)
    try {
      const result = await createInterviewSession()
      if (result.data) {
        setState(result.data)
        setMessages([{ role: 'assistant', text: result.data.question.question }])
      } else {
        toast.error(result.error || '세션 생성에 실패했습니다.')
      }
    } finally {
      setIsBusy(false)
    }
  }

  const answer = async (value: string) => {
    if (!state) return
    setIsBusy(true)
    setMessages((current) => [...current, { role: 'user', text: value || '(건너뜀)' }])
    setInputValue('')
    try {
      const result = await submitInterviewAnswer({
        sessionId: state.sessionId,
        fieldName: state.question.fieldName,
        value,
      })
      if (result.data) {
        setState(result.data)
        setMessages((current) => [
          ...current,
          { role: 'assistant', text: result.data!.question.question },
        ])
      } else {
        toast.error(result.error || '답변 저장에 실패했습니다.')
      }
    } finally {
      setIsBusy(false)
    }
  }

  const generate = async () => {
    if (!state) return
    setIsBusy(true)
    try {
      const result = await generateFromInterview({ sessionId: state.sessionId })
      if (result.data) {
        setGeneratedHtml(result.data.htmlContent)
        toast.success('상세페이지가 생성되었습니다.')
      } else {
        toast.error(result.error || '생성에 실패했습니다.')
      }
    } finally {
      setIsBusy(false)
    }
  }

  const downloadHtml = () => {
    if (!generatedHtml) return
    const blob = new Blob([generatedHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `상세페이지-${new Date().toISOString().slice(0, 10)}.html`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const copyHtml = async () => {
    if (!generatedHtml) return
    await navigator.clipboard.writeText(generatedHtml)
    toast.success('HTML이 복사되었습니다.')
  }

  const question = state?.question
  const completed = question?.inputType === 'complete'
  const progressPercent = Math.round((state?.progress || 0) * 100)

  return (
    <>
      <Header title="AI 인터뷰" subtitle="문답으로 만드는 상세페이지" />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden p-4 pb-20 lg:pb-4">
        {!state ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <Sparkles className="h-10 w-10 text-primary" />
            <div>
              <p className="mb-1 text-lg font-semibold">문답 인터뷰로 상세페이지 만들기</p>
              <p className="text-sm text-muted-foreground">
                {INTERVIEW_FLOW.length}개의 질문에 답하면 카테고리에 맞는 상세페이지를 만들어드립니다.
              </p>
            </div>
            <Button onClick={start} disabled={isBusy}>
              {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              인터뷰 시작
            </Button>
          </div>
        ) : (
          <>
            {/* Progress */}
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Chat */}
            <div className="flex-1 space-y-3 overflow-y-auto pb-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn('flex gap-2.5', message.role === 'user' && 'flex-row-reverse')}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      message.role === 'assistant'
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {message.role === 'assistant' ? (
                      <Bot className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                      message.role === 'assistant'
                        ? 'rounded-tl-sm bg-muted'
                        : 'rounded-tr-sm bg-primary text-primary-foreground'
                    )}
                  >
                    {message.text}
                  </div>
                </div>
              ))}

              {generatedHtml && (
                <Card>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">생성 결과 미리보기</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={copyHtml}>
                          HTML 복사
                        </Button>
                        <Button size="sm" variant="outline" onClick={downloadHtml}>
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          다운로드
                        </Button>
                      </div>
                    </div>
                    <iframe
                      srcDoc={generatedHtml}
                      title="상세페이지 미리보기"
                      className="h-96 w-full rounded-lg border border-border bg-white"
                      sandbox=""
                    />
                  </CardContent>
                </Card>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border pt-3">
              {completed ? (
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={generate} disabled={isBusy}>
                    {isBusy ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    상세페이지 생성
                  </Button>
                  <Button variant="outline" onClick={start} disabled={isBusy}>
                    <RotateCcw className="mr-1.5 h-4 w-4" />
                    새로 시작
                  </Button>
                </div>
              ) : question?.inputType === 'select' ? (
                <div className="flex flex-wrap gap-2">
                  {question.options?.map((option) => (
                    <Button
                      key={option}
                      variant="outline"
                      size="sm"
                      onClick={() => answer(option)}
                      disabled={isBusy}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              ) : (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (inputValue.trim() || question?.optional) answer(inputValue.trim())
                  }}
                >
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={question?.optional ? '답변 입력 (비워두면 건너뜀)' : '답변을 입력하세요'}
                    disabled={isBusy}
                    autoFocus
                  />
                  <Button type="submit" disabled={isBusy || (!inputValue.trim() && !question?.optional)}>
                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
