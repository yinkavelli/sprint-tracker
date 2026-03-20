'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import SprintGrid from './SprintGrid'
import CreateSprintButton from './CreateSprintButton'
import UserMenu from './UserMenu'

interface Sprint {
  id: string
  title: string
  description?: string
  status: string
  created_at: string
  updated_at: string
}

export default function DashboardContent({ user }: { user: User }) {
  const supabase = createClient()
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSprints()
  }, [])

  async function fetchSprints() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching sprints:', error)
        return
      }

      setSprints(data || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sprint Tracker</h1>
            <p className="text-muted-foreground">Manage your sprints and track progress</p>
          </div>
          <UserMenu user={user} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card p-6 rounded-lg border">
              <p className="text-sm text-muted-foreground">Total Sprints</p>
              <p className="text-3xl font-bold">{sprints.length}</p>
            </div>
            <div className="bg-card p-6 rounded-lg border">
              <p className="text-sm text-muted-foreground">Active Sprints</p>
              <p className="text-3xl font-bold">
                {sprints.filter(s => s.status === 'active').length}
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg border">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-3xl font-bold">
                {sprints.filter(s => s.status === 'completed').length}
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg border">
              <p className="text-sm text-muted-foreground">On Hold</p>
              <p className="text-3xl font-bold">
                {sprints.filter(s => s.status === 'hold').length}
              </p>
            </div>
          </div>

          {/* Sprints Section */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Your Sprints</h2>
              <p className="text-muted-foreground">Create and manage your goals and sprints</p>
            </div>
            <CreateSprintButton onSprintCreated={fetchSprints} />
          </div>

          {/* Sprint Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading sprints...</p>
            </div>
          ) : sprints.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border-2 border-dashed">
              <h3 className="text-lg font-semibold mb-2">No sprints yet</h3>
              <p className="text-muted-foreground mb-4">Create your first sprint with AI guidance</p>
              <CreateSprintButton onSprintCreated={fetchSprints} />
            </div>
          ) : (
            <SprintGrid sprints={sprints} onSprintDeleted={fetchSprints} />
          )}
        </div>
      </main>
    </div>
  )
}
