'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { Button } from '@/components/ui/button'
import type { AnalysisLog } from '@/lib/actions/analysis'
import type { AnalysisResult } from './analysis-types'
import { PreviewPane } from './components/PreviewPane'
import { PriceAnalysisTabs } from './components/PriceAnalysisTabs'
import { NewStructureTabs } from './components/NewStructureTabs'
import { LegacyTabs } from './components/LegacyTabs'

interface AnalysisResultClientProps {
  analysis: AnalysisLog
}

export function AnalysisResultClient({ analysis }: AnalysisResultClientProps) {
  const result = analysis.analysisResult as unknown as AnalysisResult

  const isPriceAnalysis = !!(result.productComposition || result.unitPricing || result.optionAnalysis)
  const isNewStructure = !!(result.pricing || result.productSettings || result.design || result.copywriting)

  const getInitialTab = () => {
    if (isPriceAnalysis) return 'price-composition'
    if (isNewStructure) return 'pricing'
    return 'structure'
  }

  const [activeTab, setActiveTab] = useState(getInitialTab)
  const isExtensionResult = !!result.analysis && !isNewStructure && !isPriceAnalysis

  const extractDomain = (url: string) => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="분석 결과" subtitle={extractDomain(analysis.targetUrl)} />

      <main className="flex-1 p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/benchmarking">
                <ArrowLeft className="h-4 w-4 mr-2" />
                목록으로
              </Link>
            </Button>
            <div className="h-4 w-px bg-border mx-2" />
            <h1 className="font-semibold text-lg truncate max-w-[200px] sm:max-w-md">
              {result.extractedData?.product?.title || analysis.targetUrl}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open(analysis.targetUrl, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              원본 보기
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start h-full">
          <PreviewPane analysis={analysis} result={result} />

          <div className="flex flex-col gap-6 pb-20">
            {isPriceAnalysis ? (
              <PriceAnalysisTabs result={result} activeTab={activeTab} onTabChange={setActiveTab} />
            ) : isNewStructure ? (
              <NewStructureTabs result={result} activeTab={activeTab} onTabChange={setActiveTab} />
            ) : (
              <LegacyTabs
                result={result}
                isExtensionResult={isExtensionResult}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
