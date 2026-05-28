import { supabase, isSupabaseConfigured } from '../../supabase'
import type { Node, Edge } from '@xyflow/react'
import { getUserJourneyFolders } from './userJourneyFolderService'

export interface UserJourney {
  id: string
  project_id: string | null
  folder_id?: string | null
  name: string
  description?: string
  layout?: 'vertical' | 'horizontal'
  // Status is now computed from folder - journeys inherit status from their parent folder
  // If folder is shared, journey is shared. If folder is personal, journey is personal.
  // Journeys without a folder are personal by default.
  flow_data?: {
    nodes: Node[]
    edges: Edge[]
  }
  public_id?: string | null
  is_publicly_shared?: boolean
  created_at: string
  updated_at: string
  created_by?: string | null
  updated_by?: string | null
  short_id?: number
}

export const getUserJourneys = async (
  projectId?: string | null,
  workspaceIdForFolders?: string
): Promise<UserJourney[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      if (projectId) {
        const stored = localStorage.getItem(`kyp_user_journeys_${projectId}`)
        return stored ? JSON.parse(stored) : []
      } else {
        // Get all journeys
        const stored = localStorage.getItem('kyp_user_journeys_all')
        return stored ? JSON.parse(stored) : []
      }
    } catch {
      return []
    }
  }

  try {
    let query = supabase
      .from('user_journeys')
      .select('*')
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const foldersPromise = workspaceIdForFolders
      ? getUserJourneyFolders(workspaceIdForFolders)
      : Promise.resolve([])

    const projectsPromise =
      workspaceIdForFolders && supabase
        ? supabase.from('projects').select('id').eq('workspace_id', workspaceIdForFolders)
        : Promise.resolve({ data: null, error: null })

    const [journeysResult, foldersResult, projectsResult] = await Promise.all([
      query,
      foldersPromise.catch(() => []),
      projectsPromise,
    ])

    const { data, error } = journeysResult
    const folders = foldersResult || []

    if (error) throw error

    let journeys = data || []

    // Scope to the active workspace — RLS may return journeys from multiple workspaces
    if (workspaceIdForFolders) {
      const folderIdsInWorkspace = new Set(folders.map(f => f.id))
      const projectIdsInWorkspace = new Set(
        (projectsResult.data || []).map((p: { id: string }) => p.id)
      )

      journeys = journeys.filter(journey =>
        (journey.folder_id && folderIdsInWorkspace.has(journey.folder_id)) ||
        (journey.project_id && projectIdsInWorkspace.has(journey.project_id))
      )
    }

    // Workspace members see all journeys RLS allows — no personal/shared filtering
    return journeys.map((journey: UserJourney & { status?: string }) => {
      const { status: _status, ...journeyWithoutStatus } = journey
      return journeyWithoutStatus
    })
  } catch (error) {
    console.error('Error fetching user journeys:', error)
    
    // Fallback to local storage if Supabase fails
    try {
      if (projectId) {
        const stored = localStorage.getItem(`kyp_user_journeys_${projectId}`)
        return stored ? JSON.parse(stored) : []
      } else {
        const stored = localStorage.getItem('kyp_user_journeys_all')
        return stored ? JSON.parse(stored) : []
      }
    } catch (fallbackError) {
      console.error('Local storage fallback also failed:', fallbackError)
      return []
    }
  }
}

export const getAllUserJourneys = async (): Promise<UserJourney[]> => {
  return getUserJourneys(null)
}

export const getUserJourneyById = async (journeyId: string): Promise<UserJourney | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const allJourneys = Object.keys(localStorage)
        .filter(key => key.startsWith('kyp_user_journeys_'))
        .flatMap(key => {
          try {
            return JSON.parse(localStorage.getItem(key) || '[]')
          } catch {
            return []
          }
        })
      return allJourneys.find((j: UserJourney) => j.id === journeyId) || null
    } catch {
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_journeys')
      .select('*')
      .eq('id', journeyId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching user journey:', error)
    return null
  }
}

