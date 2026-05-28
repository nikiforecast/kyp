import type { User } from '@supabase/supabase-js'

/** Platform admins are configured in Supabase Auth via app_metadata.is_admin = true */
export function isPlatformAdmin(user: User | null | undefined): boolean {
  if (!user) return false
  return user.app_metadata?.is_admin === true
}
