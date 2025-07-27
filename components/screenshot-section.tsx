'use client'

import React, { useState } from 'react'
import Image from 'next/image'

import { ToolInvocation } from 'ai'
import { Copy, Download, ExternalLink, Eye, Maximize2,Monitor, Smartphone, Tablet } from 'lucide-react'

import { cn } from '@/lib/utils'

import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Collapsible, CollapsibleContent } from './ui/collapsible'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { Section } from './section'
import { ToolBadge } from './tool-badge'

interface ScreenshotSectionProps {
  tool: ToolInvocation
}

interface ScreenshotResult {
  type: 'screenshot' | 'error'
  url?: string
  screenshotUrl?: string
  width?: number
  height?: number
  fullPage?: boolean
  ocrText?: string
  analysis?: string
  timestamp?: string
  error?: string
  status: 'success' | 'error'
}

export function ScreenshotSection({ tool }: ScreenshotSectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)

  const data: ScreenshotResult | undefined = (() => {
    try {
      if (tool.state === 'result') {
        const result = (tool as any).result
        if (result) {
          // Handle both string and object results
          if (typeof result === 'string') {
            return JSON.parse(result)
          } else if (typeof result === 'object') {
            return result as ScreenshotResult
          }
        }
      }
      return undefined
    } catch (error) {
      console.error('Failed to parse screenshot data:', error, 'Raw result:', (tool as any).result)
      return {
        type: 'error',
        error: `Failed to parse screenshot data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error'
      }
    }
  })()

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  const downloadScreenshot = () => {
    if (data?.screenshotUrl) {
      const link = document.createElement('a')
      link.href = data.screenshotUrl
      link.download = `screenshot-${new Date().getTime()}.png`
      link.click()
    }
  }

  const openOriginalSite = () => {
    if (data?.url) {
      window.open(data.url, '_blank')
    }
  }

  const getDeviceIcon = () => {
    if (!data?.width) return <Monitor className="size-4" />
    
    if (data.width <= 480) return <Smartphone className="size-4" />
    if (data.width <= 768) return <Tablet className="size-4" />
    return <Monitor className="size-4" />
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleContent>
        <div className={cn('border rounded-lg overflow-hidden')}>
          <div className="p-3 bg-muted/30 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ToolBadge tool="screenshot">
                {data?.type === 'error' ? 'Error' : 'Screenshot'}
              </ToolBadge>
              {data?.width && data?.height && (
                <Badge variant="secondary" className="text-xs">
                  {getDeviceIcon()}
                  <span className="ml-1">{data.width}×{data.height}</span>
                </Badge>
              )}
            </div>
          </div>

          <div className="p-4">
            {data?.type === 'error' ? (
              <Section title="Screenshot Capture Failed">
                <div className="text-red-600 text-sm">
                  Failed to capture screenshot. Please try again or check the URL.
                </div>
              </Section>
            ) : data?.screenshotUrl ? (
              <>
                <Section title={`Screenshot of ${data.url}`}>
                  <div className="space-y-4">
                    {/* Screenshot Preview */}
                    <Card>
                      <CardContent className="p-4">
                        <div className="relative">
                          {imageError ? (
                            <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                              <div className="text-center">
                                <p className="text-muted-foreground mb-2">Failed to load screenshot</p>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => {
                                    setImageError(false)
                                    setImageLoaded(false)
                                  }}
                                >
                                  Retry
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="relative">
                              <Image
                                src={data.screenshotUrl}
                                alt={`Screenshot of ${data.url}`}
                                width={data.width || 1200}
                                height={data.height || 800}
                                className={`w-full h-auto max-h-96 object-contain border rounded-lg transition-opacity duration-300 ${
                                  imageLoaded ? 'opacity-100' : 'opacity-0'
                                }`}
                                onLoad={() => setImageLoaded(true)}
                                onError={() => {
                                  setImageError(true)
                                  setImageLoaded(false)
                                }}
                                unoptimized
                              />
                              
                              {/* Fullscreen Button */}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="absolute top-2 right-2 opacity-80 hover:opacity-100"
                                  >
                                    <Maximize2 className="size-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-6xl w-full h-[90vh]">
                                  <DialogHeader>
                                    <DialogTitle>Screenshot - {data.url}</DialogTitle>
                                  </DialogHeader>
                                  <div className="flex-1 overflow-auto">
                                    <Image
                                      src={data.screenshotUrl}
                                      alt={`Screenshot of ${data.url}`}
                                      width={data.width || 1200}
                                      height={data.height || 800}
                                      className="w-full h-auto"
                                      unoptimized
                                    />
                                  </div>
                                </DialogContent>
                              </Dialog>

                              {!imageLoaded && !imageError && (
                                <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
                                  <p className="text-sm text-muted-foreground">Loading screenshot...</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 mt-4">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(data?.screenshotUrl || '')}
                              >
                                <Copy className="size-4 mr-1" />
                                Copy URL
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy screenshot URL</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={downloadScreenshot}
                              >
                                <Download className="size-4 mr-1" />
                                Download
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Download screenshot</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={openOriginalSite}
                              >
                                <ExternalLink className="size-4 mr-1" />
                                Visit Site
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Open original website</TooltipContent>
                          </Tooltip>
                        </div>
                      </CardContent>
                    </Card>




                  </div>
                </Section>
              </>
            ) : (
              <Section title="Screenshot">
                <div className="flex items-center justify-center h-32">
                  <p className="text-sm text-muted-foreground">Capturing screenshot...</p>
                </div>
              </Section>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}