import { tool } from 'ai'
import { createWorker } from 'tesseract.js'
import { z } from 'zod'

export function createOCRTool() {
  return tool({
    description: `Extract text from images or screenshots using OCR (Optical Character Recognition).
    
    Use this tool when users want to:
    - Extract text from a screenshot
    - Read text content from images
    - Analyze text in captured images
    - Get readable text from visual content
    
    This tool performs heavy processing, so only use it when specifically requested.`,
    parameters: z.object({
      imageUrl: z.string().describe('The URL of the image to extract text from'),
      analysis: z.string().optional().describe('Specific analysis request about the text content')
    }),
    execute: async ({ imageUrl, analysis }) => {
      let worker: any = null
      
      try {
        console.log('Starting OCR text extraction on image:', imageUrl)
        
        // Create Tesseract worker with timeout
        worker = await Promise.race([
          createWorker('eng'),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('OCR worker creation timeout')), 15000)
          )
        ]) as any
        
        // Perform OCR on the image with timeout
        const ocrResult = await Promise.race([
          worker.recognize(imageUrl),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('OCR processing timeout (this may take a while for complex images)')), 30000)
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
          type: 'ocr',
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
        console.error('OCR extraction failed:', error)
        
        const errorResult = {
          type: 'ocr',
          imageUrl,
          extractedText: '',
          confidence: 0,
          analysis: `❌ OCR text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\n🔄 Possible reasons:\n• Image quality too low\n• Text too small or blurry\n• Complex fonts or styling\n• Network connection issues\n• Processing timeout\n\nTip: Try with a higher quality image or simpler text content.`,
          timestamp: new Date().toISOString(),
          status: 'error'
        }
        
        return JSON.stringify(errorResult)
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

export const ocrTool = createOCRTool()