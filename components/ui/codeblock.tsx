// Referenced from Vercel's AI Chatbot and modified to fit the needs of this project
// https://github.com/vercel/ai-chatbot/blob/c2757f87f986b7f15fdf75c4c89cb2219745c53f/components/ui/codeblock.tsx

'use client'

import { FC, memo } from 'react'
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

  const downloadAsFile = () => {
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
  }

  const onCopy = () => {
    if (isCopied) return
    copyToClipboard(value)
  }

  return (
    <div className="relative w-full font-mono codeblock-container bg-zinc-950 dark:bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 dark:border-zinc-700 my-4">
      <div className="flex items-center justify-between w-full px-3 py-2 bg-zinc-800 dark:bg-zinc-800 text-zinc-100 border-b border-zinc-700">
        <span className="text-xs font-medium text-zinc-300 truncate pr-2">{language || 'text'}</span>
        <div className="flex items-center space-x-1 flex-shrink-0">
          <Button
            variant="ghost"
            className="focus-visible:ring-1 h-7 w-7 p-0 hover:bg-zinc-700"
            onClick={downloadAsFile}
            size="icon"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="sr-only">Download</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="focus-visible:ring-1 focus-visible:ring-offset-0 h-7 w-7 p-0 hover:bg-zinc-700"
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
      <div className="relative overflow-hidden">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          PreTag="div"
          showLineNumbers
          customStyle={{
            margin: 0,
            width: '100%',
            background: 'transparent',
            padding: '1rem',
            fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)',
            overflowX: 'auto',
            maxWidth: '100%',
            borderRadius: '0',
            lineHeight: '1.5',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
          }}
          lineNumberStyle={{
            userSelect: 'none',
            minWidth: '2.5em',
            paddingRight: '1em',
            fontSize: 'clamp(0.7rem, 2.2vw, 0.8rem)',
            textAlign: 'right',
            color: '#6b7280',
            borderRight: '1px solid #374151',
            marginRight: '1em'
          }}
          codeTagProps={{
            style: {
              fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
              lineHeight: '1.5',
              wordBreak: 'normal',
              whiteSpace: 'pre',
              overflowWrap: 'normal'
            }
          }}
          wrapLines={false}
          wrapLongLines={false}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  )
})
CodeBlock.displayName = 'CodeBlock'

export { CodeBlock }
