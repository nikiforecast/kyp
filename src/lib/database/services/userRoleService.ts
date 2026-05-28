import { supabase, isSupabaseConfigured } from '../../supabase'
import { getActiveWorkspaceId } from '../../activeWorkspace'
import type { UserRole } from '../../supabase'

export const getUserRoles = async (): Promise<UserRole[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_user_roles')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching user roles:', error)
    return []
  }
}

export const createUserRole = async (name: string, colour: string, icon?: string): Promise<UserRole | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const userRoles = JSON.parse(localStorage.getItem('kyp_user_roles') || '[]')
      const newUserRole: UserRole = {
        id: `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        workspace_id: 'default-workspace',
        name,
        colour,
        icon: icon || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      userRoles.unshift(newUserRole)
      localStorage.setItem('kyp_user_roles', JSON.stringify(userRoles))
      return newUserRole
    } catch (error) {
      console.error('Error creating user role locally:', error)
      return null
    }
  }

  try {
    const activeWorkspaceId = getActiveWorkspaceId()
    let workspaceId = activeWorkspaceId

    if (!workspaceId) {
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('id')
        .limit(1)
        .maybeSingle()
      workspaceId = workspaces?.id || null
    }

    const { data, error } = await supabase
      .from('user_roles')
      .insert([{
        workspace_id: workspaceId,
        name,
        colour,
        icon
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating user role:', error)
    return null
  }
}

export const updateCustomUserRole = async (roleId: string, updates: { name?: string; colour?: string; icon?: string }): Promise<UserRole | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const userRoles = JSON.parse(localStorage.getItem('kyp_user_roles') || '[]')
      const updatedUserRoles = userRoles.map((role: UserRole) => 
        role.id === roleId 
          ? { ...role, ...updates, updated_at: new Date().toISOString() }
          : role
      )
      localStorage.setItem('kyp_user_roles', JSON.stringify(updatedUserRoles))
      
      const updatedRole = updatedUserRoles.find((r: UserRole) => r.id === roleId)
      return updatedRole || null
    } catch (error) {
      console.error('Error updating user role locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_roles')
      .update(updates)
      .eq('id', roleId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating user role:', error)
    return null
  }
}

export const deleteUserRole = async (roleId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const userRoles = JSON.parse(localStorage.getItem('kyp_user_roles') || '[]')
      const filteredUserRoles = userRoles.filter((role: UserRole) => role.id !== roleId)
      localStorage.setItem('kyp_user_roles', JSON.stringify(filteredUserRoles))
      return true
    } catch (error) {
      console.error('Error deleting user role locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', roleId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting user role:', error)
    return false
  }
}