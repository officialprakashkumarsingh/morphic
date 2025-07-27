import { tool } from 'ai'
import { z } from 'zod'

export function createScreenshotTool(fullModel: string) {
  return tool({
  description: `Take a fast screenshot of a website for visual inspection.
  
  Use this tool when users want to:
  - Take a screenshot of a website
  - Capture webpage visuals
  - See how a website looks
  - Get a visual snapshot of a site's layout
  
  This tool captures screenshots quickly without heavy processing.
  For text extraction, use the separate OCR tool after screenshot capture.`,
  parameters: z.object({
    url: z.string().describe('The URL of the website to screenshot'),
    width: z.number().default(1200).describe('Screenshot width in pixels'),
    height: z.number().default(800).describe('Screenshot height in pixels'),
    fullPage: z.boolean().default(false).describe('Whether to capture the full page or just viewport'),
    waitFor: z.number().default(2000).describe('Time to wait for page load in milliseconds'),
    analysis: z.string().optional().describe('Specific analysis request from user about the screenshot')
  }),
  execute: async ({ url, width, height, fullPage, waitFor, analysis }) => {
    // Add overall timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Screenshot operation timed out after 30 seconds')), 30000)
    )
    
    const screenshotPromise = (async () => {
      try {
        // Validate and clean URL
        try {
          url = validateAndCleanUrl(url)
        } catch {
          const errorResult = {
            type: 'error',
            error: 'Invalid URL provided. Please provide a valid website URL.',
            status: 'error'
          }
          return JSON.stringify(errorResult)
        }

        // For now, we'll use a screenshot service API instead of running Puppeteer directly
        // This is more suitable for serverless environments
        console.log('Capturing screenshot for URL:', url)
        const screenshotUrl = await captureScreenshot(url, width, height, fullPage, waitFor)
        console.log('Screenshot URL generated:', screenshotUrl)
        
        // No analysis - just screenshot capture
        const domain = extractDomainFromUrl(url)
        const basicInfo = {
          text: `Screenshot captured: ${domain}`,
          analysis: `📸 Screenshot captured successfully from ${url}`
        }
      
              const result = {
          type: 'screenshot',
          url: url,
          screenshotUrl: screenshotUrl,
          width,
          height,
          fullPage,
          ocrText: basicInfo.text,
          analysis: basicInfo.analysis,
          timestamp: new Date().toISOString(),
          status: 'success'
        }
      
        return JSON.stringify(result)
      } catch (error) {
        console.error('Screenshot capture failed:', error)
        const errorResult = {
          type: 'error',
          error: error instanceof Error ? error.message : 'Failed to capture screenshot',
          status: 'error'
        }
        
        return JSON.stringify(errorResult)
      }
    })()
    
    try {
      return await Promise.race([screenshotPromise, timeoutPromise]) as string
    } catch (error) {
      console.error('Screenshot operation failed:', error)
      const timeoutResult = {
        type: 'error',
        error: error instanceof Error ? error.message : 'Screenshot operation failed',
        status: 'error'
      }
      
      return JSON.stringify(timeoutResult)
    }
  }
  })
}

export const screenshotTool = createScreenshotTool('openai-compatible:claude-3.5-sonnet')

async function captureScreenshot(
  url: string, 
  width: number, 
  height: number, 
  fullPage: boolean, 
  waitFor: number
): Promise<string> {
  // Try multiple screenshot services for better reliability
  
  try {
    // Method 1: WordPress mShots service (most reliable)
    const wordpressUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=${width}&h=${height}`
    
    console.log('Using WordPress mShots service for screenshot')
    return wordpressUrl
  } catch (error) {
    console.log('Primary service failed, trying alternatives...')
  }

  try {
    // Method 2: htmlcsstoimage.com API
    const screenshotApiUrl = 'https://htmlcsstoimage.com/demo_run'
    const response = await fetch(screenshotApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html: `<iframe src="${url}" width="${width}" height="${height}" frameborder="0"></iframe>`,
        css: `iframe { width: ${width}px; height: ${height}px; }`,
        google_fonts: '',
        selector: 'iframe',
        ms_delay: waitFor,
        device_scale: 1,
        viewport_width: width,
        viewport_height: height
      })
    })

    if (response.ok) {
      const result = await response.json()
      if (result.url) {
        return result.url
      }
    }
  } catch (error) {
    console.log('htmlcsstoimage service failed, trying fallback...')
  }

  try {
    // Method 3: Screenshot Machine (fallback)
    const screenshotMachineUrl = `https://api.screenshotmachine.com/?key=demo&url=${encodeURIComponent(url)}&dimension=${width}x${height}&format=png&cacheLimit=0`
    
    // Test if the service responds
    const smResponse = await fetch(screenshotMachineUrl, { method: 'HEAD' })
    if (smResponse.ok) {
      return screenshotMachineUrl
    }
  } catch (error) {
    console.log('Screenshot Machine service failed')
  }

  // Method 4: Thumbnail.ws service (alternative)
  const thumbnailWsUrl = `https://api.thumbnail.ws/api/thumbnail/screenshot?url=${encodeURIComponent(url)}&width=${width}&height=${height}&format=png`
  
  return thumbnailWsUrl
}



function extractDomainFromUrl(url: string): string {
  try {
    // Extract domain from URL or image URL
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\?]+)/i)
    return match ? match[1].toLowerCase() : 'website'
  } catch {
    return 'website'
  }
}

// Helper function to validate and clean URLs
export function validateAndCleanUrl(url: string): string {
  try {
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }
    
    const urlObj = new URL(url)
    return urlObj.toString()
  } catch {
    throw new Error('Invalid URL format')
  }
}

// Example usage function
export function createScreenshotExample(): string {
  return `Example screenshot requests:
- "Take a screenshot of https://example.com"
- "Capture a full page screenshot of google.com and analyze the layout"
- "Screenshot github.com homepage and tell me about the navigation structure"
- "Take a screenshot of this website and extract any visible text"
- "Show me how netflix.com looks"
- "Capture a screenshot of reddit.com"
- "Take a mobile-sized screenshot of amazon.com"`
}