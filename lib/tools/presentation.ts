import { tool } from 'ai'
import { z } from 'zod'

const slideSchema = z.object({
  title: z.string().describe('Title of the slide'),
  content: z.string().describe('Content of the slide (supports markdown)'),
  layout: z.enum(['title', 'content', 'two-column', 'image', 'quote', 'blank']).optional().describe('Layout type for the slide'),
  background: z.string().optional().describe('Background color, gradient, or image URL'),
  notes: z.string().optional().describe('Speaker notes for the slide')
})

const presentationSchema = z.object({
  title: z.string().describe('Title of the presentation'),
  subtitle: z.string().optional().describe('Subtitle of the presentation'),
  author: z.string().optional().describe('Author of the presentation'),
  theme: z.enum(['black', 'white', 'league', 'beige', 'sky', 'night', 'serif', 'simple', 'solarized', 'blood', 'moon']).optional().describe('Presentation theme'),
  transition: z.enum(['none', 'fade', 'slide', 'convex', 'concave', 'zoom']).optional().describe('Slide transition effect'),
  slides: z.array(slideSchema).describe('Array of slides in the presentation'),
  includeProgress: z.boolean().optional().describe('Show progress bar'),
  includeControls: z.boolean().optional().describe('Show navigation controls'),
  autoSlide: z.number().optional().describe('Auto-advance slides after N milliseconds')
})

export function createPresentationTool(model: string) {
  return tool({
    description: `Generate interactive HTML presentations using Reveal.js framework. 
    Creates professional slideshow presentations with various themes, transitions, and layouts.
    Supports markdown content, speaker notes, auto-advance, and multiple slide layouts.
    
    Slide layouts:
    - title: Title slide with large heading
    - content: Standard content slide with bullet points
    - two-column: Split content into two columns
    - image: Image-focused slide
    - quote: Quote or testimonial slide
    - blank: Custom layout slide
    
    Themes available: black, white, league, beige, sky, night, serif, simple, solarized, blood, moon
    Transitions: none, fade, slide, convex, concave, zoom`,
    parameters: presentationSchema,
    execute: async ({ 
      title, 
      subtitle, 
      author, 
      theme = 'white', 
      transition = 'slide', 
      slides, 
      includeProgress = true, 
      includeControls = true, 
      autoSlide 
    }) => {
      try {
        const presentationHtml = generateRevealPresentation({
          title,
          subtitle,
          author,
          theme,
          transition,
          slides,
          includeProgress,
          includeControls,
          autoSlide
        })
        
        // Create a unique filename
        const timestamp = Date.now()
        const fileName = `presentation-${timestamp}.html`
        
        return {
          type: 'presentation',
          title,
          subtitle,
          author,
          theme,
          slideCount: slides.length,
          html: presentationHtml,
          fileName,
          downloadUrl: `data:text/html;charset=utf-8,${encodeURIComponent(presentationHtml)}`,
          previewUrl: `data:text/html;charset=utf-8,${encodeURIComponent(presentationHtml)}`,
          instructions: [
            'Click the download button to save the presentation as an HTML file',
            'Open the HTML file in any modern web browser',
            'Use arrow keys or space to navigate slides',
            'Press ESC for slide overview',
            'Press S for speaker notes view',
            'Press F for fullscreen mode'
          ],
          status: 'success'
        }
      } catch (error) {
        return {
          type: 'error',
          message: `Failed to generate presentation: ${error instanceof Error ? error.message : 'Unknown error'}`,
          status: 'error'
        }
      }
    }
  })
}

interface PresentationConfig {
  title: string
  subtitle?: string
  author?: string
  theme: string
  transition: string
  slides: Array<{
    title: string
    content: string
    layout?: string
    background?: string
    notes?: string
  }>
  includeProgress: boolean
  includeControls: boolean
  autoSlide?: number
}

