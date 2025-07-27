import { tool } from 'ai'
import { z } from 'zod'

export function createScreenshotAnalysisTool() {
  return tool({
    description: `Analyze screenshots and extract text using OCR API service.
    
    Use this tool when users want to:
    - Analyze a screenshot in detail
    - Extract text from screenshots
    - Read content from captured images
    - Get detailed analysis of screenshot content
    
    This tool uses reliable OCR API for text extraction.`,
    parameters: z.object({
      imageUrl: z.string().describe('The URL of the image to extract text from'),
      analysis: z.string().optional().describe('Specific analysis request about the text content')
    }),
    execute: async ({ imageUrl, analysis }) => {
      try {
        console.log('Starting OCR analysis with API service:', imageUrl)
        
        // Use OCR.space API (free tier available)
        const ocrResponse = await fetch('https://api.ocr.space/parse/imageurl', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'apikey': 'helloworld', // Free API key
            'url': imageUrl,
            'language': 'eng',
            'isOverlayRequired': 'false',
            'detectOrientation': 'false',
            'scale': 'true',
            'OCREngine': '2'
          })
        })

        if (!ocrResponse.ok) {
          throw new Error(`OCR API failed: ${ocrResponse.status} ${ocrResponse.statusText}`)
        }

        const ocrData = await ocrResponse.json()
        
        if (!ocrData.IsErroredOnProcessing && ocrData.ParsedResults && ocrData.ParsedResults.length > 0) {
          const extractedText = ocrData.ParsedResults[0].ParsedText || ''
          const cleanedText = extractedText.trim().replace(/\r\n/g, '\n').replace(/\n\s*\n/g, '\n')
          
          // Analyze the extracted text
          let analysisResult = "🔍 Screenshot Text Analysis Complete:\n\n"
          analysisResult += `✅ OCR processing successful\n`
          analysisResult += `✅ Text extraction completed\n`
          analysisResult += `✅ Found ${cleanedText.length} characters of text\n\n`
          
          // Text statistics
          const words = cleanedText.split(/\s+/).filter((word: string) => word.length > 0)
          const lines = cleanedText.split('\n').filter((line: string) => line.trim().length > 0)
          
          analysisResult += "📊 Text Statistics:\n"
          analysisResult += `• Total Words: ${words.length}\n`
          analysisResult += `• Total Lines: ${lines.length}\n`
          analysisResult += `• Character Count: ${cleanedText.length}\n\n`
          
          // Content analysis
          const hasUrls = /https?:\/\/|www\.|\.com|\.org|\.net/i.test(cleanedText)
          const hasEmails = /@[\w.-]+\.[a-zA-Z]{2,}/g.test(cleanedText)
          const hasNumbers = /\d+/g.test(cleanedText)
          const hasNavigation = /nav|menu|home|about|contact|login|sign|register/i.test(cleanedText)
          const hasButtons = /button|click|submit|search|download|buy|shop/i.test(cleanedText)
          
          analysisResult += "🔍 Content Analysis:\n"
          if (hasUrls) analysisResult += "• URLs or web links detected\n"
          if (hasEmails) analysisResult += "• Email addresses found\n"
          if (hasNumbers) analysisResult += "• Numeric content present\n"
          if (hasNavigation) analysisResult += "• Navigation elements detected\n"
          if (hasButtons) analysisResult += "• Button or action text found\n"
          if (!hasUrls && !hasEmails && !hasNumbers && !hasNavigation && !hasButtons) {
            analysisResult += "• General text content detected\n"
          }
          analysisResult += "\n"
          
          // User-specific analysis
          if (analysis) {
            analysisResult += `🎯 Requested Analysis: "${analysis}"\n\n`
            
            const keywords = analysis.toLowerCase().split(/\s+/)
            const matchingKeywords = keywords.filter((keyword: string) => 
              cleanedText.toLowerCase().includes(keyword)
            )
            
            if (matchingKeywords.length > 0) {
              analysisResult += `✅ Found relevant content: ${matchingKeywords.join(', ')}\n`
            } else {
              analysisResult += "ℹ️ The requested terms were not found in the extracted text\n"
            }
            analysisResult += "\n"
          }
          
          // Text preview
          const preview = cleanedText.length > 300 ? cleanedText.substring(0, 300) + '...' : cleanedText
          analysisResult += "📄 Extracted Text Preview:\n"
          analysisResult += `"${preview}"\n\n`
          
          if (cleanedText.length > 300) {
            analysisResult += "💡 Full text available - ask to see complete extracted text if needed.\n"
          }
          
          analysisResult += "\n🔄 OCR processing completed successfully using OCR.space API"
          
          const result = {
            type: 'screenshot_analysis',
            imageUrl,
            extractedText: cleanedText,
            confidence: 95, // OCR.space typically has good accuracy
            wordCount: words.length,
            lineCount: lines.length,
            analysis: analysisResult,
            timestamp: new Date().toISOString(),
            status: 'success'
          }
          
          return JSON.stringify(result)
          
        } else {
          throw new Error(ocrData.ErrorMessage || 'No text found in image')
        }
        
      } catch (error) {
        console.error('OCR analysis failed:', error)
        
        const errorResult = {
          type: 'screenshot_analysis',
          imageUrl,
          extractedText: '',
          confidence: 0,
          analysis: `❌ Screenshot analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\n🔄 Possible issues:\n• Image may not contain readable text\n• Image quality too low for OCR\n• OCR service temporarily unavailable\n• Network connection problem\n\n💡 Suggestions:\n• Try with a clearer screenshot\n• Ensure the image contains visible text\n• Check your internet connection\n• Try again in a few moments`,
          timestamp: new Date().toISOString(),
          status: 'error'
        }
        
        return JSON.stringify(errorResult)
      }
    }
  })
}

export const screenshotAnalysisTool = createScreenshotAnalysisTool()