export const getUserJourneyByPublicId = async (
  publicId: string
): Promise<UserJourney | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const allJourneys = Object.keys(localStorage)
        .filter(key => key.startsWith('kyp_user_journeys_'))
        .flatMap(key => {
          try {
            return JSON.parse(localStorage.getItem(key) || '[]')
          } catch {
            return []
          }
        })
      const journey = allJourneys.find((j: UserJourney) => j.public_id === publicId)
      if (journey) {
        // Remove status if it exists (legacy data)
        const { status, ...journeyWithoutStatus } = journey as any
        return journeyWithoutStatus
      }
      return null
    } catch {
      return null
    }
  }

  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(publicId)) {
      console.error('Invalid public_id format:', publicId)
      return null
    }

    // Use maybeSingle() instead of single() to avoid errors when no row found
    // The public_id should be accessible to anonymous users via RLS policy
    const { data, error } = await supabase
      .from('user_journeys')
      .select('*')
      .eq('public_id', publicId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching user journey by public ID:', error)
      // Log more details about the error
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      
      // If the error is about a missing column, provide a helpful message
      if (error.message?.includes('column') || error.code === '42703') {
        console.error('⚠️ The public_id column may not exist yet. Please run the migration: 20250125000004_add_public_id_to_user_journeys.sql')
      }
      
      return null // Return null instead of throwing to allow graceful handling
    }
    
    if (!data) return null
    
    // Remove status if it exists (legacy data)
    const { status, ...journeyWithoutStatus } = data as any
    return journeyWithoutStatus
  } catch (error) {
    console.error('Error fetching user journey by public ID:', error)
    return null
  }
}

export const getUserJourneyByShortId = async (
  shortId: number, 
  onlyPublished: boolean = false
): Promise<UserJourney | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const allJourneys = Object.keys(localStorage)
        .filter(key => key.startsWith('kyp_user_journeys_'))
        .flatMap(key => {
          try {
            return JSON.parse(localStorage.getItem(key) || '[]')
          } catch {
            return []
          }
        })
      const journey = allJourneys.find((j: UserJourney) => j.short_id === shortId)
      // For local storage, check legacy status field if it exists
      if (journey && onlyPublished && (journey as any).status !== 'shared') {
        return null
      }
      if (journey) {
        // Remove status if it exists (legacy data)
        const { status, ...journeyWithoutStatus } = journey as any
        return journeyWithoutStatus
      }
      return null
    } catch {
      return null
    }
  }

  try {
    // Build the query
    let query = supabase
      .from('user_journeys')
      .select('*')
      .eq('short_id', shortId)
    
    const { data, error } = await query.single()

    if (error) {
      console.error('Error fetching user journey by short ID:', error)
      // If it's a 406 or 401 error, it might be an RLS issue
      if (error.code === 'PGRST301' || error.code === '42501' || error.message?.includes('permission denied')) {
        console.error('RLS policy may be blocking access. Make sure RLS policies are configured correctly.')
      }
      throw error
    }
    
    if (!data) return null
    
    // If onlyPublished is true, check folder status
    if (onlyPublished) {
      if (data.folder_id) {
        // Use a more efficient query - fetch only the specific folder we need
        const { data: folder, error: folderError } = await supabase
          .from('user_journey_folders')
          .select('status')
          .eq('id', data.folder_id)
          .single()
        
        if (folderError || !folder || folder.status !== 'shared') {
          return null
        }
      } else {
        // Journey without folder is personal
        return null
      }
    }
    
    // Remove status if it exists (legacy data)
    const { status, ...journeyWithoutStatus } = data as any
    return journeyWithoutStatus
  } catch (error) {
    console.error('Error fetching user journey by short ID:', error)
    return null
  }
}

export const createUserJourney = async (
  name: string,
  description: string = '',
  flowData: { nodes: Node[]; edges: Edge[] },
  projectId?: string | null,
  layout: 'vertical' | 'horizontal' = 'vertical',
  folderId?: string | null
): Promise<UserJourney | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const storageKey = projectId ? `kyp_user_journeys_${projectId}` : 'kyp_user_journeys_all'
      const stored = localStorage.getItem(storageKey)
      const journeys = stored ? JSON.parse(stored) : []
      // Generate a UUID-like string for local storage
      const publicId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const newJourney: UserJourney = {
        id: `local_${Date.now()}`,
        project_id: projectId || null,
        folder_id: folderId || null,
        name,
        description,
        layout,
        flow_data: flowData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        short_id: journeys.length + 1,
        public_id: publicId,
      }
      
      const updatedJourneys = [newJourney, ...journeys]
      localStorage.setItem(storageKey, JSON.stringify(updatedJourneys))
      return newJourney
    } catch (error) {
      console.error('Error in local storage fallback:', error)
      return null
    }
  }

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('user_journeys')
      .insert([
        {
          project_id: projectId || null,
          folder_id: folderId || null,
          name,
          description,
          layout,
          flow_data: flowData,
          created_by: user?.id || null,
          updated_by: user?.id || null
          // public_id will be auto-generated by the database (gen_random_uuid())
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }
    return data
  } catch (error) {
    console.error('Error creating user journey:', error)
    return null
  }
}

