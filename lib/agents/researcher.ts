import { openai } from '@ai-sdk/openai'

import { createCryptoTool } from '../tools/crypto'
import { createDiagramTool } from '../tools/diagram'
import { createPresentationTool } from '../tools/presentation'
import { createScreenshotTool } from '../tools/screenshot'
import { createStockTool } from '../tools/stock'
import { createUserKnowledgeTool } from '../tools/user-knowledge'
import { getModel } from '../utils/registry'

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

// Researcher function that returns streamText configuration
export async function researcher({ messages, model, searchMode }: any) {
  return {
    model: getModel(model),
    messages,
    tools,
    maxSteps: searchMode ? 5 : 1,
    system: 'You are a helpful AI assistant with access to various tools for analysis, visualization, and user insights. Use the available tools to provide comprehensive responses.'
  }
}
