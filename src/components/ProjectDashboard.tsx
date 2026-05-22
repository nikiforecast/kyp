import React from 'react'
import { ProjectDataFetcher } from './ProjectDashboard/ProjectDataFetcher'
import type { Project, WorkspaceUser } from '../lib/supabase'

interface ProjectDashboardProps {
  project: Project
  onBack: () => void
  workspaceUsers: WorkspaceUser[]
  onNavigateToWorkspace?: (view: string) => void
  onSignOut?: () => void
}

export function ProjectDashboard({
  project,
  onBack,
  workspaceUsers,
  onNavigateToWorkspace,
  onSignOut,
}: ProjectDashboardProps) {
  return (
    <ProjectDataFetcher
      project={project}
      workspaceUsers={workspaceUsers}
      onBack={onBack}
      onNavigateToWorkspace={onNavigateToWorkspace}
      onSignOut={onSignOut}
    />
  )
}
