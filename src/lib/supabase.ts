import { createClient } from '@supabase/supabase-js'



// Custom error class for Supabase authentication errors
export class SupabaseAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SupabaseAuthError'
  }
}

// Check if Supabase environment variables are configured
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your-project-url' && 
  supabaseAnonKey !== 'your-anon-key' &&
  supabaseUrl.includes('supabase.co')
)

// Force sign out function for handling authentication errors
export const forceSignOut = async () => {
  // Aggressively clear all Supabase session tokens from localStorage
  // This prevents any further attempts to use invalid sessions
  try {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    // Also clear any other auth-related storage
    localStorage.removeItem('supabase.auth.token')
    sessionStorage.clear()
  } catch (error) {
    console.error('Error clearing localStorage during force sign out:', error)
    // Don't throw - just log the error and continue
  }
}

// Custom fetch function that handles session errors
const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  const response = await fetch(url, options)
  
  // Check for authentication errors
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    try {
      const responseText = await response.clone().text()
      if (responseText.includes('session_not_found') || 
          responseText.includes('invalid_jwt') || 
          responseText.includes('JWT expired') ||
          responseText.includes('refresh_token_not_found') ||
          responseText.includes('Invalid Refresh Token')) {
        await forceSignOut()
        throw new SupabaseAuthError('Authentication session expired. Please sign in again.')
      }
    } catch (error) {
      // If we can't parse the response or it's already a SupabaseAuthError, re-throw
      if (error instanceof SupabaseAuthError) {
        throw error
      }
      // For other parsing errors, still sign out on 400/401/403
      await forceSignOut()
      throw new SupabaseAuthError('Authentication session expired. Please sign in again.')
    }
  }
  
  return response
}

// Create Supabase client only if properly configured
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: customFetch
      }
    })
  : null


// Database types
export interface Workspace {
  id: string
  name: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  workspace_id: string
  name: string
  overview?: string
  short_id: number
  created_at: string
  updated_at: string
}

export interface Stakeholder {
  id: string
  workspace_id: string
  name: string
  user_role_id?: string
  law_firm_id?: string
  user_permission_id?: string
  notes?: string
  visitor_id?: string
  department?: string
  pendo_role?: string
  short_id: number
  created_at: string
  updated_at: string
}

export interface ResearchNote {
  id: string
  project_id: string
  name: string
  summary?: string
  native_notes?: string
  note_date?: string
  decision_text?: string[]
  short_id: number
  created_at: string
  updated_at: string
}

export interface WorkspaceUser {
  id: string
  workspace_id: string
  user_id?: string | null
  user_email: string
  role: 'owner' | 'admin' | 'member'
  invited_by?: string | null
  status: 'pending' | 'active'
  full_name?: string | null
  team?: 'Design' | 'Product' | 'Engineering' | 'Other' | null
  created_at: string
  updated_at: string
}

export interface UserRole {
  id: string
  workspace_id: string
  name: string
  colour: string
  icon?: string
  internal?: boolean
  created_at: string
  updated_at: string
}

export interface LawFirm {
  id: string
  workspace_id: string
  name: string
  structure: 'centralised' | 'decentralised'
  status: 'active' | 'inactive'
  top_4?: boolean
  quick_facts?: string
  key_quotes?: string
  insights?: string
  opportunities?: string
  short_id?: number
  created_at: string
  updated_at: string
}

export interface ProblemOverview {
  id: string
  project_id: string
  what_is_the_problem: string
  should_we_solve_it: string
  understanding_rating: number
  risk_level: number
  created_at: string
  updated_at: string
}

export interface ResearchNoteStakeholder {
  id: string
  research_note_id: string
  stakeholder_id: string
  created_at: string
}

export interface ProjectStakeholder {
  id: string
  project_id: string
  stakeholder_id: string
  created_at: string
  updated_at: string
}

