// Referenced from Vercel's AI Chatbot and modified to fit the needs of this project
// https://github.com/vercel/ai-chatbot/blob/c2757f87f986b7f15fdf75c4c89cb2219745c53f/components/ui/codeblock.tsx

'use client'

import { FC, memo, useCallback, useMemo } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'

import { generateId } from 'ai'
import { Check, Copy, Download } from 'lucide-react'

import { useCopyToClipboard } from '@/lib/hooks/use-copy-to-clipboard'

import { Button } from '@/components/ui/button'

interface Props {
  language: string
  value: string
}

interface languageMap {
  [key: string]: string | undefined
}

export const programmingLanguages: languageMap = {
  javascript: '.js',
  python: '.py',
  java: '.java',
  c: '.c',
  cpp: '.cpp',
  'c++': '.cpp',
  'c#': '.cs',
  ruby: '.rb',
  php: '.php',
  swift: '.swift',
  'objective-c': '.m',
  kotlin: '.kt',
  typescript: '.ts',
  go: '.go',
  perl: '.pl',
  rust: '.rs',
  scala: '.scala',
  haskell: '.hs',
  lua: '.lua',
  shell: '.sh',
  sql: '.sql',
  html: '.html',
  css: '.css'
  // add more file extensions here, make sure the key is same as language prop in CodeBlock.tsx component
}

const CodeBlock: FC<Props> = memo(({ language, value }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 })

  // Aggressive truncation to prevent freezing
  const processedValue = useMemo(() => {
    if (!value) return ''
    
    // More aggressive limits to prevent any freezing
    const maxLength = 5000 // Reduced to 5k characters
    const maxLines = 200 // Limit to 200 lines max
    
    let processedCode = value
    
    // Truncate by character length
    if (processedCode.length > maxLength) {
      processedCode = processedCode.substring(0, maxLength) + '\n... [Code truncated - see copy for full content]'
    }
    
    // Truncate by line count
    const lines = processedCode.split('\n')
    if (lines.length > maxLines) {
      processedCode = lines.slice(0, maxLines).join('\n') + '\n... [Lines truncated - see copy for full content]'
    }
    
    return processedCode
  }, [value])

  const downloadAsFile = useCallback(() => {
    if (typeof window === 'undefined') {
      return
    }
    const fileExtension = programmingLanguages[language] || '.file'
    const suggestedFileName = `file-${generateId()}${fileExtension}`
    const fileName = window.prompt('Enter file name', suggestedFileName)

    if (!fileName) {
      // User pressed cancel on prompt.
      return
    }

    const blob = new Blob([value], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = fileName
    link.href = url
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [language, value])

  const onCopy = useCallback(() => {
    if (isCopied) return
    copyToClipboard(value)
  }, [isCopied, copyToClipboard, value])

  return (
    <div className="codeblock-wrapper w-full my-4">
      <div className="codeblock-container bg-zinc-950 dark:bg-zinc-900 rounded-lg border border-zinc-800 dark:border-zinc-700 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 text-zinc-100 border-b border-zinc-700">
          <span className="text-xs font-medium text-zinc-300 truncate flex-1 min-w-0 pr-2">
            {language || 'text'}
          </span>
          <div className="flex items-center space-x-1 flex-shrink-0">
            <Button
              variant="ghost"
              className="h-7 w-7 p-0 hover:bg-zinc-700"
              onClick={downloadAsFile}
              size="icon"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="sr-only">Download</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 p-0 hover:bg-zinc-700"
              onClick={onCopy}
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span className="sr-only">Copy code</span>
            </Button>
          </div>
        </div>
        <div className="codeblock-content">
          <SyntaxHighlighter
            language={language}
            style={oneDark}
            PreTag="div"
            showLineNumbers
            customStyle={{
              margin: 0,
              background: 'transparent',
              padding: '12px',
              fontSize: '13px',
              lineHeight: '1.4',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
              overflow: 'auto',
              maxHeight: '500px', // Limit height to prevent huge blocks
              width: '100%',
              minWidth: 0
            }}
            lineNumberStyle={{
              userSelect: 'none',
              minWidth: '40px',
              paddingRight: '12px',
              fontSize: '12px',
              textAlign: 'right',
              color: '#6b7280',
              borderRight: '1px solid #374151',
              marginRight: '12px',
              display: 'inline-block',
              flexShrink: 0
            }}
            codeTagProps={{
              style: {
                fontSize: '13px',
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                lineHeight: '1.4',
                whiteSpace: 'pre',
                wordBreak: 'normal',
                overflowWrap: 'normal',
                display: 'block',
                width: 'max-content',
                minWidth: '100%'
              }
            }}
            wrapLines={false}
            wrapLongLines={false}
          >
            {processedValue}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  )
})
CodeBlock.displayName = 'CodeBlock'

export { CodeBlock }
