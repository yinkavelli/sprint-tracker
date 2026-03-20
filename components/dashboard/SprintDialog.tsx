'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

interface SprintDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSprintCreated: () => void
}

export default function SprintDialog({
  isOpen,
  onOpenChange,
  onSprintCreated,
}: SprintDialogProps) {
  const supabase = createClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreateSprint(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be logged in to create a sprint')
        return
      }

      const { error: insertError } = await supabase.from('sprints').insert({
        user_id: user.id,
        title,
        description,
        status: 'active',
      })

      if (insertError) {
        setError(insertError.message)
        return
      }

      setTitle('')
      setDescription('')
      onOpenChange(false)
      onSprintCreated()
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Create New Sprint</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleCreateSprint} className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Sprint Title</Label>
            <Input
              id="title"
              placeholder="e.g., Q1 Fitness Goals"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <textarea
              id="description"
              placeholder="Describe your sprint..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating...' : 'Create Sprint'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
