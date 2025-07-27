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
    Gantt charts, pie charts, git graphs, mind maps, timelines, and quadrant charts.`,
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
  
  switch (type) {
    case 'flowchart':
      mermaidCode = `flowchart ${direction}
    %% ${title}
    ${content}`
      break
      
    case 'sequence':
      mermaidCode = `sequenceDiagram
    title ${title}
    ${content}`
      break
      
    case 'class':
      mermaidCode = `classDiagram
    title ${title}
    ${content}`
      break
      
    case 'state':
      mermaidCode = `stateDiagram-v2
    title ${title}
    ${content}`
      break
      
    case 'erDiagram':
      mermaidCode = `erDiagram
    title ${title}
    ${content}`
      break
      
    case 'journey':
      mermaidCode = `journey
    title ${title}
    ${content}`
      break
      
    case 'gantt':
      mermaidCode = `gantt
    title ${title}
    ${content}`
      break
      
    case 'pie':
      mermaidCode = `pie title ${title}
    ${content}`
      break
      
    case 'gitgraph':
      mermaidCode = `gitGraph
    options:
        theme: base
        themeVariables:
            primaryColor: "#ff0000"
    commit id: "${title}"
    ${content}`
      break
      
    case 'mindmap':
      mermaidCode = `mindmap
  root)${title}(
    ${content}`
      break
      
    case 'timeline':
      mermaidCode = `timeline
    title ${title}
    ${content}`
      break
      
    case 'quadrant':
      mermaidCode = `quadrantChart
    title ${title}
    ${content}`
      break
      
    default:
      mermaidCode = `flowchart ${direction}
    %% ${title}
    ${content}`
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

// Default export for backward compatibility
export const diagramTool = createDiagramTool('openai-compatible:claude-3.5-sonnet')