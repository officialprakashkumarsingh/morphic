'use client'

import type { ToolInvocation } from 'ai'

interface ScreenshotAnalysisResult {
  type: 'screenshot_analysis'
  imageUrl: string
  extractedText: string
  confidence: number
  wordCount: number
  lineCount: number
  analysis: string
  timestamp: string
  status: 'success' | 'error'
}

interface ScreenshotAnalysisSectionProps {
  tool: ToolInvocation
}

export function ScreenshotAnalysisSection({ tool }: ScreenshotAnalysisSectionProps) {
  const data: ScreenshotAnalysisResult | undefined = (() => {
    try {
      if (tool.state === 'result') {
        const result = (tool as any).result
        if (result) {
          if (typeof result === 'string') {
            return JSON.parse(result)
          } else if (typeof result === 'object') {
            return result as ScreenshotAnalysisResult
          }
        }
      }
      return undefined
    } catch (error) {
      console.error('Failed to parse OCR data:', error, 'Raw result:', (tool as any).result)
      return {
        type: 'screenshot_analysis',
        imageUrl: '',
        extractedText: '',
        confidence: 0,
        analysis: `Failed to parse screenshot analysis data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        status: 'error'
      } as ScreenshotAnalysisResult
    }
  })()

  if (tool.state === 'call') {
    return (
              <div className="bg-muted p-4 rounded-lg border animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="font-medium">🔍 Analyzing Screenshot...</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Extracting text and analyzing screenshot content. This may take a moment for complex images...
          </p>
        </div>
    )
  }

  if (!data) {
          return (
        <div className="bg-muted p-4 rounded-lg border">
          <span className="text-sm text-muted-foreground">Screenshot analysis incomplete</span>
        </div>
      )
  }

  if (data.status === 'error') {
    return (
              <div className="bg-red-50 border-red-200 p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-600">❌</span>
            <span className="font-medium text-red-800">Screenshot Analysis Failed</span>
          </div>
          <div className="text-sm text-red-700 whitespace-pre-wrap">
            {data.analysis}
          </div>
        </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Screenshot Analysis Results Header */}
      <div className="bg-green-50 border-green-200 p-4 rounded-lg border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-green-600">🔍</span>
            <span className="font-medium text-green-800">Screenshot Analysis Complete</span>
          </div>
          <div className="text-sm text-green-600">
            {data.confidence}% confidence
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-green-700 font-medium">Characters:</span>
            <span className="ml-1 text-green-600">{data.extractedText.length}</span>
          </div>
          <div>
            <span className="text-green-700 font-medium">Words:</span>
            <span className="ml-1 text-green-600">{data.wordCount}</span>
          </div>
          <div>
            <span className="text-green-700 font-medium">Lines:</span>
            <span className="ml-1 text-green-600">{data.lineCount}</span>
          </div>
        </div>
      </div>

      {/* Source Image */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-2 border-b">
          <span className="text-sm font-medium">Source Image</span>
        </div>
        <div className="p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={data.imageUrl} 
            alt="Screenshot being analyzed"
            className="max-w-full h-auto rounded border"
            loading="lazy"
          />
        </div>
      </div>

      {/* Extracted Text */}
      {data.extractedText && (
        <div className="border rounded-lg">
          <div className="bg-muted px-4 py-2 border-b flex items-center justify-between">
            <span className="text-sm font-medium">Extracted Text</span>
            <button
              onClick={() => navigator.clipboard.writeText(data.extractedText)}
              className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/90"
            >
              Copy Text
            </button>
          </div>
          <div className="p-4">
            <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-3 rounded border max-h-96 overflow-y-auto">
              {data.extractedText}
            </pre>
          </div>
        </div>
      )}

      {/* Analysis */}
      <div className="border rounded-lg">
        <div className="bg-muted px-4 py-2 border-b">
          <span className="text-sm font-medium">Analysis</span>
        </div>
        <div className="p-4">
          <div className="text-sm whitespace-pre-wrap">
            {data.analysis}
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="text-xs text-muted-foreground">
        <span>Processed: {new Date(data.timestamp).toLocaleString()}</span>
      </div>
    </div>
  )
}