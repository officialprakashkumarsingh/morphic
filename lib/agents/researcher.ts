import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'

import { createCryptoTool } from '../tools/crypto'
import { createDiagramTool } from '../tools/diagram'
import { createPresentationTool } from '../tools/presentation'
import { createScreenshotTool } from '../tools/screenshot'
import { createStockTool } from '../tools/stock'
import { createUserKnowledgeTool } from '../tools/user-knowledge'

// Default model for tool creation
const DEFAULT_MODEL = 'openai-compatible:claude-3.5-sonnet'

// Export the tools for use in the application
export const tools = {
  diagram: createDiagramTool(DEFAULT_MODEL),
  presentation: createPresentationTool(DEFAULT_MODEL),
  screenshot: createScreenshotTool(DEFAULT_MODEL),
  stock: createStockTool(),
  crypto: createCryptoTool(),
  userKnowledge: createUserKnowledgeTool()
}

// Simple researcher function for compatibility
export function researcher(params: any) {
  return streamText({
    model: openai('gpt-4'),
    messages: params.messages || [],
    tools,
    system: 'You are a helpful AI assistant with access to various tools for analysis and visualization.'
  })
}
