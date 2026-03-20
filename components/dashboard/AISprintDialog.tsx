'use client'

import { useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

interface AISprintDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSprintCreated: () => void
}

function getUIMessageText(message: any): string {
  if (!message.parts || !Array.isArray(message.parts)) return ''
  return message.parts
    .filter((p: any): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p: any) => p.text)
    .join('')
}

export default function AISprintDialog({
  isOpen,
  onOpenChange,
  onSprintCreated,
}: AISprintDialogProps) {
  const supabase = createClient()
  const [sprintData, setSprintData] = useState({
    title: '',
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const { messages, input, setInput, append, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    initialMessages: [
      {
        id: '1',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'Hi! I\'m here to help you create a new sprint. To get started, what would you like to focus on? This could be a fitness goal, work project, learning objective, or anything else you\'d like to track.',
          },
        ],
      },
    ],
  })

  async function handleCreateSprint() {
    if (!sprintData.title.trim()) {
      alert('Please enter a sprint title')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('sprints').insert({
        title: sprintData.title,
        description: sprintData.description,
        status: 'active',
      })

      if (error) {
        alert('Error creating sprint: ' + error.message)
        return
      }

      setSprintData({ title: '', description: '' })
      setInput('')
      onOpenChange(false)
      onSprintCreated()
    } catch (err) {
      console.error('Error:', err)
      alert('An error occurred while creating the sprint')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">Create Sprint with AI</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <p className="text-sm">{getUIMessageText(message)}</p>
              </div>
            </div>
          ))}
          {status === 'streaming' && (
            <div className="flex gap-3">
              <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-muted">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t p-4 space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Sprint Title</label>
            <Input
              placeholder="e.g., Q1 Fitness Goals"
              value={sprintData.title}
              onChange={(e) =>
                setSprintData({ ...sprintData, title: e.target.value })
              }
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Description</label>
            <textarea
              placeholder="Based on our conversation..."
              value={sprintData.description}
              onChange={(e) =>
                setSprintData({ ...sprintData, description: e.target.value })
              }
              disabled={submitting}
              className="w-full px-3 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  append({ role: 'user', content: input })
                }
              }}
              placeholder="Continue the conversation..."
              disabled={status === 'streaming' || submitting}
              className="flex-1 px-3 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button
              onClick={() => append({ role: 'user', content: input })}
              disabled={!input.trim() || status === 'streaming' || submitting}
            >
              Send
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSprint}
              disabled={!sprintData.title.trim() || submitting}
              className="flex-1"
            >
              {submitting ? 'Creating...' : 'Create Sprint'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
