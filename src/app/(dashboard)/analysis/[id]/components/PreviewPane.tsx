'use client'
/* eslint-disable @next/next/no-img-element -- 분석 대상의 임의 원격 이미지를 원본 비율로 비교합니다. */

import { useState } from 'react'
import { ExternalLink, ImageIcon, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { AnalysisLog } from '@/lib/actions/analysis'
import type { AnalysisResult } from '../analysis-types'

interface PreviewPaneProps {
  analysis: AnalysisLog
  result: AnalysisResult
}

export function PreviewPane({ analysis, result }: PreviewPaneProps) {
  const [iframeError, setIframeError] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)

  const reloadIframe = () => {
    setIframeError(false)
    setIframeKey(prev => prev + 1)
  }

  const getPreviewContent = () => {
    if (!iframeError) {
      return (
        <iframe
          key={iframeKey}
          src={analysis.targetUrl}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-forms"
          onError={() => setIframeError(true)}
        />
      )
    }

    const imageUrl = result.extractedData?.product?.mainImage

    if (imageUrl) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-muted/20">
          <img
            src={imageUrl}
            alt="Product Preview"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-muted/20 text-muted-foreground p-6 text-center">
        <ImageIcon className="h-12 w-12 mb-4 opacity-20" />
        <p>미리보기를 불러올 수 없습니다.</p>
        <Button variant="outline" className="mt-4" onClick={() => window.open(analysis.targetUrl, '_blank')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          새 탭에서 열기
        </Button>
      </div>
    )
  }

  return (
    <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-8rem)] flex flex-col gap-4">
      <Card className="flex-1 overflow-hidden flex flex-col shadow-md border-muted">
        <div className="bg-muted/50 p-2 flex items-center justify-between border-b text-xs">
          <div className="flex items-center gap-2 text-muted-foreground truncate px-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/50" />
            </div>
            <span className="ml-2 truncate max-w-[300px]">{analysis.targetUrl}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={reloadIframe} title="새로고침">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="flex-1 bg-white relative">
          {getPreviewContent()}
          {!iframeError && (
             <div className="absolute top-2 right-2 z-10">
               <Button
                 variant="secondary"
                 size="sm"
                 className="opacity-50 hover:opacity-100 transition-opacity text-xs h-7"
                 onClick={() => setIframeError(true)}
               >
                 이미지로 보기
               </Button>
             </div>
          )}
        </div>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          {result.extractedData?.product?.mainImage && (
            <img
              src={result.extractedData.product.mainImage}
              alt="Thumbnail"
              className="w-16 h-16 rounded-md object-cover border"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline">{analysis.targetPlatform}</Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(result.analyzedAt || analysis.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="font-bold text-lg">
              {result.extractedData?.product?.price?.toLocaleString()}원
              {result.extractedData?.product?.discountRate && (
                <span className="text-red-500 text-sm ml-2">{result.extractedData.product.discountRate}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
