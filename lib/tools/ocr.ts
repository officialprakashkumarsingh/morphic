import { tool } from 'ai'
import { createWorker } from 'tesseract.js'
import { z } from 'zod'

export function createScreenshotAnalysisTool() {
  return tool({
    description: `Analyze screenshots and extract text using OCR (Optical Character Recognition).
    
    Use this tool when users want to:
    - Analyze a screenshot in detail
    - Extract text from screenshots
    - Read content from captured images
    - Get detailed analysis of screenshot content
    
    This tool performs deep analysis, so only use it when specifically requested.`,
    parameters: z.object({
      imageUrl: z.string().describe('The URL of the image to extract text from'),
      analysis: z.string().optional().describe('Specific analysis request about the text content')
    }),
    execute: async ({ imageUrl, analysis }) => {
      let worker: any = null
      
      try {
        console.log('Starting OCR text extraction on image:', imageUrl)
        
        // Create Tesseract worker with minimal settings for speed
        worker = await createWorker('eng')
        
        // Perform OCR on the image
        console.log('Starting OCR recognition...')
        const ocrResult = await Promise.race([
          worker.recognize(imageUrl),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('OCR processing timeout - image may be too complex')), 20000)
          )
        ]) as any
        
        const { data: { text, confidence } } = ocrResult
        
        // Clean up the extracted text
        const cleanedText = text.trim().replace(/\n\s*\n/g, '\n').replace(/\s+/g, ' ')
        
        // Analyze the extracted text
        let analysisResult = "🔍 OCR Text Extraction Complete:\n\n"
        analysisResult += `✅ Processing Confidence: ${Math.round(confidence)}%\n`
        analysisResult += `✅ Characters Extracted: ${cleanedText.length}\n\n`
        
        // Text statistics
        const words = cleanedText.split(/\s+/).filter((word: string) => word.length > 0)
        const lines = cleanedText.split('\n').filter((line: string) => line.trim().length > 0)
        
        analysisResult += "📊 Text Statistics:\n"
        analysisResult += `• Total Words: ${words.length}\n`
        analysisResult += `• Total Lines: ${lines.length}\n`
        analysisResult += `• Average Words per Line: ${Math.round(words.length / Math.max(lines.length, 1))}\n\n`
        
        // Identify content types
        const hasUrls = /https?:\/\/|www\.|\.com|\.org|\.net/i.test(cleanedText)
        const hasEmails = /@[\w.-]+\.[a-zA-Z]{2,}/g.test(cleanedText)
        const hasPhones = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g.test(cleanedText)
        const hasNavigation = /nav|menu|home|about|contact|login|sign/i.test(cleanedText)
        const hasButtons = /button|click|submit|search|download/i.test(cleanedText)
        
        analysisResult += "🔍 Content Analysis:\n"
        if (hasUrls) analysisResult += "• URLs/Links detected\n"
        if (hasEmails) analysisResult += "• Email addresses found\n"
        if (hasPhones) analysisResult += "• Phone numbers identified\n"
        if (hasNavigation) analysisResult += "• Navigation elements present\n"
        if (hasButtons) analysisResult += "• Interactive buttons detected\n"
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
          analysisResult += "💡 Full text extracted - ask for complete text if needed.\n"
        }
        
        const result = {
          type: 'screenshot_analysis',
          imageUrl,
          extractedText: cleanedText,
          confidence: Math.round(confidence),
          wordCount: words.length,
          lineCount: lines.length,
          analysis: analysisResult,
          timestamp: new Date().toISOString(),
          status: 'success'
        }
        
        return JSON.stringify(result)
        
      } catch (error) {
        console.error('Primary OCR extraction failed:', error)
        
        // Try a simpler OCR approach as fallback
        try {
          console.log('Attempting simplified OCR fallback...')
          
          if (worker) {
            await worker.terminate()
          }
          
          // Create a new simple worker
          worker = await createWorker('eng')
          const simpleResult = await worker.recognize(imageUrl)
          
          const fallbackAnalysis = `🔍 Screenshot Analysis (Simplified):\n\n✅ Fallback OCR completed\n⚠️ Primary analysis failed, using simplified method\n\n📄 Extracted Text:\n"${simpleResult.data.text || 'No text detected'}"\n\n💡 Note: This is a simplified analysis. For better results, try with a clearer image.`
          
          const result = {
            type: 'screenshot_analysis',
            imageUrl,
            extractedText: simpleResult.data.text || '',
            confidence: Math.round(simpleResult.data.confidence || 0),
            wordCount: (simpleResult.data.text || '').split(/\s+/).length,
            lineCount: (simpleResult.data.text || '').split('\n').length,
            analysis: fallbackAnalysis,
            timestamp: new Date().toISOString(),
            status: 'success'
          }
          
          return JSON.stringify(result)
          
        } catch (fallbackError) {
          console.error('Fallback OCR also failed:', fallbackError)
          
          const errorResult = {
            type: 'screenshot_analysis',
            imageUrl,
            extractedText: '',
            confidence: 0,
            analysis: `❌ Screenshot analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\n🔄 Both primary and fallback OCR methods failed.\n\nPossible reasons:\n• Image quality too low for text recognition\n• No readable text in the image\n• Network connection issues\n• Server processing limitations\n\n💡 Tips:\n• Try with a different screenshot\n• Ensure the image contains clear, readable text\n• Check your internet connection`,
            timestamp: new Date().toISOString(),
            status: 'error'
          }
          
          return JSON.stringify(errorResult)
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
  })
}

export const screenshotAnalysisTool = createScreenshotAnalysisTool()