export interface UserJourney {
  id: string
  project_id: string
  name: string
  short_id: number
  created_at: string
  updated_at: string
}

export interface UserJourneyNode {
  id: string
  user_journey_id: string
  type: 'task' | 'question'
  description: string
  parent_node_id?: string
  parent_answer?: string
  pain_point?: string
  created_at: string
  updated_at: string
}

export interface UserJourneyStakeholder {
  id: string
  user_journey_id: string
  stakeholder_id: string
  created_at: string
}

export interface UserJourneyNodeAnswer {
  id: string
  node_id: string
  answer_text: string
  created_at: string
}

export interface NoteLink {
  id: string
  research_note_id: string
  name: string
  url: string
  created_at: string
}

export interface UserStory {
  id: string
  project_id: string
  name: string
  description?: string
  reason?: string
  estimated_complexity: number
  priority_rating?: 'must' | 'should' | 'could' | 'would'
  user_permission_id?: string
  assigned_to_user_id?: string
  short_id: number
  status?: 'Not planned' | 'Not started' | 'Design in progress' | 'Design complete' | 'Build in progress' | 'Released' | null
  weighting?: number
  decision_text?: string[] | null
  decision_text2?: string[] | null
  created_at: string
  updated_at: string
}

export interface UserStoryRole {
  id: string
  user_story_id: string
  user_role_id: string
  created_at: string
}

export interface Design {
  id: string
  project_id: string
  name: string
  snapshot_image_url?: string
  description?: string
  link_url?: string
  short_id?: number
  created_at: string
  updated_at: string
  decision_text?: string[]
}

export interface DesignUserStory {
  id: string
  design_id: string
  user_story_id: string
  created_at: string
}

export interface DesignResearchNote {
  id: string
  design_id: string
  research_note_id: string
  created_at: string
}

export interface UserPermission {
  id: string
  workspace_id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string
  name: string
  description?: string | null
  status: 'not_complete' | 'complete' | 'no_longer_required'
  assigned_to_user_id?: string | null
  research_note_id?: string | null
  user_story_id?: string | null
  created_at: string
  updated_at: string
}

export interface Theme {
  id: string
  workspace_id: string
  name: string
  description?: string
  color?: string
  short_id?: number
  created_at: string
  updated_at: string
}



export interface ThemeUserStory {
  id: string
  theme_id: string
  user_story_id: string
  created_at: string
}

export interface ThemeUserJourney {
  id: string
  theme_id: string
  user_journey_id: string
  created_at: string
}

export interface ThemeResearchNote {
  id: string
  theme_id: string
  research_note_id: string
  created_at: string
}

export interface NoteTemplate {
  id: string
  workspace_id: string
  name: string
  body?: string
  created_at: string
  updated_at: string
}

export interface ProjectProgressStatus {
  id: string
  project_id: string
  question_key: string
  is_completed: boolean
  created_at: string
  updated_at: string
}

export interface ProjectProgressComment {
  id: string
  project_id: string
  question_key: string
  user_id: string
  comment_text: string
  created_at: string
  updated_at: string
}

export interface DesignComment {
  id: string
  design_id: string
  user_id: string
  comment_text: string
  created_at: string
  updated_at: string
}

export interface UserStoryComment {
  id: string
  user_story_id: string
  user_id: string
  comment_text: string
  created_at: string
  updated_at: string
}

export interface UserProjectPreference {
  id: string
  user_id: string
  project_id: string
  order_index: number
  created_at: string
  updated_at: string
}

export interface Example {
  id: string
  project_id: string
  short_id: number
  actor: string
  goal: string
  entry_point: string
  actions: string
  error: string
  outcome: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface ExampleUserRole {
  id: string
  example_id: string
  user_role_id: string
  created_at: string
}

export interface ExampleComment {
  id: string
  example_id: string
  user_id: string
  comment_text: string
  is_decision: boolean
  created_at: string
  updated_at: string
}