import { createOpenAI } from '@ai-sdk/openai'
import {
  createProviderRegistry,
  extractReasoningMiddleware,
  wrapLanguageModel
} from 'ai'

export const registry = createProviderRegistry({
  'openai-compatible': createOpenAI({
    apiKey: 'ahamaibyprakash25',
    baseURL: 'https://ahamai-api.officialprakashkrsingh.workers.dev/v1'
  })
})

export function getModel(model: string) {
  const [provider, ...modelNameParts] = model.split(':') ?? []
  const modelName = modelNameParts.join(':')

  return registry.languageModel(
    model as Parameters<typeof registry.languageModel>[0]
  )
}

export function isProviderEnabled(providerId: string): boolean {
  switch (providerId) {
    case 'openai-compatible':
      return true
    default:
      return false
  }
}

export function getToolCallModel(model?: string) {
  // Default to a compatible model for tool calls
  return getModel('openai-compatible:claude-3.5-sonnet')
}

export function isToolCallSupported(model?: string) {
  // Most models should support tool calls
  return true
}

export function isReasoningModel(model: string): boolean {
  if (typeof model !== 'string') {
    return false
  }
  // Check if the model is a reasoning model based on name patterns
  return (
    model.includes('deepseek') ||
    model.includes('reasoner') ||
    model.includes('o3')
  )
}
