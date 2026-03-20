import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginForm from '@/components/auth/LoginForm'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (!error && data?.user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoginForm />
    </div>
  )
}
