'use client'

import { useEffect, useRef, useState } from 'react'

import { ToolInvocation } from 'ai'
import { Copy, Download, ExternalLink, FileText, Play } from 'lucide-react'

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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  
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

  const exportToPdf = async () => {
    if (!data?.html || !data?.title) return
    
    setIsGeneratingPdf(true)
    
    try {
      // Dynamic import for client-side only
      const { default: jsPDF } = await import('jspdf')
      const html2canvas = await import('html2canvas')
      
      // Create a temporary container for the presentation
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'fixed'
      tempContainer.style.top = '-9999px'
      tempContainer.style.left = '-9999px'
      tempContainer.style.width = '1920px'
      tempContainer.style.height = '1080px'
      tempContainer.style.zIndex = '-1'
      
      // Create presentation HTML optimized for PDF
      const pdfOptimizedHtml = createPdfOptimizedHtml(data.html)
      tempContainer.innerHTML = pdfOptimizedHtml
      
      document.body.appendChild(tempContainer)
      
      // Wait for fonts and styles to load
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Initialize Reveal.js in the temp container
      const revealScript = document.createElement('script')
      revealScript.innerHTML = `
        if (window.Reveal) {
          window.Reveal.initialize({
            hash: false,
            controls: false,
            progress: false,
            transition: 'none',
            backgroundTransition: 'none'
          });
        }
      `
      tempContainer.appendChild(revealScript)
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Get all slides
      const slides = tempContainer.querySelectorAll('.reveal .slides section')
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1920, 1080]
      })
      
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i] as HTMLElement
        
        // Make slide visible and positioned
        slide.style.display = 'block'
        slide.style.position = 'relative'
        slide.style.width = '1920px'
        slide.style.height = '1080px'
        slide.style.padding = '60px'
        slide.style.boxSizing = 'border-box'
        
        // Generate canvas for the slide
        const canvas = await html2canvas.default(slide, {
          width: 1920,
          height: 1080,
          scale: 1,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        })
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        
        if (i > 0) {
          pdf.addPage()
        }
        
        // Add image to PDF with proper sizing
        pdf.addImage(imgData, 'JPEG', 0, 0, 1920, 1080)
      }
      
      // Clean up
      document.body.removeChild(tempContainer)
      
      // Save PDF
      pdf.save(`${data.title.replace(/[^a-zA-Z0-9]/g, '_')}_presentation.pdf`)
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try downloading the HTML file instead.')
    } finally {
      setIsGeneratingPdf(false)
    }
  }
  
  const createPdfOptimizedHtml = (originalHtml: string): string => {
    return originalHtml.replace(
      /<style>/,
      `<style>
        .reveal .slides {
          width: 1920px !important;
          height: 1080px !important;
        }
        .reveal .slides section {
          width: 1920px !important;
          height: 1080px !important;
          padding: 60px !important;
          box-sizing: border-box !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
          text-align: center !important;
        }
        .reveal h1 {
          font-size: 3.5em !important;
          margin-bottom: 0.5em !important;
        }
        .reveal h2 {
          font-size: 2.8em !important;
          margin-bottom: 0.5em !important;
        }
        .reveal h3 {
          font-size: 2.2em !important;
          margin-bottom: 0.4em !important;
        }
        .reveal p, .reveal li {
          font-size: 1.8em !important;
          line-height: 1.4 !important;
          margin-bottom: 0.5em !important;
        }
        .reveal ul, .reveal ol {
          margin: 1em 0 !important;
        }
        .reveal .controls,
        .reveal .progress {
          display: none !important;
        }
        body {
          background: white !important;
        }`
    )
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
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={exportToPdf}
                        disabled={isGeneratingPdf}
                      >
                        {isGeneratingPdf ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <FileText className="h-4 w-4 mr-1" />
                        )}
                        {isGeneratingPdf ? 'Generating...' : 'Export PDF'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export as PDF File</TooltipContent>
                  </Tooltip>

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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={openInNewTab}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Present
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Start Presentation</TooltipContent>
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
                </TooltipProvider>
              </div>



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