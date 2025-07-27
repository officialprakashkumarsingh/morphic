'use client'

import { useEffect, useRef, useState } from 'react'

import { ToolInvocation } from 'ai'
import { Copy, Download, Edit, ExternalLink } from 'lucide-react'
import mermaid from 'mermaid'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import { CollapsibleMessage } from '@/components/collapsible-message'
import { Section } from '@/components/section'
import { ToolBadge } from '@/components/tool-badge'

interface DiagramSectionProps {
  tool: ToolInvocation
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

interface DiagramResult {
  type: 'diagram' | 'error'
  diagramType?: string
  title?: string
  description?: string
  mermaidCode?: string
  renderUrl?: string
  editUrl?: string
  message?: string
  status: 'success' | 'error'
}

export function DiagramSection({ tool, isOpen, onOpenChange }: DiagramSectionProps) {
  const diagramRef = useRef<HTMLDivElement>(null)
  const [isRendered, setIsRendered] = useState(false)
  
  const data: DiagramResult | undefined =
    tool.state === 'result' ? tool.result : undefined

  useEffect(() => {
    // Initialize mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
      fontFamily: 'inherit'
    })
  }, [])

  useEffect(() => {
    const renderDiagram = async () => {
      if (data?.mermaidCode && diagramRef.current && !isRendered) {
        try {
          const { svg } = await mermaid.render(
            `diagram-${tool.toolCallId}`,
            data.mermaidCode
          )
          diagramRef.current.innerHTML = svg
          setIsRendered(true)
        } catch (error) {
          console.error('Failed to render mermaid diagram:', error)
          diagramRef.current.innerHTML = `
            <div class="text-red-500 p-4 border border-red-200 rounded">
              Failed to render diagram: ${error instanceof Error ? error.message : 'Unknown error'}
            </div>
          `
        }
      }
    }

    if (isOpen && data?.mermaidCode) {
      renderDiagram()
    }
  }, [isOpen, data?.mermaidCode, tool.toolCallId, isRendered])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const downloadSVG = () => {
    if (diagramRef.current) {
      const svg = diagramRef.current.querySelector('svg')
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg)
        const blob = new Blob([svgData], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${data?.title || 'diagram'}.svg`
        a.click()
        URL.revokeObjectURL(url)
      }
    }
  }

  const header = (
    <div className="flex items-center gap-2">
      <ToolBadge tool="diagram">
        {data?.type === 'error' ? 'Error' : 'Diagram'}
      </ToolBadge>
      {data?.diagramType && (
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          {data.diagramType}
        </span>
      )}
    </div>
  )

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
        <Section title="Diagram Generation Failed">
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
      <Section title={`${data?.title || 'Generated Diagram'}`}>
        {data?.description && (
          <p className="text-sm text-muted-foreground mb-4">{data.description}</p>
        )}

        {data?.mermaidCode && (
        <Card>
          <CardContent className="p-6">
            {/* Diagram Render Area */}
            <div
              ref={diagramRef}
              className="w-full overflow-x-auto flex justify-center items-center min-h-[200px] bg-white rounded border"
            />

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(data.mermaidCode!)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy Mermaid Code</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={downloadSVG}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download SVG</TooltipContent>
                </Tooltip>

                {data.editUrl && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(data.editUrl, '_blank')}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit in Mermaid Live</TooltipContent>
                  </Tooltip>
                )}

                {data.renderUrl && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(data.renderUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View Full Size</TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
            </div>

            {/* Mermaid Code Display */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                View Mermaid Code
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
                <code>{data.mermaidCode}</code>
              </pre>
            </details>
          </CardContent>
        </Card>
        )}
      </Section>
    </CollapsibleMessage>
  )
}