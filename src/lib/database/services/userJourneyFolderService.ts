import { supabase } from '../../supabase'

/**
 * When `explicitWorkspaceId` is set (e.g. from Dashboard), skip querying
 * workspace_users — avoids broken RLS policies that reference auth.users.
 */
async function getWorkspaceIdForCurrentUser(explicitWorkspaceId?: string): Promise<string> {
  if (explicitWorkspaceId) {
    return explicitWorkspaceId
  }
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }
  const { data: workspaceUser, error: workspaceError } = await supabase
    .from('workspace_users')
    .select('workspace_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (workspaceError) {
    throw new Error(`Failed to get workspace: ${workspaceError.message}`)
  }
  if (!workspaceUser?.workspace_id) {
    throw new Error('No workspace membership found for this user')
  }
  return workspaceUser.workspace_id
}

export interface UserJourneyFolder {
  id: string
  workspace_id: string
  name: string
  color: string
  status: 'personal' | 'shared'
  parent_folder_id: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

/**
 * Get all user journey folders for the current user's workspace
 * @param explicitWorkspaceId - If provided, skips workspace_users lookup (preferred when UI already knows the workspace).
 */
export async function getUserJourneyFolders(explicitWorkspaceId?: string): Promise<UserJourneyFolder[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const workspaceId = await getWorkspaceIdForCurrentUser(explicitWorkspaceId)

  // Get folders for the workspace
  const { data, error } = await supabase
    .from('user_journey_folders')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('name')

  if (error) {
    throw new Error(`Failed to fetch folders: ${error.message}`)
  }

  return data || []
}

/**
 * Get a single user journey folder by ID
 */
export async function getUserJourneyFolderById(folderId: string): Promise<UserJourneyFolder | null> {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { data, error } = await supabase
    .from('user_journey_folders')
    .select('*')
    .eq('id', folderId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    throw new Error(`Failed to fetch folder: ${error.message}`)
  }

  return data
}

/**
 * Create a new user journey folder
 */
export async function createUserJourneyFolder(
  name: string,
  color: string = '#3B82F6',
  parentFolderId: string | null = null,
  explicitWorkspaceId?: string
): Promise<UserJourneyFolder> {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const workspaceId = await getWorkspaceIdForCurrentUser(explicitWorkspaceId)

  // Create the folder
  const { data, error } = await supabase
    .from('user_journey_folders')
    .insert({
      workspace_id: workspaceId,
      name,
      color,
      status: 'personal', // Default to personal
      parent_folder_id: parentFolderId,
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create folder: ${error.message}`)
  }

  return data
}

/**
 * Update a user journey folder
 */
export async function updateUserJourneyFolder(
  id: string,
  updates: { name?: string; color?: string; status?: 'personal' | 'shared' }
): Promise<UserJourneyFolder> {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { data, error } = await supabase
    .from('user_journey_folders')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update folder: ${error.message}`)
  }

  // If status is being changed to 'shared', update all nested items
  if (updates.status === 'shared') {
    await updateNestedItemsStatus(id, 'shared')
  }

  return data
}

/**
 * Update status of all user journeys and folders inside a folder
 */
async function updateNestedItemsStatus(
  folderId: string,
  status: 'personal' | 'shared'
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  // Note: User journeys no longer have a status column - they inherit status from their folder
  // So we don't need to update journeys here, just folders

  // Get all subfolders
  const { data: subfolders, error: foldersError } = await supabase
    .from('user_journey_folders')
    .select('id')
    .eq('parent_folder_id', folderId)

  if (foldersError) {
    console.error('Failed to get subfolders:', foldersError)
    return
  }

  // Recursively update all subfolders and their contents
  for (const subfolder of subfolders || []) {
    // Update subfolder status
    const { error: updateError } = await supabase
      .from('user_journey_folders')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', subfolder.id)

    if (updateError) {
      console.error(`Failed to update subfolder ${subfolder.id}:`, updateError)
      continue
    }

    // Recursively update nested items in subfolder
    await updateNestedItemsStatus(subfolder.id, status)
  }
}

/**
 * Delete a user journey folder
 */
export async function deleteUserJourneyFolder(id: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { error } = await supabase
    .from('user_journey_folders')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete folder: ${error.message}`)
  }
}

/**
 * Assign multiple user journeys to a folder
 */
export async function assignUserJourneysToFolder(
  journeyIds: string[],
  folderId: string | null
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { error } = await supabase
    .from('user_journeys')
    .update({ 
      folder_id: folderId,
      updated_at: new Date().toISOString()
    })
    .in('id', journeyIds)

  if (error) {
    throw new Error(`Failed to assign journeys to folder: ${error.message}`)
  }
}

/**
 * Move a folder to a different parent folder
 */
export async function moveFolderToParent(
  folderId: string,
  parentFolderId: string | null
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { error } = await supabase
    .from('user_journey_folders')
    .update({ 
      parent_folder_id: parentFolderId,
      updated_at: new Date().toISOString()
    })
    .eq('id', folderId)

  if (error) {
    throw new Error(`Failed to move folder: ${error.message}`)
  }
}

/**
 * Count user journeys in a folder (including subfolders)
 */
export async function countJourneysInFolder(folderId: string): Promise<number> {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { count, error } = await supabase
    .from('user_journeys')
    .select('*', { count: 'exact', head: true })
    .eq('folder_id', folderId)

  if (error) {
    throw new Error(`Failed to count journeys: ${error.message}`)
  }

  return count || 0
}

