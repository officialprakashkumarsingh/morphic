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
    
    // Use setTimeout to make the operation non-blocking
    setTimeout(async () => {
      try {
        // Dynamic import for client-side only
        const { default: jsPDF } = await import('jspdf')
        const html2canvas = await import('html2canvas')
        
        // Create a temporary container for the presentation (off-screen)
        const tempContainer = document.createElement('div')
        tempContainer.style.position = 'fixed'
        tempContainer.style.top = '-10000px'
        tempContainer.style.left = '-10000px'
        tempContainer.style.width = '1920px'
        tempContainer.style.height = '1080px'
        tempContainer.style.zIndex = '-9999'
        tempContainer.style.visibility = 'hidden'
        tempContainer.style.pointerEvents = 'none'
        
        // Create presentation HTML optimized for PDF
        const pdfOptimizedHtml = createPdfOptimizedHtml(data.html || '')
        tempContainer.innerHTML = pdfOptimizedHtml
        
        document.body.appendChild(tempContainer)
        
        // Wait for fonts, emojis, and styles to load
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Ensure all fonts and emojis are loaded
        await document.fonts.ready
        
        // Get all slides
        const slides = tempContainer.querySelectorAll('.reveal .slides section')
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'px',
          format: [1920, 1080],
          compress: true
        })
        
        // Process slides in batches to prevent blocking
        const batchSize = 2
        for (let i = 0; i < slides.length; i += batchSize) {
          const batch = Array.from(slides).slice(i, i + batchSize)
          
          for (let j = 0; j < batch.length; j++) {
            const slideIndex = i + j
            const slide = batch[j] as HTMLElement
            
            // Make slide visible and positioned
            slide.style.display = 'block'
            slide.style.position = 'relative'
            slide.style.width = '1920px'
            slide.style.height = '1080px'
            slide.style.padding = '60px'
            slide.style.boxSizing = 'border-box'
            slide.style.visibility = 'visible'
            slide.style.background = '#ffffff'
            
            // Force repaint
            slide.offsetHeight
            
            // Generate canvas for the slide with enhanced options
            const canvas = await html2canvas.default(slide, {
              width: 1920,
              height: 1080,
              scale: 2, // Higher scale for better quality
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff',
              foreignObjectRendering: true,
              imageTimeout: 15000,
              logging: false,
              removeContainer: false,
              scrollX: 0,
              scrollY: 0,
              windowWidth: 1920,
              windowHeight: 1080,
              // Support for emojis and unicode
              ignoreElements: (element) => {
                return element.tagName === 'SCRIPT' || 
                       element.classList.contains('reveal-controls') ||
                       element.classList.contains('progress')
              }
            })
            
            // Convert to PNG for better color and emoji support
            const imgData = canvas.toDataURL('image/png', 1.0)
            
            if (slideIndex > 0) {
              pdf.addPage()
            }
            
            // Add image to PDF with proper sizing
            pdf.addImage(imgData, 'PNG', 0, 0, 1920, 1080)
          }
          
          // Allow UI to breathe between batches
          if (i + batchSize < slides.length) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
        
        // Clean up
        document.body.removeChild(tempContainer)
        
        // Save PDF with optimized compression
        pdf.save(`${(data.title || 'presentation').replace(/[^a-zA-Z0-9\s]/g, '_')}_presentation.pdf`)
        
      } catch (error) {
        console.error('Error generating PDF:', error)
        alert('Failed to generate PDF. Please try downloading the HTML file instead.')
      } finally {
        setIsGeneratingPdf(false)
      }
    }, 10) // Small delay to allow UI to update
  }
  
  const createMobileOptimizedHtml = (originalHtml: string): string => {
    return originalHtml.replace(
      /<style>/,
      `<style>
        .reveal .slides section {
          padding: 20px !important;
          font-size: 14px !important;
        }
        .reveal h1 {
          font-size: 1.8em !important;
          margin-bottom: 0.5em !important;
        }
        .reveal h2 {
          font-size: 1.5em !important;
          margin-bottom: 0.5em !important;
        }
        .reveal h3 {
          font-size: 1.3em !important;
          margin-bottom: 0.4em !important;
        }
        .reveal p, .reveal li {
          font-size: 1em !important;
          line-height: 1.4 !important;
          margin-bottom: 0.5em !important;
        }
        .reveal pre {
          font-size: 0.8em !important;
          padding: 10px !important;
          overflow-x: auto !important;
          background: #f5f5f5 !important;
          border-radius: 4px !important;
          max-width: 100% !important;
        }
        .reveal code {
          font-size: 0.9em !important;
          padding: 2px 4px !important;
          background: #f0f0f0 !important;
          border-radius: 3px !important;
          word-break: break-word !important;
        }
        .reveal .two-column {
          flex-direction: column !important;
          gap: 15px !important;
        }
        .reveal .two-column .column {
          width: 100% !important;
        }
        .reveal ul, .reveal ol {
          margin: 0.5em 0 !important;
          padding-left: 1.5em !important;
        }
        .reveal blockquote {
          font-size: 0.9em !important;
          padding: 10px 15px !important;
          margin: 10px 0 !important;
        }
        @media (max-width: 768px) {
          .reveal .slides section {
            padding: 15px !important;
          }
          .reveal h1 {
            font-size: 1.6em !important;
          }
          .reveal h2 {
            font-size: 1.4em !important;
          }
          .reveal h3 {
            font-size: 1.2em !important;
          }
          .reveal pre {
            font-size: 0.7em !important;
            padding: 8px !important;
          }
        }
        
                 .reveal .controls,
         .reveal .progress {
           display: none !important;
        }`
    )
  }

  const createPdfOptimizedHtml = (originalHtml: string): string => {
    return originalHtml.replace(
      /<style>/,
      `<style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
        
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
          font-family: 'Inter', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif !important;
          color: inherit !important;
          background: inherit !important;
        }
        .reveal h1 {
          font-size: 3.5em !important;
          margin-bottom: 0.5em !important;
          color: inherit !important;
          font-weight: 700 !important;
        }
        .reveal h2 {
          font-size: 2.8em !important;
          margin-bottom: 0.5em !important;
          color: inherit !important;
          font-weight: 600 !important;
        }
        .reveal h3 {
          font-size: 2.2em !important;
          margin-bottom: 0.4em !important;
          color: inherit !important;
          font-weight: 500 !important;
        }
        .reveal p, .reveal li {
          font-size: 1.8em !important;
          line-height: 1.4 !important;
          margin-bottom: 0.5em !important;
          color: inherit !important;
        }
        .reveal ul, .reveal ol {
          margin: 1em 0 !important;
          text-align: left !important;
        }
        .reveal pre {
          font-size: 1.2em !important;
          padding: 20px !important;
          background: #f5f5f5 !important;
          border-radius: 8px !important;
          border: 1px solid #ddd !important;
          overflow-x: auto !important;
          color: #333 !important;
        }
        .reveal code {
          font-family: 'Courier New', 'Monaco', 'Menlo', monospace !important;
          padding: 4px 8px !important;
          background: #f0f0f0 !important;
          border-radius: 4px !important;
          color: #d73a49 !important;
          font-size: 0.9em !important;
        }
        .reveal pre code {
          background: transparent !important;
          color: #333 !important;
          padding: 0 !important;
        }
        .reveal .controls,
        .reveal .progress {
          display: none !important;
        }
        .reveal .two-column {
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-start !important;
          gap: 40px !important;
          width: 100% !important;
        }
        .reveal .two-column .column {
          flex: 1 !important;
          text-align: left !important;
        }
        .reveal blockquote {
          background: #f9f9f9 !important;
          border-left: 5px solid #2196F3 !important;
          padding: 20px !important;
          margin: 20px 0 !important;
          font-style: italic !important;
          color: #555 !important;
        }
        /* Emoji and icon support */
        .fa, .fas, .far, .fab {
          font-family: 'Font Awesome 6 Free', 'Font Awesome 6 Brands' !important;
          color: inherit !important;
        }
        /* Ensure emojis render properly */
        * {
          -webkit-font-feature-settings: "liga" on, "calt" on !important;
          -moz-font-feature-settings: "liga" on, "calt" on !important;
          font-feature-settings: "liga" on, "calt" on !important;
          text-rendering: optimizeLegibility !important;
        }
        body {
          background: white !important;
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }`
    ).replace(
      /<\/head>/,
      `<link rel="preload" href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap" as="style">
       <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap">
       </head>`
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
                <div className="w-full border rounded-lg overflow-hidden bg-gray-50 relative">
                  {/* Mobile-responsive preview container */}
                  <div className="aspect-video md:h-96 h-64">
                    <iframe
                      ref={previewRef}
                      srcDoc={createMobileOptimizedHtml(data.html || '')}
                      className="w-full h-full"
                      onLoad={() => setIsPreviewLoaded(true)}
                      title="Presentation Preview"
                    />
                  </div>
                  {!isPreviewLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Loading presentation...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 mb-4 pt-4 border-t">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={exportToPdf}
                        disabled={isGeneratingPdf}
                        className="flex-shrink-0"
                      >
                        {isGeneratingPdf ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <FileText className="h-4 w-4 sm:mr-1" />
                        )}
                        <span className="hidden sm:inline ml-1">
                          {isGeneratingPdf ? 'Generating...' : 'Export PDF'}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export as PDF File</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={downloadPresentation}
                        className="flex-shrink-0"
                      >
                        <Download className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline ml-1">HTML</span>
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
                        className="flex-shrink-0"
                      >
                        <Play className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline ml-1">Present</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Start Presentation</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={openInNewTab}
                        className="flex-shrink-0"
                      >
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
                        className="flex-shrink-0"
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