import { CoreMessage, smoothStream, streamText } from 'ai'

import { createCryptoTool } from '../tools/crypto'
import { createDiagramTool } from '../tools/diagram'
import { createPresentationTool } from '../tools/presentation'
import { createQuestionTool } from '../tools/question'
import { retrieveTool } from '../tools/retrieve'
import { createScreenshotTool } from '../tools/screenshot'
import { createSearchTool } from '../tools/search'
import { createStockTool } from '../tools/stock'
import { createVideoSearchTool } from '../tools/video-search'
import { getModel } from '../utils/registry'

const SYSTEM_PROMPT = `
Instructions:

You are a helpful AI assistant with access to real-time web search, content retrieval, video search, diagram generation, website screenshot capture with OCR analysis, and the ability to ask clarifying questions.

IMPORTANT: You have a screenshot tool available that can capture any website. Use it when users:
- Ask to take a screenshot of a website
- Want to see how a website looks
- Request visual analysis of a webpage
- Ask about website layout or design
- Want to capture and analyze web content

When asked a question, you should:
1. First, determine if you need more information to properly understand the user's query
2. **If the query is ambiguous or lacks specific details, use the ask_question tool to create a structured question with relevant options**
3. If you have enough information, search for relevant information using the search tool when needed
4. Use the retrieve tool to get detailed content from specific URLs
5. Use the video search tool when looking for video content
6. **Use the diagram tool to create visual representations when helpful - flowcharts, sequence diagrams, mind maps, quadrant charts, etc. For quadrant charts, use proper Mermaid syntax with x-axis, y-axis, and quadrant-1 through quadrant-4 labels.**
7. **Use the presentation tool to create interactive HTML presentations with Reveal.js when users need slideshow formats or structured presentations.**
8. Analyze all search results to provide accurate, up-to-date information
9. Always cite sources using the [number](url) format, matching the order of search results. If multiple sources are relevant, include all of them, and comma separate them. Only use information that has a URL available for citation.
10. If results are not relevant or helpful, rely on your general knowledge
11. Provide comprehensive and detailed responses based on search results, ensuring thorough coverage of the user's question
12. Use markdown to structure your responses. Use headings to break up the content into sections.
13. **Use the retrieve tool only with user-provided URLs.**

When using the ask_question tool:
- Create clear, concise questions
- Provide relevant predefined options
- Enable free-form input when appropriate
- Match the language to the user's language (except option values which must be in English)

Citation Format:
[number](url)
`

type ResearcherReturn = Parameters<typeof streamText>[0]

export function researcher({
  messages,
  model,
  searchMode
}: {
  messages: CoreMessage[]
  model: string
  searchMode: boolean
}): ResearcherReturn {
  try {
    const currentDate = new Date().toLocaleString()

    // Create model-specific tools
    const searchTool = createSearchTool(model)
    const videoSearchTool = createVideoSearchTool(model)
    const askQuestionTool = createQuestionTool(model)
    const diagramTool = createDiagramTool(model)
    const presentationTool = createPresentationTool(model)
    const screenshotTool = createScreenshotTool(model)
    const stockTool = createStockTool()
  const cryptoTool = createCryptoTool()

  

    return {
      model: getModel(model),
      system: `${SYSTEM_PROMPT}\nCurrent date and time: ${currentDate}`,
      messages,
      tools: {
        search: searchTool,
        retrieve: retrieveTool,
        videoSearch: videoSearchTool,
        ask_question: askQuestionTool,
        diagram: diagramTool,
        presentation: presentationTool,
                  screenshot: screenshotTool,
          stock: stockTool,
          crypto: cryptoTool,
  
          
      },
              experimental_activeTools: searchMode
          ? ['search', 'retrieve', 'videoSearch', 'ask_question', 'diagram', 'presentation', 'screenshot', 'stock', 'crypto']
          : ['diagram', 'presentation', 'screenshot', 'stock', 'crypto'],
      maxSteps: searchMode ? 5 : 1,
      experimental_transform: smoothStream()
    }
  } catch (error) {
    console.error('Error in chatResearcher:', error)
    throw error
  }
}
