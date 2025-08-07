import { supabase, isSupabaseConfigured } from '../../supabase'
import type { Workspace, WorkspaceUser } from '../../supabase'

// Workspace functions
export const getWorkspaces = async (): Promise<Workspace[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_workspaces')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching workspaces:', error)
    return []
  }
}

// Workspace Users functions
export const getWorkspaceUsers = async (): Promise<WorkspaceUser[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_workspace_users')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('workspace_users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching workspace users:', error)
    return []
  }
}

export const createUser = async (
  email: string, 
  role: 'admin' | 'member', 
  fullName?: string, 
  team?: 'Design' | 'Product' | 'Engineering' | 'Other'
): Promise<{ user: WorkspaceUser | null, error: string | null }> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const workspaceUsers = JSON.parse(localStorage.getItem('kyp_workspace_users') || '[]')
      
      // Check if user already exists
      const existingUser = workspaceUsers.find((u: WorkspaceUser) => u.user_email === email)
      if (existingUser) {
        return { user: null, error: 'User already exists in workspace' }
      }
      
      const newUser: WorkspaceUser = {
        id: `wu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        workspace_id: 'default-workspace',
        user_id: null,
        user_email: email,
        role,
        full_name: fullName || null,
        team: team || null,
        invited_by: 'current-user',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      workspaceUsers.push(newUser)
      localStorage.setItem('kyp_workspace_users', JSON.stringify(workspaceUsers))
      
      return { user: newUser, error: null }
    } catch (error) {
      console.error('Error creating user locally:', error)
      return { user: null, error: 'Failed to create user' }
    }
  }

  try {
    // Get current user's session token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return { user: null, error: 'Not authenticated' }
    }

    // Call the Edge Function to invite the user
    const { data, error } = await supabase.functions.invoke('invite-team-member', {
      body: { email, role, fullName, team },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    if (error) {
      console.error('Edge function error:', error)
      return { user: null, error: error.message || 'Failed to send invitation' }
    }

    if (data.error) {
      return { user: null, error: data.error }
    }

    return { user: data.user, error: null }
  } catch (error) {
    console.error('Error creating user:', error)
    return { user: null, error: 'Failed to send invitation' }
  }
}

export const updateWorkspaceUser = async (
  userId: string, 
  updates: { 
    full_name?: string
    team?: 'Design' | 'Product' | 'Engineering' | 'Other' | null
  }
): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const workspaceUsers = JSON.parse(localStorage.getItem('kyp_workspace_users') || '[]')
      const updatedUsers = workspaceUsers.map((user: WorkspaceUser) => 
        user.id === userId 
          ? { ...user, ...updates, updated_at: new Date().toISOString() }
          : user
      )
      localStorage.setItem('kyp_workspace_users', JSON.stringify(updatedUsers))
      return true
    } catch (error) {
      console.error('Error updating workspace user locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('workspace_users')
      .update(updates)
      .eq('id', userId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating workspace user:', error)
    return false
  }
}

export const updateUserRole = async (userId: string, newRole: 'admin' | 'member'): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const workspaceUsers = JSON.parse(localStorage.getItem('kyp_workspace_users') || '[]')
      const updatedUsers = workspaceUsers.map((user: WorkspaceUser) => 
        user.id === userId 
          ? { ...user, role: newRole, updated_at: new Date().toISOString() }
          : user
      )
      localStorage.setItem('kyp_workspace_users', JSON.stringify(updatedUsers))
      return true
    } catch (error) {
      console.error('Error updating user role locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('workspace_users')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating user role:', error)
    return false
  }
}

export const removeUser = async (userId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const workspaceUsers = JSON.parse(localStorage.getItem('kyp_workspace_users') || '[]')
      const filteredUsers = workspaceUsers.filter((user: WorkspaceUser) => user.id !== userId)
      localStorage.setItem('kyp_workspace_users', JSON.stringify(filteredUsers))
      return true
    } catch (error) {
      console.error('Error removing user locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('workspace_users')
      .delete()
      .eq('id', userId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error removing user:', error)
    return false
  }
}

export const getCurrentUserRole = async (): Promise<string | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback - return 'owner' for demo
    return 'owner'
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('workspace_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error getting user role:', error)
      return null
    }

    return data?.role || null
  } catch (error) {
    console.error('Error getting current user role:', error)
    return null
  }
}