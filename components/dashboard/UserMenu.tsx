'use client'

import { User } from '@supabase/supabase-js'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function UserMenu({ user }: { user: User }) {
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
          {user.email?.[0].toUpperCase()}
        </div>
        <span className="hidden sm:inline">{user.email}</span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-card border rounded-lg shadow-lg z-10">
          <div className="p-4 border-b">
            <p className="text-sm font-semibold">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 hover:bg-muted text-sm"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
