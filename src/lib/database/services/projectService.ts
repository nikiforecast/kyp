import { supabase, isSupabaseConfigured } from '../../supabase'
import type { Project } from '../../supabase'

// Simple in-memory cache for stakeholder counts
const stakeholderCountCache = new Map<string, { count: number; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Batch load stakeholder counts for multiple projects
export const getProjectStakeholdersBatch = async (projectIds: string[]): Promise<Record<string, string[]>> => {
  if (!isSupabaseConfigured || !supabase) {
    return {}
  }

  try {
    const { data, error } = await supabase
      .from('project_stakeholders')
      .select('project_id, stakeholder_id')
      .in('project_id', projectIds)

    if (error) throw error

    // Group by project_id
    const grouped: Record<string, string[]> = {}
    projectIds.forEach(id => grouped[id] = [])
    
    data?.forEach(item => {
      if (grouped[item.project_id]) {
        grouped[item.project_id].push(item.stakeholder_id)
      }
    })

    return grouped
  } catch (error) {
    console.error('Error fetching project stakeholders batch:', error)
    return {}
  }
}

export const getProjects = async (): Promise<Project[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_projects')
      const projects = stored ? JSON.parse(stored) : []
      return projects
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching projects:', error)
    
    // Fallback to local storage if Supabase fails
    try {
      const stored = localStorage.getItem('kyp_projects')
      const projects = stored ? JSON.parse(stored) : []
      return projects
    } catch (fallbackError) {
      console.error('Local storage fallback also failed:', fallbackError)
      return []
    }
  }
}



export const getProjectByShortId = async (shortId: number): Promise<Project | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_projects')
      const projects = stored ? JSON.parse(stored) : []
      return projects.find((project: Project) => project.short_id === shortId) || null
    } catch {
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('short_id', shortId)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching project by short ID:', error)
    
    // Fallback to local storage if Supabase fails
    try {
      const stored = localStorage.getItem('kyp_projects')
      const projects = stored ? JSON.parse(stored) : []
      return projects.find((project: Project) => project.short_id === shortId) || null
    } catch (fallbackError) {
      console.error('Local storage fallback also failed:', fallbackError)
      return []
    }
  }
}

export const getProjectById = async (projectId: string): Promise<Project | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_projects')
      const projects = stored ? JSON.parse(stored) : []
      return projects.find((project: Project) => project.id === projectId) || null
    } catch {
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching project by ID:', error)
    
    // Fallback to local storage if Supabase fails
    try {
      const stored = localStorage.getItem('kyp_projects')
      const projects = stored ? JSON.parse(stored) : []
      return projects.find((project: Project) => project.id === projectId) || null
    } catch (fallbackError) {
      console.error('Local storage fallback also failed:', fallbackError)
      return []
    }
  }
}

export const createProject = async (name: string, overview?: string): Promise<Project | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_projects')
      const projects = stored ? JSON.parse(stored) : []
      const newProject: Project = {
        id: `local_${Date.now()}`,
        name,
        overview: overview || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        short_id: projects.length + 1,
        workspace_id: 'local_workspace'
      }
      
      const updatedProjects = [newProject, ...projects]
      localStorage.setItem('kyp_projects', JSON.stringify(updatedProjects))
      return newProject
    } catch {
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          name,
          overview: overview || null
        }
      ])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating project:', error)
    return null
  }
}

export const updateProject = async (projectId: string, updates: { name?: string; overview?: string }): Promise<Project | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_projects')
      const projects = stored ? JSON.parse(stored) : []
      const projectIndex = projects.findIndex((p: Project) => p.id === projectId)
      
      if (projectIndex === -1) return null
      
      projects[projectIndex] = {
        ...projects[projectIndex],
        ...updates,
        updated_at: new Date().toISOString()
      }
      
      localStorage.setItem('kyp_projects', JSON.stringify(projects))
      return projects[projectIndex]
    } catch {
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating project:', error)
    return null
  }
}

