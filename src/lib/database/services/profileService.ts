import { supabase, isSupabaseConfigured } from '../../supabase'
import { normalizeUsername, validateUsername } from '../../username'

export async function resolveLoginEmail(identifier: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null

  const trimmed = identifier.trim()
  if (!trimmed) return null

  const { data, error } = await supabase.rpc('resolve_login_email', {
    p_identifier: trimmed,
  })

  if (error) {
    console.error('Error resolving login identifier:', error)
    return null
  }

  return typeof data === 'string' ? data : null
}

export async function setUserUsername(
  userId: string,
  username: string | null
): Promise<{ username: string | null; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { username: null, error: 'Supabase is not configured' }
  }

  if (username) {
    const validationError = validateUsername(username)
    if (validationError) {
      return { username: null, error: validationError }
    }
  }

  const { data, error } = await supabase.rpc('set_user_username', {
    p_user_id: userId,
    p_username: username ? normalizeUsername(username) : null,
  })

  if (error) {
    const message = error.message.includes('already taken')
      ? 'Username is already taken'
      : error.message.includes('Not authorized')
        ? 'You do not have permission to set this username'
        : error.message
    return { username: null, error: message }
  }

  return { username: (data as string | null) ?? null, error: null }
}

export async function getUsernamesForUserIds(
  userIds: string[]
): Promise<Record<string, string>> {
  if (!isSupabaseConfigured || !supabase || userIds.length === 0) {
    return {}
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, username')
    .in('user_id', userIds)
    .not('username', 'is', null)

  if (error) {
    console.error('Error fetching usernames:', error)
    return {}
  }

  const result: Record<string, string> = {}
  for (const row of data || []) {
    if (row.username) {
      result[row.user_id] = row.username
    }
  }
  return result
}
