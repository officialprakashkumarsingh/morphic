'use client'

import { ToolInvocation } from 'ai'

import { ChartSection } from './chart-section'
import { CryptoSection } from './crypto-section'
import { DiagramSection } from './diagram-section'
import { FlightSection } from './flight-section'
import { QuestionConfirmation } from './question-confirmation'
import RetrieveSection from './retrieve-section'
import { ScreenshotSection } from './screenshot-section'
import { SearchSection } from './search-section'
import { StockSection } from './stock-section'
import { VideoSearchSection } from './video-search-section'

interface ToolSectionProps {
  tool: ToolInvocation
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  addToolResult?: (params: { toolCallId: string; result: any }) => void
}

export function ToolSection({
  tool,
  isOpen,
  onOpenChange,
  addToolResult
}: ToolSectionProps) {
  // Special handling for ask_question tool
  if (tool.toolName === 'ask_question') {
    // When waiting for user input
    if (tool.state === 'call' && addToolResult) {
      return (
        <QuestionConfirmation
          toolInvocation={tool}
          onConfirm={(toolCallId, approved, response) => {
            addToolResult({
              toolCallId,
              result: approved
                ? response
                : {
                    declined: true,
                    skipped: response?.skipped,
                    message: 'User declined this question'
                  }
            })
          }}
        />
      )
    }

    // When result is available, display the result
    if (tool.state === 'result') {
      return (
        <QuestionConfirmation
          toolInvocation={tool}
          isCompleted={true}
          onConfirm={() => {}} // Not used in result display mode
        />
      )
    }
  }

  switch (tool.toolName) {
    case 'search':
      return (
        <SearchSection
          tool={tool}
          isOpen={isOpen}
          onOpenChange={onOpenChange}
        />
      )
    case 'videoSearch':
      return (
        <VideoSearchSection
          tool={tool}
          isOpen={isOpen}
          onOpenChange={onOpenChange}
        />
      )
    case 'retrieve':
      return (
        <RetrieveSection
          tool={tool}
          isOpen={isOpen}
          onOpenChange={onOpenChange}
        />
      )
    case 'diagram':
      return (
        <DiagramSection
          tool={tool}
          isOpen={isOpen}
          onOpenChange={onOpenChange}
        />
              )
    case 'chart':
      return (
        <ChartSection
          tool={tool}
          isOpen={isOpen}
          onOpenChange={onOpenChange}
        />
      )
    case 'screenshot':
      return (
        <ScreenshotSection
          tool={tool}
          isOpen={isOpen}
          onOpenChange={onOpenChange}
        />
              )
        case 'stock':
      return (
        <StockSection tool={tool} />
      )
    case 'crypto':
      return (
        <CryptoSection tool={tool} />
      )
    case 'flight':
      return (
        <FlightSection tool={tool} />
      )
    default:
      return null
  }
}
