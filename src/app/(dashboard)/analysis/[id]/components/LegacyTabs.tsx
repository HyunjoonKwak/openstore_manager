'use client'

import { ImageIcon, Layout, MessageSquare, Palette } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { AnalysisResult } from '../analysis-types'

interface LegacyTabsProps {
  result: AnalysisResult
  isExtensionResult: boolean
  activeTab: string
  onTabChange: (value: string) => void
}

export function LegacyTabs({ result, isExtensionResult, activeTab, onTabChange }: LegacyTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6 h-auto sm:h-9">
        <TabsTrigger value="structure"><Layout className="h-4 w-4 mr-2"/>구조</TabsTrigger>
        <TabsTrigger value="design"><Palette className="h-4 w-4 mr-2"/>디자인</TabsTrigger>
        <TabsTrigger value="copy"><MessageSquare className="h-4 w-4 mr-2"/>마케팅</TabsTrigger>
        <TabsTrigger value="assets"><ImageIcon className="h-4 w-4 mr-2"/>에셋</TabsTrigger>
      </TabsList>

      <TabsContent value="structure" className="space-y-6">
         {result.structure && (
           <Card>
             <CardHeader><CardTitle>페이지 구조</CardTitle></CardHeader>
             <CardContent className="space-y-4">
               <p className="text-muted-foreground">{result.structure.summary}</p>
               <div className="space-y-2">
                 {result.structure.sections.map((s, i) => (
                   <div key={i} className="p-3 border rounded-lg">
                     <span className="font-bold mr-2">{s.title}</span>
                     <span className="text-sm text-muted-foreground">{s.content}</span>
                   </div>
                 ))}
               </div>
             </CardContent>
           </Card>
         )}
         {isExtensionResult && result.analysis?.structure && (
           <Card>
              <CardHeader><CardTitle>구조 분석 (Extension)</CardTitle></CardHeader>
              <CardContent>
                <p>{result.analysis.structure.overallFlow}</p>
              </CardContent>
           </Card>
         )}
      </TabsContent>

      <TabsContent value="design" className="space-y-6">
        {result.style && (
          <Card>
            <CardHeader><CardTitle>디자인 분석</CardTitle></CardHeader>
            <CardContent>
              <p>레이아웃: {result.style.layoutPattern}</p>
              <div className="flex gap-2 mt-4">
                {result.style.colors.map((c,i) => (
                  <div key={i} className="w-8 h-8 rounded" style={{backgroundColor: c.hex}} title={c.hex} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="copy" className="space-y-6">
        {result.style?.copyHighlights && (
          <Card>
            <CardHeader><CardTitle>카피 분석</CardTitle></CardHeader>
            <CardContent className="space-y-4">
               <div>
                 <h4 className="font-bold">Hooks</h4>
                 <ul>{result.style.copyHighlights.hooks.map((h,i)=><li key={i}>{h}</li>)}</ul>
               </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="assets">
         <Card><CardContent className="p-6 text-center text-muted-foreground">에셋 정보는 새 탭 &apos;에셋&apos;을 확인하세요.</CardContent></Card>
      </TabsContent>
    </Tabs>
  )
}