export const deleteProject = async (projectId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_projects')
      const projects = stored ? JSON.parse(stored) : []
      const filteredProjects = projects.filter((p: Project) => p.id !== projectId)
      localStorage.setItem('kyp_projects', JSON.stringify(filteredProjects))
      return true
    } catch {
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting project:', error)
    return false
  }
}

export const getProjectStakeholders = async (projectId: string): Promise<string[]> => {
  // Check cache first
  const cached = stakeholderCountCache.get(projectId)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return Array(cached.count).fill('').map((_, i) => `cached_${i}`) // Return dummy IDs for count
  }

  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('project_stakeholders')
      .select('stakeholder_id')
      .eq('project_id', projectId)

    if (error) throw error

    const stakeholderIds = data?.map(item => item.stakeholder_id) || []
    
    // Cache the count
    stakeholderCountCache.set(projectId, { 
      count: stakeholderIds.length, 
      timestamp: Date.now() 
    })

    return stakeholderIds
  } catch (error) {
    console.error('Error fetching project stakeholders:', error)
    return []
  }
}

// Clear cache when needed (e.g., after updates)
export const clearStakeholderCache = (projectId?: string) => {
  if (projectId) {
    stakeholderCountCache.delete(projectId)
  } else {
    stakeholderCountCache.clear()
  }
}

export const assignStakeholderToProject = async (projectId: string, stakeholderId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_project_stakeholders')
      const projectStakeholders = stored ? JSON.parse(stored) : []
      
      // Check if already assigned
      const exists = projectStakeholders.some((ps: any) => 
        ps.project_id === projectId && ps.stakeholder_id === stakeholderId
      )
      
      if (!exists) {
        projectStakeholders.push({
          id: `ps-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          project_id: projectId,
          stakeholder_id: stakeholderId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        localStorage.setItem('kyp_project_stakeholders', JSON.stringify(projectStakeholders))
      }
      
      return true
    } catch (error) {
      console.error('Error assigning stakeholder locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('project_stakeholders')
      .insert([{
        project_id: projectId,
        stakeholder_id: stakeholderId
      }])

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error assigning stakeholder to project:', error)
    return false
  }
}

export const removeStakeholderFromProject = async (projectId: string, stakeholderId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_project_stakeholders')
      const projectStakeholders = stored ? JSON.parse(stored) : []
      const filtered = projectStakeholders.filter((ps: any) => 
        !(ps.project_id === projectId && ps.stakeholder_id === stakeholderId)
      )
      localStorage.setItem('kyp_project_stakeholders', JSON.stringify(filtered))
      return true
    } catch (error) {
      console.error('Error removing stakeholder locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('project_stakeholders')
      .delete()
      .eq('project_id', projectId)
      .eq('stakeholder_id', stakeholderId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error removing stakeholder from project:', error)
    return false
  }
}

export const getProjectsForStakeholder = async (stakeholderId: string): Promise<Project[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const projectStakeholders = JSON.parse(localStorage.getItem('kyp_project_stakeholders') || '[]')
      const projects = JSON.parse(localStorage.getItem('kyp_projects') || '[]')
      
      const projectIds = projectStakeholders
        .filter((ps: any) => ps.stakeholder_id === stakeholderId)
        .map((ps: any) => ps.project_id)
      
      return projects.filter((project: Project) => projectIds.includes(project.id))
    } catch (error) {
      console.error('Error getting projects for stakeholder locally:', error)
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('project_stakeholders')
      .select(`
        projects (
          id,
          workspace_id,
          name,
          overview,
          created_at,
          updated_at
        )
      `)
      .eq('stakeholder_id', stakeholderId)

    if (error) throw error
    
    return data?.map(item => (item as any).projects).filter(Boolean) || []
  } catch (error) {
    console.error('Error getting projects for stakeholder:', error)
    return []
  }
}