import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SprintDetailContent from '@/components/sprint/SprintDetailContent'

export default async function SprintDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    redirect('/auth/login')
  }

  // Fetch sprint data
  const { data: sprint, error: sprintError } = await supabase
    .from('sprints')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', data.user.id)
    .single()

  if (sprintError || !sprint) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-background">
      <SprintDetailContent sprint={sprint} user={data.user} />
    </main>
  )
}
