import { openai } from '@ai-sdk/openai'

import { createCryptoTool } from '../tools/crypto'
import { createDiagramTool } from '../tools/diagram'
import { createQuestionTool } from '../tools/question'
import { retrieveTool } from '../tools/retrieve'
import { createSearchTool } from '../tools/search'
import { createStockTool } from '../tools/stock'
import { createVideoSearchTool } from '../tools/video-search'
import { getModel } from '../utils/registry'

// Default model for tool creation
const DEFAULT_MODEL = 'openai-compatible:claude-3.5-sonnet'

// Export the tools for use in the application
export const tools = {
  search: createSearchTool(DEFAULT_MODEL),
  retrieve: retrieveTool,
  videoSearch: createVideoSearchTool(DEFAULT_MODEL),
  question: createQuestionTool(DEFAULT_MODEL),
  diagram: createDiagramTool(DEFAULT_MODEL),
  stock: createStockTool(),
  crypto: createCryptoTool()
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
