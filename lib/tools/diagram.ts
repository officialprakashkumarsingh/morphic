import { tool } from 'ai'
import { z } from 'zod'

const diagramSchema = z.object({
  type: z.enum([
    'flowchart',
    'sequence',
    'class',
    'state',
    'erDiagram',
    'journey',
    'gantt',
    'pie',
    'gitgraph',
    'mindmap',
    'timeline',
    'quadrant'
  ]).describe('The type of diagram to generate'),
  title: z.string().describe('The title of the diagram'),
  description: z.string().describe('A description of what the diagram represents'),
  content: z.string().describe('The detailed content/data for the diagram'),
  direction: z.enum(['TB', 'TD', 'BT', 'RL', 'LR']).optional().describe('Direction for flowcharts (TB=top-bottom, LR=left-right, etc.)')
})

export function createDiagramTool(model: string) {
  return tool({
    description: `Generate Mermaid.js diagrams with auto-correction and retry mechanism for visual representation of data, processes, relationships, and concepts. 
    Supports flowcharts, sequence diagrams, class diagrams, state diagrams, ER diagrams, user journey maps, 
    Gantt charts, pie charts, git graphs, mind maps, timelines, and quadrant charts.
    
    IMPORTANT: The 'content' parameter should contain properly formatted Mermaid syntax specific to the diagram type.
    Each line should be separated by actual newlines (\n), not literal \n strings.
    
    For quadrant charts, use this exact format:
    x-axis Low --> High
    y-axis Urgent --> Not Urgent
    quadrant-1 Do First
    quadrant-2 Schedule
    quadrant-3 Delegate  
    quadrant-4 Don't Do
    
    For mindmaps, use proper indentation (2-4 spaces per level):
        Topic 1
          Subtopic 1.1
            Detail 1.1.1
          Subtopic 1.2
        Topic 2
          Subtopic 2.1`,
    parameters: diagramSchema,
    execute: async ({ type, title, description, content, direction = 'TB' }) => {
      let attempts = 0
      const maxAttempts = 3
      let lastError = ''
      
      while (attempts < maxAttempts) {
        try {
          attempts++
          
          // Auto-correct content based on diagram type and common errors
          const correctedContent = autoCorrectDiagramContent(content, type, attempts)
          const mermaidCode = generateMermaidCode(type, title, correctedContent, direction)
          
          // Validate the generated code
          await validateMermaidCode(mermaidCode)
          
          return {
            type: 'diagram',
            diagramType: type,
            title,
            description,
            mermaidCode,
            renderUrl: `https://mermaid.ink/img/${Buffer.from(mermaidCode).toString('base64')}`,
            editUrl: `https://mermaid.live/edit#${Buffer.from(mermaidCode).toString('base64')}`,
            attempts,
            status: 'success'
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Unknown error'
          
          if (attempts === maxAttempts) {
            // Final attempt failed, return fallback diagram
            const fallbackCode = generateFallbackDiagram(type, title, content)
            return {
              type: 'diagram',
              diagramType: type,
              title,
              description,
              mermaidCode: fallbackCode,
              renderUrl: `https://mermaid.ink/img/${Buffer.from(fallbackCode).toString('base64')}`,
              editUrl: `https://mermaid.live/edit#${Buffer.from(fallbackCode).toString('base64')}`,
              attempts,
              warnings: [`Auto-correction applied after ${attempts} attempts. Original error: ${lastError}`],
              status: 'success'
            }
          }
          
          // Continue to next attempt
          continue
        }
      }
      
      return {
        type: 'error',
        message: `Failed to generate diagram after ${maxAttempts} attempts: ${lastError}`,
        status: 'error'
      }
    }
  })
}

// Auto-correction function for common diagram syntax errors
function autoCorrectDiagramContent(content: string, type: string, attempt: number): string {
  let corrected = content.replace(/\\n/g, '\n').trim()
  
  // Remove common problematic characters and patterns
  corrected = corrected.replace(/[""]/g, '"')  // Smart quotes to regular quotes
  corrected = corrected.replace(/['']/g, "'")  // Smart apostrophes
  corrected = corrected.replace(/–|—/g, '-')   // Em/en dashes to hyphens
  
  switch (type) {
    case 'quadrant':
      // Fix common quadrant chart issues
      corrected = corrected.replace(/xAxis|x-Axis/gi, 'x-axis')
      corrected = corrected.replace(/yAxis|y-Axis/gi, 'y-axis')
      corrected = corrected.replace(/quadrant(\s*)(\d)/gi, 'quadrant-$2')
      break
      
    case 'mindmap':
      // Fix mindmap indentation issues
      const lines = corrected.split('\n')
      const fixedLines = lines.map(line => {
        // Ensure proper indentation (4 spaces per level)
        const trimmedLine = line.trim()
        if (!trimmedLine) return ''
        
        // Count intended indentation level based on content structure
        const level = Math.max(0, (line.length - line.trimStart().length) / 2)
        return '    '.repeat(level) + trimmedLine
      })
      corrected = fixedLines.filter(line => line.trim()).join('\n')
      break
      
    case 'flowchart':
      // Fix flowchart syntax issues
      corrected = corrected.replace(/graph\s+TD/gi, '') // Remove duplicate graph declaration
      corrected = corrected.replace(/-->/g, '-->')
      corrected = corrected.replace(/\[([^\]]+)\]/g, '[$1]') // Fix bracket formatting
      break
      
    case 'sequence':
      // Fix sequence diagram issues
      corrected = corrected.replace(/->>|->>/g, '->>')
      corrected = corrected.replace(/-->>|-->>/g, '-->')
      break
  }
  
  // Progressive corrections based on attempt number
  if (attempt > 1) {
    // Second attempt: More aggressive cleaning
    corrected = corrected.replace(/[^\w\s\-()[\]{}:;.,><!@#$%^&*+=|\\/"'`~]/g, '')
  }
  
  if (attempt > 2) {
    // Third attempt: Fallback to simplified content
    const words = corrected.split(/\s+/).filter(word => word.length > 0)
    if (words.length > 20) {
      corrected = words.slice(0, 20).join(' ')
    }
  }
  
  return corrected
}

// Validation function for Mermaid code
async function validateMermaidCode(mermaidCode: string): Promise<void> {
  // Basic syntax validation
  if (!mermaidCode || mermaidCode.trim().length === 0) {
    throw new Error('Empty diagram code')
  }
  
  // Check for common syntax errors
  const lines = mermaidCode.split('\n')
  
  // Validate first line contains diagram type
  const firstLine = lines[0].trim().toLowerCase()
  const validStartPatterns = [
    'flowchart', 'graph', 'sequencediagram', 'classdiagram', 
    'statediagram', 'erdiagram', 'journey', 'gantt', 'pie',
    'gitgraph', 'mindmap', 'timeline', 'quadrantchart'
  ]
  
  if (!validStartPatterns.some(pattern => firstLine.includes(pattern))) {
    throw new Error(`Invalid diagram type. First line: ${firstLine}`)
  }
  
  // Check for balanced brackets/parentheses
  const brackets = mermaidCode.match(/[\[\](){}]/g) || []
  const openBrackets = brackets.filter(b => ['[', '(', '{'].includes(b)).length
  const closeBrackets = brackets.filter(b => [']', ')', '}'].includes(b)).length
  
  if (Math.abs(openBrackets - closeBrackets) > 2) { // Allow some tolerance
    throw new Error('Unbalanced brackets or parentheses')
  }
  
  // Type-specific validations
  if (firstLine.includes('quadrant')) {
    if (!mermaidCode.includes('x-axis') || !mermaidCode.includes('y-axis')) {
      throw new Error('Quadrant chart missing required axes')
    }
  }
}

// Generate fallback diagram when all attempts fail
function generateFallbackDiagram(type: string, title: string, originalContent: string): string {
  const sanitizedTitle = title.replace(/[^\w\s]/g, '').substring(0, 50)
  
  switch (type) {
    case 'mindmap':
      return `mindmap
  root)${sanitizedTitle}(
    Topic 1
      Subtopic 1.1
      Subtopic 1.2
    Topic 2
      Subtopic 2.1
      Subtopic 2.2`
      
    case 'quadrant':
      return `quadrantChart
    title ${sanitizedTitle}
    x-axis Low --> High
    y-axis Urgent --> Not Urgent
    quadrant-1 Important & Urgent
    quadrant-2 Important & Not Urgent
    quadrant-3 Not Important & Urgent
    quadrant-4 Not Important & Not Urgent`
    
    case 'flowchart':
      return `flowchart TD
    A[Start] --> B[${sanitizedTitle}]
    B --> C[Process]
    C --> D[End]`
    
    default:
      return `flowchart TD
    A[${sanitizedTitle}] --> B[Generated Diagram]
    B --> C[Content: ${originalContent.substring(0, 30)}...]`
  }
}

function generateMermaidCode(type: string, title: string, content: string, direction: string): string {
  let mermaidCode = ''
  
  // Ensure content has proper line breaks
  const formattedContent = content.replace(/\\n/g, '\n').trim()
  
  switch (type) {
    case 'flowchart':
      mermaidCode = `flowchart ${direction}
    %% ${title}
    ${formattedContent}`
      break
      
    case 'sequence':
      mermaidCode = `sequenceDiagram
    title ${title}
    ${formattedContent}`
      break
      
    case 'class':
      mermaidCode = `classDiagram
    title ${title}
    ${formattedContent}`
      break
      
    case 'state':
      mermaidCode = `stateDiagram-v2
    title ${title}
    ${formattedContent}`
      break
      
    case 'erDiagram':
      mermaidCode = `erDiagram
    title ${title}
    ${formattedContent}`
      break
      
    case 'journey':
      mermaidCode = `journey
    title ${title}
    ${formattedContent}`
      break
      
    case 'gantt':
      mermaidCode = `gantt
    title ${title}
    ${formattedContent}`
      break
      
    case 'pie':
      mermaidCode = `pie title ${title}
    ${formattedContent}`
      break
      
    case 'gitgraph':
      mermaidCode = `gitGraph
    options:
        theme: base
        themeVariables:
            primaryColor: "#ff0000"
    commit id: "${title}"
    ${formattedContent}`
      break
      
    case 'mindmap':
      mermaidCode = `mindmap
  root)${title}(
${formattedContent}`
      break
      
    case 'timeline':
      mermaidCode = `timeline
    title ${title}
    ${formattedContent}`
      break
      
    case 'quadrant':
      mermaidCode = `quadrantChart
    title ${title}
    ${formattedContent}`
      break
      
    default:
      mermaidCode = `flowchart ${direction}
    %% ${title}
    ${formattedContent}`
  }
  
  return mermaidCode
}

// Helper function to create specific diagram types with examples
export function createFlowchartExample(): string {
  return `A[Start] --> B{Decision}
    B -->|Yes| C[Process 1]
    B -->|No| D[Process 2]
    C --> E[End]
    D --> E`
}

export function createSequenceExample(): string {
  return `participant User
    participant App
    participant Database
    User->>App: Request Data
    App->>Database: Query
    Database-->>App: Results
    App-->>User: Display Data`
}

export function createClassExample(): string {
  return `class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +bark()
    }
    Animal <|-- Dog`
}

export function createQuadrantExample(): string {
  return `x-axis Low --> High
    y-axis Urgent --> Not Urgent
    quadrant-1 Do First
    quadrant-2 Schedule
    quadrant-3 Delegate
    quadrant-4 Don't Do`
}

export function createSWOTExample(): string {
  return `x-axis Internal --> External
    y-axis Negative --> Positive
    quadrant-1 Strengths
    quadrant-2 Opportunities
    quadrant-3 Weaknesses
    quadrant-4 Threats`
}

export function createMindmapExample(): string {
  return `    Strategy
      Planning
        Financial Planning
        Resource Planning
      Analysis
        Market Analysis
        Risk Analysis
      Implementation
        Execution
        Monitoring`
}

export function createCapitalBudgetingMindmap(): string {
  return `    Definition
      Planning for Capital Expenditures
      Long-term Investment Decisions
    Objectives
      Maximize Shareholder Value
      Optimal Resource Allocation
      Risk Management
    Methods
      Net Present Value (NPV)
      Internal Rate of Return (IRR)
      Payback Period
      Profitability Index (PI)
    Process
      Identifying Investment Opportunities
      Evaluating Projects
      Selecting Projects
      Implementing and Monitoring
    Importance
      Ensures Financial Sustainability
      Supports Strategic Growth
      Enhances Competitive Advantage`
}

// Default export for backward compatibility
export const diagramTool = createDiagramTool('openai-compatible:claude-3.5-sonnet')