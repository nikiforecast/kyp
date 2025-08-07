import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured, forceSignOut, SupabaseAuthError } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Workspace } from '../lib/supabase'

// Mock user for local development
const createMockUser = (email: string): User => ({
  id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  email,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {}
})

// Local storage keys
const LOCAL_USER_KEY = 'kyp_local_user'
const LOCAL_USERS_KEY = 'kyp_local_users'

// Get stored users from localStorage
const getStoredUsers = (): Array<{email: string, password: string}> => {
  try {
    const stored = localStorage.getItem(LOCAL_USERS_KEY)
    return stored ? JSON.parse(stored) : [
      { email: 'niki@legl.com', password: 'test1234' }
    ]
  } catch {
    return [{ email: 'niki@legl.com', password: 'test1234' }]
  }
}

// Store users in localStorage
const storeUsers = (users: Array<{email: string, password: string}>) => {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users))
  } catch (error) {
    console.error('Failed to store users:', error)
  }
}

// Add user to Legl workspace (imported from database.ts logic)
const addUserToLeglWorkspace = async (userId: string, userEmail: string): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    try {
      // First, ensure 'Legl' workspace exists
      let { data: leglWorkspace, error: selectError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('name', 'Legl')
        .maybeSingle()
      
      if (selectError && selectError.code !== 'PGRST116') {
        console.error('Error finding Legl workspace:', selectError)
        return
      }
      
      if (!leglWorkspace) {
        // Create Legl workspace if it doesn't exist
        const { data: newWorkspace, error: insertError } = await supabase
          .from('workspaces')
          .insert([{ name: 'Legl', created_by: userId }])
          .select()
          .maybeSingle()
        
        if (insertError) {
          console.error('Error creating Legl workspace:', insertError)
          return
        }
        leglWorkspace = newWorkspace
      }
      
      if (!leglWorkspace) {
        console.error('Unable to find or create Legl workspace')
        return
      }
      
      // Check if user is already in workspace
      const { data: existingMembership } = await supabase
        .from('workspace_users')
        .select('id')
        .eq('workspace_id', leglWorkspace.id)
        .eq('user_id', userId)
        .single()
      
      if (!existingMembership) {
        // Add user to workspace
        await supabase
          .from('workspace_users')
          .insert([{
            workspace_id: leglWorkspace.id,
            user_id: userId,
            user_email: userEmail,
            role: 'member',
            status: 'active'
          }])
      } else {
        // Update existing pending membership to active
        await supabase
          .from('workspace_users')
          .update({ 
            user_id: userId, 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('workspace_id', leglWorkspace.id)
          .eq('user_email', userEmail)
          .eq('status', 'pending')
      }
    } catch (error) {
      console.error('Error adding user to Legl workspace:', error)
    }
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasInitialized, setHasInitialized] = useState(false)

  useEffect(() => {
    // Prevent re-initialization if we've already initialized
    if (hasInitialized) {
      return
    }

    const initAuth = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          // Get initial session
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            setUser(session.user)
          }

          // Listen for auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
              setUser(session?.user ?? null)
            }
          )

          setLoading(false)
          setHasInitialized(true)
          return () => subscription.unsubscribe()
        } catch (error) {
          if (error instanceof SupabaseAuthError) {
            console.warn('Authentication session expired, user will be signed out')
          } else {
            console.error('Supabase auth error:', error)
          }
          setUser(null)
          setLoading(false)
          setHasInitialized(true)
        }
      } else {
        initLocalAuth()
      }
    }

    const initLocalAuth = () => {
      console.log('🔵 useAuth: initLocalAuth called')
      try {
        const storedUser = localStorage.getItem(LOCAL_USER_KEY)
        console.log('🔵 useAuth: storedUser from localStorage:', storedUser)
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser)
          console.log('🔵 useAuth: Setting user from localStorage:', parsedUser)
          setUser(parsedUser)
        } else {
          console.log('🔵 useAuth: No stored user found')
        }
      } catch (error) {
        console.error('Failed to load stored user:', error)
      }
      setLoading(false)
      setHasInitialized(true)
    }

    initAuth()
  }, [hasInitialized])

  const signIn = async (email: string, password: string) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        
        if (error) {
          return { error: { message: error.message } }
        }
        
        // Add user to Legl workspace after successful sign in
        if (data.user) {
          await addUserToLeglWorkspace(data.user.id, data.user.email || email)
        }
        
        return { error: null }
      } catch (error) {
        console.error('Supabase sign in error:', error)
        return { error: { message: 'Failed to sign in. Please try again.' } }
      }
    } else {
      // Local authentication
      const users = getStoredUsers()
      const foundUser = users.find(u => u.email === email && u.password === password)
      
      if (foundUser) {
        const authUser = createMockUser(email)
        setUser(authUser)
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(authUser))
        return { error: null }
      } else {
        return { error: { message: 'Invalid email or password' } }
      }
    }
  }

  const signUp = async (email: string, password: string) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password
        })
        
        if (error) {
          // Handle user already exists error with helpful message
          if (error.message.includes('User already registered') || error.message.includes('user_already_exists')) {
            return { 
              error: { 
                message: 'An account with this email already exists. If you were invited to join a workspace, please use the Sign In form instead. If you forgot your password, you can reset it using the "Forgot Password" option.' 
              } 
            }
          }
          return { error: { message: error.message } }
        }
        
        // Note: User will be added to Legl workspace when they confirm their email and sign in
        
        return { error: null }
      } catch (error) {
        console.error('Supabase sign up error:', error)
        return { error: { message: 'Failed to create account. Please try again.' } }
      }
    } else {
      // Local authentication
      const users = getStoredUsers()
      
      // Check if user already exists
      if (users.find(u => u.email === email)) {
        return { error: { message: 'User already exists' } }
      }
      
      // Add new user
      users.push({ email, password })
      storeUsers(users)
      
      // Check if user was pre-added to workspace and activate them
      try {
        const workspaceUsers = JSON.parse(localStorage.getItem('kyp_workspace_users') || '[]')
        const updatedWorkspaceUsers = workspaceUsers.map((wu: any) => 
          wu.user_email === email 
            ? { ...wu, status: 'active', user_id: `user-${Date.now()}`, updated_at: new Date().toISOString() }
            : wu
        )
        localStorage.setItem('kyp_workspace_users', JSON.stringify(updatedWorkspaceUsers))
      } catch (error) {
        console.error('Error updating workspace user status:', error)
      }
      
      return { error: null }
    }
  }

  const signOut = async () => {
    console.log('🔵 useAuth: signOut called')
    if (isSupabaseConfigured && supabase) {
      console.log('🔵 useAuth: Using Supabase signOut')
      // Use forceSignOut to aggressively clear session without server call
      await forceSignOut()
      setUser(null)
      console.log('🔵 useAuth: Supabase user set to null')
      return { error: null }
    } else {
      console.log('🔵 useAuth: Using local signOut')
      // Local authentication - clear localStorage FIRST
      localStorage.removeItem(LOCAL_USER_KEY)
      console.log('🔵 useAuth: localStorage cleared')
      
      // Then set user to null and reset initialization flag
      setUser(null)
      setHasInitialized(false)
      console.log('🔵 useAuth: Local user set to null and hasInitialized reset')
      
      return { error: null }
    }
  }

  const sendPasswordResetEmail = async (email: string) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`
        })
        
        if (error) {
          return { error: { message: error.message } }
        }
        
        return { error: null }
      } catch (error) {
        console.error('Supabase password reset error:', error)
        return { error: { message: 'Failed to send password reset email. Please try again.' } }
      }
    } else {
      // Local authentication - simulate success
      return { error: null }
    }
  }

  const updateUserPassword = async (newPassword: string) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        })
        
        if (error) {
          return { error: { message: error.message } }
        }
        
        return { error: null }
      } catch (error) {
        console.error('Supabase password update error:', error)
        return { error: { message: 'Failed to update password. Please try again.' } }
      }
    } else {
      // Local authentication - simulate success
      return { error: null }
    }
  }

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    sendPasswordResetEmail,
    updateUserPassword
  }
}