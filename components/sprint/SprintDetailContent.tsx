'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Task {
  id: string
  sprint_id: string
  title: string
  completed: boolean
  created_at: string
}

interface Sprint {
  id: string
  user_id: string
  title: string
  description?: string
  status: string
  created_at: string
  updated_at: string
}

export default function SprintDetailContent({
  sprint: initialSprint,
  user,
}: {
  sprint: Sprint
  user: User
}) {
  const router = useRouter()
  const supabase = createClient()
  const [sprint, setSprint] = useState(initialSprint)
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchTasks()
  }, [sprint.id])

  async function fetchTasks() {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('sprint_id', sprint.id)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching tasks:', error)
        return
      }

      setTasks(data || [])
    } catch (err) {
      console.error('Error:', err)
    }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          sprint_id: sprint.id,
          title: newTaskTitle,
          completed: false,
        })
        .select()

      if (error) {
        console.error('Error adding task:', error)
        return
      }

      setNewTaskTitle('')
      fetchTasks()
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleTask(taskId: string, completed: boolean) {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !completed })
        .eq('id', taskId)

      if (error) {
        console.error('Error updating task:', error)
        return
      }

      fetchTasks()
    } catch (err) {
      console.error('Error:', err)
    }
  }

  async function handleDeleteTask(taskId: string) {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) {
        console.error('Error deleting task:', error)
        return
      }

      fetchTasks()
    } catch (err) {
      console.error('Error:', err)
    }
  }

  async function handleDeleteSprint() {
    if (confirm('Are you sure you want to delete this sprint?')) {
      try {
        const { error } = await supabase
          .from('sprints')
          .delete()
          .eq('id', sprint.id)

        if (error) {
          console.error('Error deleting sprint:', error)
          return
        }

        router.push('/dashboard')
      } catch (err) {
        console.error('Error:', err)
      }
    }
  }

  const completedTasks = tasks.filter(t => t.completed).length
  const totalTasks = tasks.length
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-primary hover:underline text-sm mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold">{sprint.title}</h1>
            {sprint.description && (
              <p className="text-muted-foreground mt-1">{sprint.description}</p>
            )}
          </div>
          <Button variant="destructive" onClick={handleDeleteSprint}>
            Delete
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Progress Section */}
          <Card className="p-6 mb-8">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold">Progress</h2>
                  <span className="text-sm text-muted-foreground">
                    {completedTasks} of {totalTasks} tasks complete
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <p className="text-2xl font-bold">{progressPercent}%</p>
            </div>
          </Card>

          {/* Tasks Section */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Tasks</h2>

              {/* Add Task Form */}
              <form onSubmit={handleAddTask} className="mb-6 flex gap-2">
                <Input
                  placeholder="Add a new task..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  disabled={loading}
                />
                <Button type="submit" disabled={loading || !newTaskTitle.trim()}>
                  Add
                </Button>
              </form>

              {/* Task List */}
              {tasks.length === 0 ? (
                <div className="text-center py-8 bg-card rounded-lg border-2 border-dashed">
                  <p className="text-muted-foreground">No tasks yet. Add one to get started!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-4 bg-card border rounded-lg hover:shadow-sm transition-shadow"
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggleTask(task.id, task.completed)}
                        className="w-5 h-5 rounded border-gray-300 text-primary cursor-pointer"
                      />
                      <span
                        className={`flex-1 ${
                          task.completed
                            ? 'line-through text-muted-foreground'
                            : 'text-foreground'
                        }`}
                      >
                        {task.title}
                      </span>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
