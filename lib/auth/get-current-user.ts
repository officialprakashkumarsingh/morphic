import { createClient } from '@/lib/supabase/server'

export async function getCurrentUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('Supabase not configured - missing URL or anon key')
    return null // Supabase is not configured
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  
  if (error) {
    console.log('Supabase auth error:', error)
  }
  
  console.log('Current user:', data.user ? `${data.user.id} (${data.user.email})` : 'null')
  return data.user ?? null
}

export async function getCurrentUserId() {
  const user = await getCurrentUser()
  return user?.id ?? 'anonymous'
}
