'use client'

import Link from 'next/link'
import { ArrowLeft, Download, Chrome, CheckCircle2, ExternalLink } from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ExtensionGuidePage() {
  return (
    <>
      <Header title="크롬 익스텐션 설치" subtitle="Extension Guide" />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" size="sm" asChild className="mb-6">
            <Link href="/benchmarking">
              <ArrowLeft className="h-4 w-4 mr-2" />
              벤치마킹으로 돌아가기
            </Link>
          </Button>

          <Card className="mb-6">
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-xl">
                  <Chrome className="h-10 w-10 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">스토어 벤치마킹 분석기</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    네이버 스마트스토어 상품 페이지를 AI로 분석합니다
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <Button className="w-full gap-2" size="lg" asChild>
                <a href="/chrome-extension.zip" download>
                  <Download className="h-5 w-5" />
                  익스텐션 다운로드
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader className="border-b border-border py-4">
              <CardTitle className="text-lg">설치 방법</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ol className="space-y-6">
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">익스텐션 파일 다운로드</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      위 버튼을 클릭하여 ZIP 파일을 다운로드합니다.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">압축 해제</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      다운로드한 ZIP 파일의 압축을 원하는 위치에 풀어줍니다.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Chrome 확장프로그램 페이지 열기</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Chrome 주소창에 <code className="px-2 py-1 bg-muted rounded text-xs">chrome://extensions</code>를 입력합니다.
                    </p>
                    <Button variant="outline" size="sm" className="mt-2 gap-2" asChild>
                      <a href="chrome://extensions" target="_blank">
                        <ExternalLink className="h-3 w-3" />
                        확장프로그램 페이지 열기
                      </a>
                    </Button>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">
                    4
                  </div>
                  <div>
                    <p className="font-medium">개발자 모드 활성화</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      우측 상단의 &quot;개발자 모드&quot; 토글을 켜줍니다.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">
                    5
                  </div>
                  <div>
                    <p className="font-medium">익스텐션 로드</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      &quot;압축해제된 확장 프로그램을 로드합니다&quot; 버튼을 클릭하고, 압축 해제한 폴더를 선택합니다.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">설치 완료!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      브라우저 우측 상단에 익스텐션 아이콘이 표시됩니다.
                    </p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border py-4">
              <CardTitle className="text-lg">사용 방법</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ol className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium">1</span>
                  <p className="text-sm">네이버 스마트스토어 상품 페이지로 이동합니다.</p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium">2</span>
                  <p className="text-sm">브라우저 우측 상단의 익스텐션 아이콘을 클릭합니다.</p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium">3</span>
                  <p className="text-sm">&quot;AI 분석 시작&quot; 버튼을 클릭합니다.</p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium">4</span>
                  <p className="text-sm">분석이 완료되면 결과 페이지로 자동 이동합니다.</p>
                </li>
              </ol>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>팁:</strong> 상품 페이지 우측 하단에 나타나는 보라색 버튼을 클릭해도 바로 분석을 시작할 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
