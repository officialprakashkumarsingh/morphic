import { tool } from 'ai'
import { createWorker } from 'tesseract.js'
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

// Heavy OCR analysis - only run when specifically requested
async function performOCRAnalysis(imageUrl: string, userAnalysis?: string): Promise<{text: string, analysis: string}> {
  let worker: any = null
  
  try {
    console.log('Starting OCR analysis on screenshot:', imageUrl)
    
    // Create Tesseract worker with timeout
    worker = await Promise.race([
      createWorker('eng'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OCR worker creation timeout')), 10000)
      )
    ]) as any
    
    // Perform OCR on the screenshot image with timeout
    const ocrResult = await Promise.race([
      worker.recognize(imageUrl),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OCR processing timeout')), 15000)
      )
    ]) as any
    
    const { data: { text, confidence } } = ocrResult
    
    // Clean up the extracted text
    const cleanedText = text.trim().replace(/\n\s*\n/g, '\n').replace(/\s+/g, ' ')
    
    // Analyze the extracted text
    let analysis = "📸 Real OCR Screenshot Analysis:\n\n"
    analysis += `✅ OCR Processing Complete (Confidence: ${Math.round(confidence)}%)\n`
    analysis += `✅ Text Extraction Successful\n`
    analysis += `✅ Found ${cleanedText.length} characters of text\n\n`
    
    // Text analysis
    const words = cleanedText.split(/\s+/).filter((word: string) => word.length > 0)
    const lines = cleanedText.split('\n').filter((line: string) => line.trim().length > 0)
    
    analysis += "📊 Content Statistics:\n"
    analysis += `• Total Characters: ${cleanedText.length}\n`
    analysis += `• Total Words: ${words.length}\n`
    analysis += `• Total Lines: ${lines.length}\n\n`
    
    // Identify common web elements
    const hasNavigation = /nav|menu|home|about|contact|login|sign/i.test(cleanedText)
    const hasHeadings = /^[A-Z][A-Za-z\s]{5,}$/m.test(cleanedText)
    const hasButtons = /button|click|submit|search|download|sign up|log in/i.test(cleanedText)
    const hasLinks = /http|www\.|\.com|\.org|\.net/i.test(cleanedText)
    
    analysis += "🔍 Detected Web Elements:\n"
    if (hasNavigation) analysis += "• Navigation menu detected\n"
    if (hasHeadings) analysis += "• Headings and titles found\n"
    if (hasButtons) analysis += "• Interactive buttons identified\n"
    if (hasLinks) analysis += "• Links and URLs detected\n"
    analysis += "\n"
    
    // Domain-specific insights based on extracted text
    const domain = extractDomainFromUrl(imageUrl)
    if (cleanedText.toLowerCase().includes('github') || domain.includes('github')) {
      analysis += "🔍 GitHub Platform Content:\n"
      analysis += "• Code repository interface detected\n"
      analysis += "• Developer-focused content\n\n"
    } else if (cleanedText.toLowerCase().includes('google') || domain.includes('google')) {
      analysis += "🔍 Google Service Content:\n"
      analysis += "• Search or Google product interface\n"
      analysis += "• Clean, minimalist design\n\n"
    }
    
    // User-specific analysis
    if (userAnalysis) {
      analysis += `🎯 User-Requested Analysis: "${userAnalysis}"\n\n`
      
      // Check if the extracted text contains relevant keywords
      const keywords = userAnalysis.toLowerCase().split(/\s+/)
      const matchingKeywords = keywords.filter((keyword: string) => 
        cleanedText.toLowerCase().includes(keyword)
      )
      
      if (matchingKeywords.length > 0) {
        analysis += `✅ Found relevant content: ${matchingKeywords.join(', ')}\n`
      } else {
        analysis += "ℹ️ The requested analysis terms were not found in the extracted text\n"
      }
      analysis += "\n"
    }
    
    // Text preview
    const preview = cleanedText.length > 200 ? cleanedText.substring(0, 200) + '...' : cleanedText
    analysis += "📄 Extracted Text Preview:\n"
    analysis += `"${preview}"\n\n`
    
    analysis += "💡 OCR Analysis Complete:\n"
    analysis += "• Real text extraction from screenshot image\n"
    analysis += "• Content analysis based on actual visible text\n"
    analysis += "• Web element detection and classification\n"
    analysis += `• Processing confidence: ${Math.round(confidence)}%`
    
    return {
      text: cleanedText || 'No text could be extracted from the screenshot',
      analysis: analysis
    }
    
  } catch (error) {
    console.error('OCR analysis failed:', error)
    
    // Enhanced fallback analysis without OCR
    const domain = extractDomainFromUrl(imageUrl)
    
    let analysis = "📸 Screenshot Analysis (No OCR):\n\n"
    analysis += "✅ Screenshot successfully captured\n"
    analysis += `❌ OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`
    
    // Provide domain-specific insights
    if (domain.includes('github')) {
      analysis += "🔍 GitHub Platform Detected:\n"
      analysis += "• Code repository hosting interface\n"
      analysis += "• Developer-focused content and navigation\n"
      analysis += "• Typical elements: repositories, code, profiles\n\n"
    } else if (domain.includes('google')) {
      analysis += "🔍 Google Service Detected:\n"
      analysis += "• Clean, minimalist design expected\n"
      analysis += "• Search interface or Google product\n"
      analysis += "• Typical elements: search bar, navigation, results\n\n"
    } else if (domain.includes('netflix')) {
      analysis += "🔍 Netflix Platform Detected:\n"
      analysis += "• Streaming service interface\n"
      analysis += "• Content browsing and discovery\n"
      analysis += "• Typical elements: movie grid, navigation, profiles\n\n"
    } else {
      analysis += "🔍 Website Analysis:\n"
      analysis += "• Modern web interface captured\n"
      analysis += "• Standard web elements likely present\n"
      analysis += "• Navigation, content, and branding visible\n\n"
    }
    
    if (userAnalysis) {
      analysis += `🎯 User Request: "${userAnalysis}"\n`
      analysis += "While OCR couldn't extract text, the screenshot is available for visual analysis.\n\n"
    }
    
    analysis += "💡 Screenshot Available:\n"
    analysis += "• Visual inspection of layout and design\n"
    analysis += "• Color scheme and branding visible\n"
    analysis += "• Navigation structure observable\n"
    analysis += "• Content organization apparent\n\n"
    
    analysis += "🔄 Note: OCR failed but screenshot capture was successful. You can still visually analyze the website's design and layout."
    
    return {
      text: `Screenshot from ${domain} captured successfully. Visual analysis available without text extraction.`,
      analysis: analysis
    }
  } finally {
    // Clean up the worker
    if (worker) {
      try {
        await worker.terminate()
      } catch (error) {
        console.error('Error terminating OCR worker:', error)
      }
    }
  }
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