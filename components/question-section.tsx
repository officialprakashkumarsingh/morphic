'use client'

import { ToolInvocation } from 'ai'

import { CollapsibleMessage } from './collapsible-message'
import { QuestionConfirmation } from './question-confirmation'
import { Section, ToolArgsSection } from './section'
import { ToolBadge } from './tool-badge'

interface QuestionSectionProps {
  tool: ToolInvocation
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function QuestionSection({
  tool,
  isOpen = true,
  onOpenChange = () => {}
}: QuestionSectionProps) {
  const handleConfirm = (toolCallId: string, approved: boolean, response?: any) => {
    // This would normally be handled by the parent component
    console.log('Question confirmed:', { toolCallId, approved, response })
  }

  return (
    <CollapsibleMessage
      role="assistant"
      isCollapsible={false}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <div className="flex flex-col gap-4">
        <ToolBadge tool="question">
          Question
        </ToolBadge>
        
        <ToolArgsSection tool="question">
          {tool.args?.question || 'Question'}
        </ToolArgsSection>
        
        {tool.state === 'call' ? (
          <Section title="Question">
            <QuestionConfirmation
              toolInvocation={tool}
              onConfirm={handleConfirm}
            />
          </Section>
        ) : tool.state === 'result' ? (
          <Section title="Question Response">
            <QuestionConfirmation
              toolInvocation={tool}
              onConfirm={handleConfirm}
              isCompleted={true}
            />
          </Section>
        ) : null}
      </div>
    </CollapsibleMessage>
  )
}