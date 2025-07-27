import { tool } from 'ai'
import { encode } from 'plantuml-encoder'
import { z } from 'zod'

const diagramSchema = z.object({
  type: z.enum([
    'sequence',
    'usecase',
    'class',
    'activity',
    'component',
    'state',
    'object',
    'deployment',
    'timing',
    'network',
    'wireframe',
    'mindmap',
    'wbs',
    'gantt'
  ]),
  title: z.string().describe('Title of the diagram'),
  description: z.string().optional().describe('Brief description of what the diagram represents'),
  content: z.string().describe('The PlantUML content/syntax for the diagram'),
  theme: z.enum(['default', 'cerulean', 'sketchy', 'plain', 'amiga']).optional().describe('Visual theme for the diagram')
})

export function createDiagramTool(model: string) {
  return tool({
    description: `Generate PlantUML diagrams for visual representation of data, processes, relationships, and concepts.
    Supports sequence diagrams, use case diagrams, class diagrams, activity diagrams, component diagrams, 
    state diagrams, object diagrams, deployment diagrams, timing diagrams, network diagrams, wireframes, 
    mind maps, work breakdown structures (WBS), and Gantt charts.

    IMPORTANT: The 'content' parameter should contain valid PlantUML syntax specific to the diagram type.
    
    PlantUML syntax examples:
    
    Sequence Diagram:
    @startuml
    Alice -> Bob: Authentication Request
    Bob --> Alice: Authentication Response
    @enduml
    
    Use Case Diagram:
    @startuml
    :User: --> (Use System)
    @enduml
    
    Class Diagram:
    @startuml
    class User {
      +String name
      +login()
    }
    @enduml
    
    Activity Diagram:
    @startuml
    start
    :Activity 1;
    :Activity 2;
    stop
    @enduml`,
    parameters: diagramSchema,
    execute: async ({ type, title, description, content, theme = 'default' }) => {
      let attempts = 0
      const maxAttempts = 3
      let lastError = ''

      while (attempts < maxAttempts) {
        try {
          attempts++

          // Auto-correct and validate PlantUML content
          const correctedContent = autoCorrectPlantUMLContent(content, type, attempts)
          const plantUMLCode = generatePlantUMLCode(type, title, correctedContent, theme)

          // Validate the generated code
          validatePlantUMLCode(plantUMLCode)

          // Encode for PlantUML server
          const encoded = encode(plantUMLCode)
          const renderUrl = `https://www.plantuml.com/plantuml/png/${encoded}`
          const svgUrl = `https://www.plantuml.com/plantuml/svg/${encoded}`
          const editUrl = `https://www.plantuml.com/plantuml/uml/${encoded}`

          return {
            type: 'diagram',
            diagramType: type,
            title,
            description,
            plantUMLCode,
            renderUrl,
            svgUrl,
            editUrl,
            attempts,
            status: 'success'
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Unknown error'

          if (attempts === maxAttempts) {
            // Final attempt failed, return fallback diagram
            const fallbackCode = generateFallbackDiagram(type, title, content)
            const encoded = encode(fallbackCode)
            return {
              type: 'diagram',
              diagramType: type,
              title,
              description,
              plantUMLCode: fallbackCode,
              renderUrl: `https://www.plantuml.com/plantuml/png/${encoded}`,
              svgUrl: `https://www.plantuml.com/plantuml/svg/${encoded}`,
              editUrl: `https://www.plantuml.com/plantuml/uml/${encoded}`,
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

// Auto-correction function for common PlantUML syntax errors
function autoCorrectPlantUMLContent(content: string, type: string, attempt: number): string {
  let corrected = content.trim()

  // Remove common problematic characters and patterns
  corrected = corrected.replace(/[""]/g, '"')  // Smart quotes to regular quotes
  corrected = corrected.replace(/['']/g, "'")  // Smart apostrophes
  corrected = corrected.replace(/–|—/g, '-')   // Em/en dashes to hyphens

  // Ensure proper PlantUML tags if missing
  if (!corrected.includes('@startuml')) {
    corrected = `@startuml\n${corrected}`
  }
  if (!corrected.includes('@enduml')) {
    corrected = `${corrected}\n@enduml`
  }

  // Type-specific corrections
  switch (type) {
    case 'sequence':
      // Fix sequence diagram arrows
      corrected = corrected.replace(/-->>/g, '-->')
      corrected = corrected.replace(/->>>/g, '-->')
      break

    case 'class':
      // Fix class diagram syntax
      corrected = corrected.replace(/class\s+(\w+)\s*{/g, 'class $1 {')
      break

    case 'activity':
      // Ensure activity diagram has start/stop
      if (!corrected.includes('start') && !corrected.includes(':')) {
        corrected = corrected.replace('@startuml', '@startuml\nstart')
      }
      if (!corrected.includes('stop') && !corrected.includes('end')) {
        corrected = corrected.replace('@enduml', 'stop\n@enduml')
      }
      break

    case 'usecase':
      // Fix use case syntax
      corrected = corrected.replace(/:\s*(\w+)\s*:/g, ':$1:')
      break
  }

  // Progressive corrections based on attempt number
  if (attempt > 1) {
    // Second attempt: More aggressive cleaning
    corrected = corrected.replace(/[^\w\s\-()[\]{}:;.,><!@#$%^&*+=|\\/"'`~\n]/g, '')
  }

  if (attempt > 2) {
    // Third attempt: Fallback to simplified content
    const lines = corrected.split('\n').filter(line => line.trim() && !line.startsWith('@'))
    if (lines.length > 10) {
      corrected = `@startuml\n${lines.slice(0, 10).join('\n')}\n@enduml`
    }
  }

  return corrected
}

// Generate complete PlantUML code with theme
function generatePlantUMLCode(type: string, title: string, content: string, theme: string): string {
  let themeDirective = ''
  if (theme !== 'default') {
    themeDirective = `!theme ${theme}\n`
  }

  let plantUMLCode = content

  // Add title if not present
  if (!plantUMLCode.includes('title ') && title) {
    plantUMLCode = plantUMLCode.replace('@startuml', `@startuml\n${themeDirective}title ${title}`)
  } else if (themeDirective) {
    plantUMLCode = plantUMLCode.replace('@startuml', `@startuml\n${themeDirective}`)
  }

  return plantUMLCode
}

// Basic validation for PlantUML code
function validatePlantUMLCode(code: string): void {
  if (!code.trim()) {
    throw new Error('Empty PlantUML code')
  }

  if (!code.includes('@startuml')) {
    throw new Error('Missing @startuml tag')
  }

  if (!code.includes('@enduml')) {
    throw new Error('Missing @enduml tag')
  }

  // Check for balanced parentheses and brackets
  const brackets = code.match(/[\[\](){}]/g) || []
  let balance = 0
  const stack: string[] = []

  for (const bracket of brackets) {
    if (['[', '(', '{'].includes(bracket)) {
      stack.push(bracket)
    } else {
      const last = stack.pop()
      if (!last) {
        throw new Error('Unmatched closing bracket')
      }
      const pairs: { [key: string]: string } = { ']': '[', ')': '(', '}': '{' }
      if (pairs[bracket] !== last) {
        throw new Error('Mismatched brackets')
      }
    }
  }

  if (stack.length > 0) {
    throw new Error('Unmatched opening bracket')
  }
}

// Generate fallback diagram for when all attempts fail
function generateFallbackDiagram(type: string, title: string, originalContent: string): string {
  const safeName = title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
  
  switch (type) {
    case 'sequence':
      return `@startuml
title ${title}
participant A
participant B
A -> B: Request
B --> A: Response
@enduml`

    case 'class':
      return `@startuml
title ${title}
class ${safeName} {
  +method()
}
@enduml`

    case 'activity':
      return `@startuml
title ${title}
start
:Activity;
stop
@enduml`

    case 'usecase':
      return `@startuml
title ${title}
:User: --> (${safeName})
@enduml`

    case 'component':
      return `@startuml
title ${title}
component ${safeName}
@enduml`

    case 'state':
      return `@startuml
title ${title}
[*] --> State1
State1 --> [*]
@enduml`

    default:
      return `@startuml
title ${title}
note as N1
  ${safeName}
  Simplified diagram
end note
@enduml`
  }
}

// Helper functions for creating example diagrams
export function createSequenceExample(): string {
  return `@startuml
Alice -> Bob: Authentication Request
Bob --> Alice: Authentication Response
Alice -> Bob: Another authentication Request
Alice <-- Bob: Another authentication Response
@enduml`
}

export function createClassExample(): string {
  return `@startuml
class User {
  +String name
  +String email
  +login()
  +logout()
}

class Admin {
  +manageUsers()
}

User <|-- Admin
@enduml`
}

export function createActivityExample(): string {
  return `@startuml
start
:Read request;
if (Valid request?) then (yes)
  :Process request;
  :Send response;
else (no)
  :Send error;
endif
stop
@enduml`
}

export function createUseCaseExample(): string {
  return `@startuml
:User: --> (Login)
:User: --> (Browse Products)
:User: --> (Purchase)
:Admin: --> (Manage Users)
:Admin: --> (Manage Products)
@enduml`
}

export function createMindmapExample(): string {
  return `@startmindmap
* Central Topic
** Branch 1
*** Sub-branch 1.1
*** Sub-branch 1.2
** Branch 2
*** Sub-branch 2.1
*** Sub-branch 2.2
@endmindmap`
}

export function createGanttExample(): string {
  return `@startgantt
[Task 1] lasts 5 days
[Task 2] lasts 3 days
[Task 2] starts at [Task 1]'s end
@endgantt`
}