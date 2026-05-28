import type { Workspace, WorkspaceUser } from './supabase'

const ACTIVE_WORKSPACE_KEY = 'kyp_active_workspace_id'

export function getActiveWorkspaceId(): string | null {
  return localStorage.getItem(ACTIVE_WORKSPACE_KEY)
}

export function setActiveWorkspaceId(workspaceId: string): void {
  localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId)
}

export function resolveActiveWorkspaceId(
  workspaces: Workspace[],
  workspaceUsers: WorkspaceUser[],
  userId?: string
): string {
  const stored = getActiveWorkspaceId()
  const accessibleIds = new Set(
    workspaceUsers
      .filter(wu => wu.status === 'active' && (wu.user_id === userId || !userId))
      .map(wu => wu.workspace_id)
  )

  if (stored && accessibleIds.has(stored)) {
    const storedWorkspace = workspaces.find(w => w.id === stored)
    const sharedWorkspace = workspaces.find(
      w => accessibleIds.has(w.id) && w.created_by !== userId
    )
    const storedIsPersonal = storedWorkspace?.created_by === userId

    // Prefer shared workspace over auto-created personal workspace
    if (sharedWorkspace && storedIsPersonal && sharedWorkspace.id !== stored) {
      setActiveWorkspaceId(sharedWorkspace.id)
      return sharedWorkspace.id
    }

    return stored
  }

  // Drop stale workspace selection (e.g. from another account on the same browser)
  if (stored && !accessibleIds.has(stored)) {
    localStorage.removeItem(ACTIVE_WORKSPACE_KEY)
  }

  // Prefer shared workspaces over personal ones (personal = created_by matches user)
  const sharedWorkspace = workspaces.find(
    w => accessibleIds.has(w.id) && w.created_by !== userId
  )
  if (sharedWorkspace) {
    setActiveWorkspaceId(sharedWorkspace.id)
    return sharedWorkspace.id
  }

  const firstAccessible = workspaces.find(w => accessibleIds.has(w.id))
  if (firstAccessible) {
    setActiveWorkspaceId(firstAccessible.id)
    return firstAccessible.id
  }

  return workspaces[0]?.id || workspaceUsers[0]?.workspace_id || ''
}
