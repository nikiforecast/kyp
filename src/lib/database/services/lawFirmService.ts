import { supabase, isSupabaseConfigured } from '../../supabase'
import { getActiveWorkspaceId } from '../../activeWorkspace'
import type { LawFirm } from '../../supabase'

export const getLawFirms = async (options?: {
  workspaceId?: string;
  limit?: number;
  offset?: number;
  status?: 'active' | 'inactive';
}): Promise<LawFirm[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_law_firms')
      const lawFirms = stored ? JSON.parse(stored) : []
      // Ensure all law firms have short_id for local storage
      return lawFirms.map((firm: LawFirm, index: number) => ({
        ...firm,
        short_id: firm.short_id || (index + 1)
      }))
    } catch {
      return []
    }
  }

  try {
    // Select only necessary columns for better performance
    let query = supabase
      .from('law_firms')
      .select(`
        id,
        workspace_id,
        name,
        structure,
        status,
        top_4,
        short_id,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    // Apply filters if provided
    if (options?.workspaceId) {
      query = query.eq('workspace_id', options.workspaceId)
    }
    
    if (options?.status) {
      query = query.eq('status', options.status)
    }

    // Apply pagination if provided
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    
    if (options?.offset) {
      query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching law firms:', error)
    return []
  }
}

// High-performance cursor-based pagination for large datasets
export const getLawFirmsPaginated = async (options?: {
  workspaceId?: string;
  limit?: number;
  cursorId?: string;
  status?: 'active' | 'inactive';
}): Promise<{ data: LawFirm[]; hasMore: boolean; nextCursor?: string }> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    const lawFirms = await getLawFirms()
    return {
      data: lawFirms.slice(0, options?.limit || 50),
      hasMore: lawFirms.length > (options?.limit || 50),
      nextCursor: undefined
    }
  }

  try {
    const limit = options?.limit || 50
    
    // Select only necessary columns for better performance
    let query = supabase
      .from('law_firms')
      .select(`
        id,
        workspace_id,
        name,
        structure,
        status,
        top_4,
        short_id,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .limit(limit + 1) // Fetch one extra to check if there are more

    // Apply filters if provided
    if (options?.workspaceId) {
      query = query.eq('workspace_id', options.workspaceId)
    }
    
    if (options?.status) {
      query = query.eq('status', options.status)
    }

    // Apply cursor-based pagination (more efficient than offset)
    if (options?.cursorId) {
      const { data: cursorFirm } = await supabase
        .from('law_firms')
        .select('created_at')
        .eq('id', options.cursorId)
        .single()
      
      if (cursorFirm) {
        query = query.lt('created_at', cursorFirm.created_at)
      }
    }

    const { data, error } = await query

    if (error) throw error

    const firms = data || []
    const hasMore = firms.length > limit
    const actualData = hasMore ? firms.slice(0, limit) : firms
    const nextCursor = hasMore ? actualData[actualData.length - 1]?.id : undefined

    return {
      data: actualData,
      hasMore,
      nextCursor
    }
  } catch (error) {
    console.error('Error fetching law firms with pagination:', error)
    return {
      data: [],
      hasMore: false,
      nextCursor: undefined
    }
  }
}

export const getLawFirmByShortId = async (shortId: number): Promise<LawFirm | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_law_firms')
      const lawFirms = stored ? JSON.parse(stored) : []
      return lawFirms.find((firm: LawFirm) => firm.short_id === shortId) || null
    } catch {
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('law_firms')
      .select('*')
      .eq('short_id', shortId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching law firm by short ID:', error)
    return null
  }
}