export const updateUserJourney = async (
  journeyId: string,
  updates: {
    name?: string
    description?: string
    layout?: 'vertical' | 'horizontal'
    flow_data?: { nodes: Node[]; edges: Edge[] }
    project_id?: string | null
    folder_id?: string | null
  }
): Promise<UserJourney | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const allKeys = Object.keys(localStorage).filter(key => key.startsWith('kyp_user_journeys_'))
      
      for (const key of allKeys) {
        const stored = localStorage.getItem(key)
        const journeys = stored ? JSON.parse(stored) : []
        const journeyIndex = journeys.findIndex((j: UserJourney) => j.id === journeyId)
        
        if (journeyIndex !== -1) {
          journeys[journeyIndex] = {
            ...journeys[journeyIndex],
            ...updates,
            updated_at: new Date().toISOString()
          }
          
          localStorage.setItem(key, JSON.stringify(journeys))
          return journeys[journeyIndex]
        }
      }
      return null
    } catch {
      return null
    }
  }

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('user_journeys')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null
      })
      .eq('id', journeyId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating user journey:', error)
    return null
  }
}

export const deleteUserJourney = async (journeyId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const allKeys = Object.keys(localStorage).filter(key => key.startsWith('kyp_user_journeys_'))
      
      for (const key of allKeys) {
        const stored = localStorage.getItem(key)
        const journeys = stored ? JSON.parse(stored) : []
        const filteredJourneys = journeys.filter((j: UserJourney) => j.id !== journeyId)
        
        if (filteredJourneys.length !== journeys.length) {
          localStorage.setItem(key, JSON.stringify(filteredJourneys))
          return true
        }
      }
      return false
    } catch {
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('user_journeys')
      .delete()
      .eq('id', journeyId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting user journey:', error)
    return false
  }
}

// Law Firm associations
export const getUserJourneyLawFirms = async (journeyId: string): Promise<string[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem(`kyp_user_journey_law_firms_${journeyId}`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('law_firm_user_journeys')
      .select('law_firm_id')
      .eq('user_journey_id', journeyId)

    if (error) throw error
    return (data || []).map(item => item.law_firm_id)
  } catch (error) {
    console.error('Error fetching user journey law firms:', error)
    return []
  }
}

export const setUserJourneyLawFirms = async (
  journeyId: string,
  lawFirmIds: string[]
): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      localStorage.setItem(`kyp_user_journey_law_firms_${journeyId}`, JSON.stringify(lawFirmIds))
      return true
    } catch {
      return false
    }
  }

  try {
    // First, delete existing associations
    const { error: deleteError } = await supabase
      .from('law_firm_user_journeys')
      .delete()
      .eq('user_journey_id', journeyId)

    if (deleteError) throw deleteError

    // Then, insert new associations
    if (lawFirmIds.length > 0) {
      const { error: insertError } = await supabase
        .from('law_firm_user_journeys')
        .insert(
          lawFirmIds.map(lawFirmId => ({
            user_journey_id: journeyId,
            law_firm_id: lawFirmId
          }))
        )

      if (insertError) throw insertError
    }

    return true
  } catch (error) {
    console.error('Error setting user journey law firms:', error)
    return false
  }
}

/**
 * Enable or disable public sharing for a user journey.
 * When enabled, the journey can be accessed via its public_id by anonymous users.
 * When disabled, the journey is no longer accessible via public link.
 */
export const setUserJourneyPublicSharing = async (
  journeyId: string,
  isPubliclyShared: boolean
): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    return false
  }

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    // Ensure the journey has a public_id before enabling sharing
    if (isPubliclyShared) {
      // Check if journey has a public_id
      const { data: journey } = await supabase
        .from('user_journeys')
        .select('public_id')
        .eq('id', journeyId)
        .single()

      if (!journey?.public_id) {
        // Generate a public_id if it doesn't exist
        const { error: updateError } = await supabase
          .from('user_journeys')
          .update({
            public_id: crypto.randomUUID(),
            is_publicly_shared: true,
            updated_at: new Date().toISOString(),
            updated_by: user?.id || null
          })
          .eq('id', journeyId)

        if (updateError) throw updateError
        return true
      }
    }

    // Update the is_publicly_shared flag
    const { error } = await supabase
      .from('user_journeys')
      .update({
        is_publicly_shared: isPubliclyShared,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null
      })
      .eq('id', journeyId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error setting user journey public sharing:', error)
    return false
  }
}

