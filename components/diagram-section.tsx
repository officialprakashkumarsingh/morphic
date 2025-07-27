'use client'

import { useState } from 'react'
import Image from 'next/image'

import { ToolInvocation } from 'ai'
import { Copy, Download, Edit, ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import { CollapsibleMessage } from '@/components/collapsible-message'
import { Section } from '@/components/section'
import { ToolBadge } from '@/components/tool-badge'

interface DiagramSectionProps {
  tool: ToolInvocation
}

interface DiagramResult {
  type: 'diagram' | 'error'
  diagramType?: string
  title?: string
  description?: string
  plantUMLCode?: string
  renderUrl?: string
  svgUrl?: string
  editUrl?: string
  message?: string
  attempts?: number
  warnings?: string[]
  status: 'success' | 'error'
}

export function DiagramSection({ tool }: DiagramSectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  const data: DiagramResult | undefined =
    tool.state === 'result' ? tool.result : undefined

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  const downloadDiagram = () => {
    if (data?.svgUrl) {
      // Download SVG version
      const link = document.createElement('a')
      link.href = data.svgUrl
      link.download = `${data.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'diagram'}.svg`
      link.click()
    } else if (data?.renderUrl) {
      // Download PNG version
      const link = document.createElement('a')
      link.href = data.renderUrl
      link.download = `${data.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'diagram'}.png`
      link.click()
    }
  }

  const openFullSize = () => {
    if (data?.renderUrl) {
      window.open(data.renderUrl, '_blank')
    }
  }

  const header = (
    <div className="flex items-center gap-2">
      <ToolBadge tool="diagram">
        {data?.type === 'error' ? 'Error' : 'PlantUML Diagram'}
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
        onOpenChange={setIsOpen}
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
      onOpenChange={setIsOpen}
      isCollapsible={true}
      showIcon={false}
    >
      <Section title={`${data?.title || 'Generated Diagram'}`}>
        {data?.description && (
          <p className="text-sm text-muted-foreground mb-4">{data.description}</p>
        )}

        {/* Auto-correction warnings */}
        {data?.warnings && data.warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium text-amber-900 mb-2">
              Auto-corrections applied (Attempt {data.attempts || 1}):
            </h4>
            <ul className="text-xs text-amber-800 space-y-1">
              {data.warnings.map((warning, index) => (
                <li key={index} className="flex items-start">
                  <span className="inline-block w-1 h-1 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data?.renderUrl && (
          <Card>
            <CardContent className="p-6">
              {/* Diagram Render Area */}
              <div className="w-full overflow-x-auto flex justify-center items-center min-h-[300px] bg-gradient-to-br from-slate-50 to-white rounded-lg border border-slate-200 shadow-inner p-4 relative">
                {!imageLoaded && !imageError && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                )}
                
                {imageError ? (
                  <div className="text-red-500 text-center">
                    <p>Failed to load diagram</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setImageError(false)
                        setImageLoaded(false)
                      }}
                      className="mt-2"
                    >
                      Retry
                    </Button>
                  </div>
                ) : (
                  <Image
                    src={data.renderUrl}
                    alt={data.title || 'Generated Diagram'}
                    width={800}
                    height={600}
                    className={`max-w-full h-auto transition-opacity duration-300 ${
                      imageLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => {
                      setImageError(true)
                      setImageLoaded(false)
                    }}
                    unoptimized
                  />
                )}
              </div>

              <Separator className="my-4" />

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(data?.plantUMLCode || '')}
                        className="flex-shrink-0"
                      >
                        <Copy className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Copy Code</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy PlantUML Code</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadDiagram}
                        className="flex-shrink-0"
                      >
                        <Download className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Download</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download Diagram</TooltipContent>
                  </Tooltip>

                  {data?.editUrl && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(data.editUrl, '_blank')}
                          className="flex-shrink-0"
                        >
                          <Edit className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit in PlantUML Editor</TooltipContent>
                    </Tooltip>
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={openFullSize}
                        className="flex-shrink-0"
                      >
                        <ExternalLink className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Full Size</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View Full Size</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* PlantUML Code Display */}
              {data?.plantUMLCode && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    View PlantUML Source
                  </summary>
                  <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto max-w-full">
                    <code>{data.plantUMLCode}</code>
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        )}
      </Section>
    </CollapsibleMessage>
  )
}