function generateRevealPresentation(config: PresentationConfig): string {
  const { title, subtitle, author, theme, transition, slides, includeProgress, includeControls, autoSlide } = config
  
  // Generate title slide
  const titleSlide = generateTitleSlide(title, subtitle, author)
  
  // Generate content slides
  const contentSlides = slides.map(slide => generateSlide(slide)).join('\n')
  
  const autoSlideConfig = autoSlide ? `autoSlide: ${autoSlide},` : ''
  
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.3.1/reveal.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.3.1/theme/${theme}.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/default.min.css">
    
    <style>
        .reveal .slides section {
            text-align: left;
        }
        .reveal h1, .reveal h2, .reveal h3 {
            text-align: center;
            text-transform: none;
        }
        .reveal .title-slide {
            text-align: center;
        }
        .reveal .two-column {
            display: flex;
            justify-content: space-between;
        }
        .reveal .two-column .column {
            width: 48%;
        }
        .reveal .quote-slide {
            text-align: center;
        }
        .reveal .quote-slide blockquote {
            font-style: italic;
            font-size: 1.5em;
            margin: 1em 0;
        }
        .reveal .image-slide {
            text-align: center;
        }
        .reveal .image-slide img {
            max-width: 80%;
            max-height: 60vh;
        }
        .reveal .progress {
            display: ${includeProgress ? 'block' : 'none'};
        }
        .reveal .controls {
            display: ${includeControls ? 'block' : 'none'};
        }
        .speaker-notes {
            display: none;
        }
    </style>
</head>
<body>
    <div class="reveal">
        <div class="slides">
            ${titleSlide}
            ${contentSlides}
        </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.3.1/reveal.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.3.1/plugin/markdown/markdown.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.3.1/plugin/highlight/highlight.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.3.1/plugin/notes/notes.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.3.1/plugin/zoom/zoom.min.js"></script>
    
    <script>
        Reveal.initialize({
            hash: true,
            transition: '${transition}',
            ${autoSlideConfig}
            plugins: [ RevealMarkdown, RevealHighlight, RevealNotes, RevealZoom ]
        });
    </script>
</body>
</html>`
}

function generateTitleSlide(title: string, subtitle?: string, author?: string): string {
  return `
        <section class="title-slide">
            <h1>${escapeHtml(title)}</h1>
            ${subtitle ? `<h3>${escapeHtml(subtitle)}</h3>` : ''}
            ${author ? `<p><em>by ${escapeHtml(author)}</em></p>` : ''}
        </section>`
}

function generateSlide(slide: {
  title: string
  content: string
  layout?: string
  background?: string
  notes?: string
}): string {
  const { title, content, layout = 'content', background, notes } = slide
  
  const backgroundAttr = background ? `data-background="${background}"` : ''
  const speakerNotes = notes ? `<aside class="notes">${escapeHtml(notes)}</aside>` : ''
  
  let slideContent = ''
  
  switch (layout) {
    case 'title':
      slideContent = `
            <h1>${escapeHtml(title)}</h1>
            <div data-markdown>
                <textarea data-template>
${content}
                </textarea>
            </div>`
      break
      
    case 'two-column':
      const [leftContent, rightContent] = content.split('|||').map(c => c.trim())
      slideContent = `
            <h2>${escapeHtml(title)}</h2>
            <div class="two-column">
                <div class="column">
                    <div data-markdown>
                        <textarea data-template>
${leftContent || content}
                        </textarea>
                    </div>
                </div>
                <div class="column">
                    <div data-markdown>
                        <textarea data-template>
${rightContent || ''}
                        </textarea>
                    </div>
                </div>
            </div>`
      break
      
    case 'quote':
      slideContent = `
            <div class="quote-slide">
                <h2>${escapeHtml(title)}</h2>
                <blockquote>${escapeHtml(content)}</blockquote>
            </div>`
      break
      
    case 'image':
      slideContent = `
            <div class="image-slide">
                <h2>${escapeHtml(title)}</h2>
                <div data-markdown>
                    <textarea data-template>
${content}
                    </textarea>
                </div>
            </div>`
      break
      
    case 'blank':
      slideContent = `
            <div data-markdown>
                <textarea data-template>
# ${title}

${content}
                </textarea>
            </div>`
      break
      
    default: // content
      slideContent = `
            <h2>${escapeHtml(title)}</h2>
            <div data-markdown>
                <textarea data-template>
${content}
                </textarea>
            </div>`
  }
  
  return `
        <section ${backgroundAttr}>
            ${slideContent}
            ${speakerNotes}
        </section>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Helper functions for creating presentation examples
export function createBusinessPresentationExample() {
  return {
    title: "Quarterly Business Review",
    subtitle: "Q4 2024 Results",
    author: "Business Team",
    theme: "white",
    transition: "slide",
    slides: [
      {
        title: "Agenda",
        content: `- Executive Summary
- Financial Performance
- Key Achievements
- Challenges & Solutions
- Q1 2025 Outlook
- Questions & Discussion`,
        layout: "content"
      },
      {
        title: "Executive Summary",
        content: `## Key Highlights

- Revenue growth of **15%** YoY
- Successful product launch in Q4
- Expansion into 3 new markets
- Team growth of 25%

## Challenges Addressed

- Supply chain optimization
- Customer retention improvements`,
        layout: "content"
      }
    ],
    includeProgress: true,
    includeControls: true
  }
}

// Default export for backward compatibility
export const presentationTool = createPresentationTool('openai-compatible:claude-3.5-sonnet')