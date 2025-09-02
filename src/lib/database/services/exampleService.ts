import { supabase } from '../../supabase'
import type { Example, ExampleUserRole } from '../../supabase'

// Get all examples for a project
export const getExamples = async (projectId: string): Promise<Example[]> => {
  if (!supabase) throw new Error('Supabase client not configured')

  const { data, error } = await supabase
    .from('examples')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching examples:', error)
    throw new Error('Failed to fetch examples')
  }

  return data || []
}

// Get a single example by ID
export const getExample = async (id: string): Promise<Example | null> => {
  if (!supabase) throw new Error('Supabase client not configured')

  const { data, error } = await supabase
    .from('examples')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching example:', error)
    throw new Error('Failed to fetch example')
  }

  return data
}

// Create a new example
export const createExample = async (example: Omit<Example, 'id' | 'short_id' | 'created_at' | 'updated_at'>): Promise<Example> => {
  if (!supabase) throw new Error('Supabase client not configured')

  const { data, error } = await supabase
    .from('examples')
    .insert(example)
    .select()
    .single()

  if (error) {
    console.error('Error creating example:', error)
    throw new Error(`Failed to create example: ${error.message || JSON.stringify(error)}`)
  }

  return data
}

// Update an existing example
export const updateExample = async (id: string, updates: Partial<Omit<Example, 'id' | 'short_id' | 'created_at' | 'updated_at'>>): Promise<Example> => {
  if (!supabase) throw new Error('Supabase client not configured')

  const { data, error } = await supabase
    .from('examples')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating example:', error)
    throw new Error('Failed to update example')
  }

  return data
}

// Delete an example
export const deleteExample = async (id: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not configured')

  const { error } = await supabase
    .from('examples')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting example:', error)
    throw new Error('Failed to delete example')
  }
}

// Get user roles for an example
export const getExampleUserRoles = async (exampleId: string): Promise<ExampleUserRole[]> => {
  if (!supabase) throw new Error('Supabase client not configured')

  const { data, error } = await supabase
    .from('example_user_roles')
    .select(`
      *,
      user_roles(*)
    `)
    .eq('example_id', exampleId)

  if (error) {
    console.error('Error fetching example user roles:', error)
    throw new Error('Failed to fetch example user roles')
  }

  return data || []
}

// Add user role to example
export const addUserRoleToExample = async (exampleId: string, userRoleId: string): Promise<ExampleUserRole> => {
  if (!supabase) throw new Error('Supabase client not configured')

  const { data, error } = await supabase
    .from('example_user_roles')
    .insert({
      example_id: exampleId,
      user_role_id: userRoleId
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding user role to example:', error)
    throw new Error('Failed to add user role to example')
  }

  return data
}

// Remove user role from example
export const removeUserRoleFromExample = async (exampleId: string, userRoleId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not configured')

  const { error } = await supabase
    .from('example_user_roles')
    .delete()
    .eq('example_id', exampleId)
    .eq('user_role_id', userRoleId)

  if (error) {
    console.error('Error removing user role from example:', error)
    throw new Error('Failed to remove user role from example')
  }
}

// Get examples by actor (for filtering)
export const getExamplesByActor = async (projectId: string, actor: string): Promise<Example[]> => {
  if (!supabase) throw new Error('Supabase client not configured')

  const { data, error } = await supabase
    .from('examples')
    .select('*')
    .eq('project_id', projectId)
    .ilike('actor', `%${actor}%`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching examples by actor:', error)
    throw new Error('Failed to fetch examples by actor')
  }

  return data || []
}

// Get examples count for a project
export const getExamplesCount = async (projectId: string): Promise<number> => {
  if (!supabase) throw new Error('Supabase client not configured')

  const { count, error } = await supabase
    .from('examples')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)

  if (error) {
    console.error('Error counting examples:', error)
    throw new Error('Failed to count examples')
  }

  return count || 0
}
