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
    description: `Generate Mermaid.js diagrams for visual representation of data, processes, relationships, and concepts. 
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
      try {
        const mermaidCode = generateMermaidCode(type, title, content, direction)
        
        return {
          type: 'diagram',
          diagramType: type,
          title,
          description,
          mermaidCode,
          renderUrl: `https://mermaid.ink/img/${Buffer.from(mermaidCode).toString('base64')}`,
          editUrl: `https://mermaid.live/edit#${Buffer.from(mermaidCode).toString('base64')}`,
          status: 'success'
        }
      } catch (error) {
        return {
          type: 'error',
          message: `Failed to generate diagram: ${error instanceof Error ? error.message : 'Unknown error'}`,
          status: 'error'
        }
      }
    }
  })
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