'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import SprintDialog from './SprintDialog'
import AISprintDialog from './AISprintDialog'

interface CreateSprintButtonProps {
  onSprintCreated: () => void
}

export default function CreateSprintButton({ onSprintCreated }: CreateSprintButtonProps) {
  const [isSimpleOpen, setIsSimpleOpen] = useState(false)
  const [isAIOpen, setIsAIOpen] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  function handleCreated() {
    setIsSimpleOpen(false)
    setIsAIOpen(false)
    setShowOptions(false)
    onSprintCreated()
  }

  if (showOptions) {
    return (
      <div className="flex gap-2">
        <Button
          onClick={() => {
            setShowOptions(false)
            setIsSimpleOpen(true)
          }}
          variant="outline"
        >
          Quick Create
        </Button>
        <Button
          onClick={() => {
            setShowOptions(false)
            setIsAIOpen(true)
          }}
        >
          AI Assistant
        </Button>
        <Button
          variant="ghost"
          onClick={() => setShowOptions(false)}
        >
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <>
      <Button onClick={() => setShowOptions(true)} className="gap-2">
        <span>+</span> New Sprint
      </Button>
      <SprintDialog isOpen={isSimpleOpen} onOpenChange={setIsSimpleOpen} onSprintCreated={handleCreated} />
      <AISprintDialog isOpen={isAIOpen} onOpenChange={setIsAIOpen} onSprintCreated={handleCreated} />
    </>
  )
}
