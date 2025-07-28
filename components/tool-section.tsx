'use client'

import { memo } from 'react'

import type { ToolInvocation } from 'ai'

import { CryptoSection } from './crypto-section'
import { DiagramSection } from './diagram-section'
import { StockSection } from './stock-section'
import { UserKnowledgeSection } from './user-knowledge-section'

interface ToolSectionProps {
  tool: ToolInvocation
}

export const ToolSection = memo(({ tool }: ToolSectionProps) => {
  switch (tool.toolName) {
    case 'diagram':
      return (
        <DiagramSection tool={tool} />
      )

    case 'stock':
      return (
        <StockSection tool={tool} />
      )
    case 'crypto':
      return (
        <CryptoSection tool={tool} />
      )
    case 'userKnowledge':
      return (
        <UserKnowledgeSection tool={tool} />
      )
    default:
      return null
  }
})

ToolSection.displayName = 'ToolSection'
