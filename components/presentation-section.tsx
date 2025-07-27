'use client'

import { useEffect, useRef, useState } from 'react'

import { ToolInvocation } from 'ai'
import { Copy, Download, ExternalLink, Play } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import { CollapsibleMessage } from '@/components/collapsible-message'
import { Section } from '@/components/section'
import { ToolBadge } from '@/components/tool-badge'

interface PresentationSectionProps {
  tool: ToolInvocation
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

interface PresentationResult {
  type: 'presentation' | 'error'
  title?: string
  subtitle?: string
  author?: string
  theme?: string
  slideCount?: number
  html?: string
  fileName?: string
  downloadUrl?: string
  previewUrl?: string
  instructions?: string[]
  message?: string
  status: 'success' | 'error'
}

export function PresentationSection({ tool, isOpen, onOpenChange }: PresentationSectionProps) {
  const previewRef = useRef<HTMLIFrameElement>(null)
  const [isPreviewLoaded, setIsPreviewLoaded] = useState(false)
  
  const data: PresentationResult | undefined =
    tool.state === 'result' ? tool.result : undefined

  const header = (
    <div className="flex items-center gap-2">
      <ToolBadge tool="presentation">
        {data?.type === 'error' ? 'Error' : 'Presentation'}
      </ToolBadge>
      {data?.slideCount && (
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          {data.slideCount} slides
        </span>
      )}
      {data?.theme && (
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          {data.theme} theme
        </span>
      )}
    </div>
  )

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const downloadPresentation = () => {
    if (data?.html && data?.fileName) {
      const blob = new Blob([data.html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.fileName
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const openInNewTab = () => {
    if (data?.html) {
      const newWindow = window.open()
      if (newWindow) {
        newWindow.document.write(data.html)
        newWindow.document.close()
      }
    }
  }

  if (data?.type === 'error') {
    return (
      <CollapsibleMessage
        role="assistant"
        header={header}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        isCollapsible={true}
        showIcon={false}
      >
        <Section title="Presentation Generation Failed">
          <div className="text-red-500 p-4 border border-red-200 rounded">
            {data.message}
          </div>
        </Section>
      </CollapsibleMessage>
    )
  }

  return (
    <CollapsibleMessage
      role="assistant"
      header={header}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isCollapsible={true}
      showIcon={false}
    >
      <Section title={`${data?.title || 'Generated Presentation'}`}>
        {data?.subtitle && (
          <p className="text-sm text-muted-foreground mb-2">{data.subtitle}</p>
        )}
        
        {data?.author && (
          <p className="text-xs text-muted-foreground mb-4">by {data.author}</p>
        )}

        {data?.html && (
          <Card>
            <CardContent className="p-6">
              {/* Preview Area */}
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Preview</h4>
                <div className="w-full h-96 border rounded-lg overflow-hidden bg-gray-50">
                  <iframe
                    ref={previewRef}
                    srcDoc={data.html}
                    className="w-full h-full"
                    onLoad={() => setIsPreviewLoaded(true)}
                    title="Presentation Preview"
                  />
                </div>
                {!isPreviewLoaded && (
                  <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading presentation...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mb-4 pt-4 border-t">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={downloadPresentation}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download HTML File</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={openInNewTab}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Open in New Tab</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(data.html!)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy HTML Code</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={openInNewTab}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Present
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Start Presentation</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Instructions */}
              {data?.instructions && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">How to use:</h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    {data.instructions.map((instruction, index) => (
                      <li key={index} className="flex items-start">
                        <span className="inline-block w-1 h-1 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        {instruction}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Presentation Details */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  View HTML Source
                </summary>
                <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto max-h-60">
                  <code>{data.html}</code>
                </pre>
              </details>
            </CardContent>
          </Card>
        )}
      </Section>
    </CollapsibleMessage>
  )
}