export const createLawFirm = async (name: string, structure: 'centralised' | 'decentralised', status: 'active' | 'inactive'): Promise<LawFirm | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const lawFirms = JSON.parse(localStorage.getItem('kyp_law_firms') || '[]')
      const nextShortId = Math.max(0, ...lawFirms.map((f: LawFirm) => f.short_id || 0)) + 1
      const newLawFirm: LawFirm = {
        id: `firm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        workspace_id: 'default-workspace',
        name,
        structure,
        status,
        top_4: false,
        quick_facts: '',
        key_quotes: '',
        insights: '',
        opportunities: '',
        short_id: nextShortId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      lawFirms.unshift(newLawFirm)
      localStorage.setItem('kyp_law_firms', JSON.stringify(lawFirms))
      return newLawFirm
    } catch (error) {
      console.error('Error creating law firm locally:', error)
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

    if (!workspaceId) {
      console.error('No workspace found')
      return null
    }

    const { data, error } = await supabase
      .from('law_firms')
      .insert([{
        workspace_id: workspaceId,
        name,
        structure,
        status,
        top_4: false
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating law firm:', error)
    return null
  }
}

export const updateLawFirm = async (id: string, updates: Partial<Omit<LawFirm, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>>): Promise<LawFirm | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const lawFirms = JSON.parse(localStorage.getItem('kyp_law_firms') || '[]')
      const updatedLawFirms = lawFirms.map((firm: LawFirm) => 
        firm.id === id 
          ? { ...firm, ...updates, updated_at: new Date().toISOString() }
          : firm
      )
      localStorage.setItem('kyp_law_firms', JSON.stringify(updatedLawFirms))
      
      const updatedFirm = updatedLawFirms.find((f: LawFirm) => f.id === id)
      return updatedFirm || null
    } catch (error) {
      console.error('Error updating law firm locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('law_firms')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating law firm:', error)
    return null
  }
}

export const deleteLawFirm = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const lawFirms = JSON.parse(localStorage.getItem('kyp_law_firms') || '[]')
      const filteredLawFirms = lawFirms.filter((firm: LawFirm) => firm.id !== id)
      localStorage.setItem('kyp_law_firms', JSON.stringify(filteredLawFirms))
      return true
    } catch (error) {
      console.error('Error deleting law firm locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('law_firms')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting law firm:', error)
    return false
  }
}

export const importLawFirmsFromCSV = async (csvData: string): Promise<{ success: number, errors: string[] }> => {
  const results = { success: 0, errors: [] as string[] }
  
  try {
    const lines = csvData.trim().split('\n')
    const headers = lines[0]?.split(',').map(h => h.trim())
    
    if (!headers || headers.length < 2) {
      results.errors.push('CSV must have at least 2 columns: Name, Structure')
      return results
    }
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim())
        
        if (values.length < 2) {
          results.errors.push(`Row ${i + 1}: Insufficient columns`)
          continue
        }
        
        const [name, structureStr] = values
        
        if (!name) {
          results.errors.push(`Row ${i + 1}: Name is required`)
          continue
        }
        
        const structure = structureStr?.toLowerCase() === 'centralised' ? 'centralised' : 'decentralised'
        
        const lawFirm = await createLawFirm(name, structure, 'active')
        
        if (lawFirm) {
          results.success++
        } else {
          results.errors.push(`Row ${i + 1}: Failed to create account`)
        }
        
      } catch (error) {
        results.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
  } catch (error) {
    results.errors.push(`CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  
  return results
}

// Efficient count function that avoids expensive PostgREST operations
export const getLawFirmsCount = async (options?: {
  workspaceId?: string;
  status?: 'active' | 'inactive';
}): Promise<number> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_law_firms')
      const firms = stored ? JSON.parse(stored) : []
      return firms.length
    } catch {
      return 0
    }
  }

  try {
    // Use a more efficient count query
    let query = supabase
      .from('law_firms')
      .select('id', { count: 'exact', head: true })

    // Apply filters if provided
    if (options?.workspaceId) {
      query = query.eq('workspace_id', options.workspaceId)
    }
    
    if (options?.status) {
      query = query.eq('status', options.status)
    }

    const { count, error } = await query

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Error counting law firms:', error)
    return 0
  }
}

export const deleteAllLawFirms = async (): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      localStorage.setItem('kyp_law_firms', JSON.stringify([]))
      return true
    } catch (error) {
      console.error('Error deleting all law firms locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('law_firms')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting all law firms:', error)
    return false
  }
}