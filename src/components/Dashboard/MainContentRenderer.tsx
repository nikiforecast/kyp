import React from 'react'
import { UserJourneysManager } from '../UserJourneysManager'
import { UserJourneyCreator } from '../UserJourneyCreator'
import { LawFirmManager } from '../LawFirmManager'
import { StakeholderManager } from '../StakeholderManager'
import { LawFirmDetail } from '../LawFirmDetail'
import { ProjectDashboard } from '../ProjectDashboard'
import { StakeholderDetail } from '../StakeholderDetail'
import { SettingsManager } from '../SettingsManager'
import { DesignSystem } from '../DesignSystem'
import type { User } from '@supabase/supabase-js'
import type {
  Project,
  Stakeholder,
  Workspace,
  WorkspaceUser,
  UserRole,
  Platform,
  LawFirm,
} from '../../lib/supabase'

interface MainContentRendererProps {
  currentView: string
  loading: boolean
  loadingBackgroundData: boolean
  workspaceId: string
  workspaces: Workspace[]
  isPlatformAdmin: boolean
  stakeholders: Stakeholder[]
  workspaceUsers: WorkspaceUser[]
  userRoles: UserRole[]
  platforms: Platform[]
  lawFirms: LawFirm[]
  selectedProject: Project | null
  selectedStakeholder: Stakeholder | null
  stakeholderDetailOrigin: 'project' | 'manager' | 'law-firm'
  originLawFirm: LawFirm | null
  selectedLawFirm: LawFirm | null
  user: User | null
  onBackToWorkspace: () => void
  onCreateStakeholder: (name: string, userRoleId?: string, lawFirmId?: string, visitorId?: string, department?: string, pendoRole?: string) => Promise<void>
  onUpdateStakeholder: (stakeholderId: string, updates: { name?: string; user_role_id?: string; law_firm_id?: string; notes?: string; visitor_id?: string; department?: string; pendo_role?: string }) => Promise<void>
  onDeleteStakeholder: (stakeholderId: string) => Promise<void>
  onSelectStakeholder: (stakeholder: Stakeholder) => void
  onSelectStakeholderFromLawFirm: (stakeholder: Stakeholder, lawFirm: LawFirm) => void
  onStakeholderBack: () => void
  onCreateUser: (email: string, role: 'admin' | 'member', fullName?: string, team?: 'Design' | 'Product' | 'Engineering' | 'Other') => Promise<{ user: WorkspaceUser | null, error: string | null }>
  onUpdateWorkspaceUser: (userId: string, updates: { full_name?: string; team?: 'Design' | 'Product' | 'Engineering' | 'Other' | null }) => Promise<void>
  onUpdateWorkspaceUserRole: (userId: string, newRole: 'admin' | 'member') => Promise<void>
  onRemoveUser: (userId: string) => Promise<void>
  onCreateUserRole: (name: string, colour: string, icon?: string) => Promise<void>
  onUpdateUserRoleDefinition: (roleId: string, updates: { name?: string; colour?: string; icon?: string }) => Promise<boolean>
  onDeleteUserRole: (roleId: string) => Promise<void>
  onNavigateToStakeholdersWithFilter: (userRoleId: string) => void
  onCreatePlatform: (name: string, colour: string, logo?: string) => Promise<void>
  onUpdatePlatform: (platformId: string, updates: { name?: string; colour?: string; logo?: string }) => Promise<boolean>
  onDeletePlatform: (platformId: string) => Promise<void>
  onCreateLawFirm: (name: string, structure: 'centralised' | 'decentralised', status: 'active' | 'inactive') => Promise<LawFirm | null>
  onUpdateLawFirm: (id: string, updates: Partial<Omit<LawFirm, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>>) => Promise<LawFirm | null>
  onDeleteLawFirm: (id: string) => Promise<void>
  onImportLawFirmsCSV: (csvData: string) => Promise<{ success: number, errors: string[] }>
  onDeleteAllLawFirms: () => Promise<void>
  onImportStakeholdersCSV: (csvData: string) => Promise<{ success: number, errors: string[] }>
  onBackFromLawFirm: () => void
  onCreateWorkspace: (name: string) => Promise<{ workspace: Workspace | null; error: string | null }>
  onSelectWorkspace: (workspaceId: string) => void
  onSignOut: () => void
}

export function MainContentRenderer({
  currentView,
  loading,
  loadingBackgroundData,
  workspaceId,
  workspaces,
  isPlatformAdmin,
  stakeholders,
  workspaceUsers,
  userRoles,
  platforms,
  lawFirms,
  selectedProject,
  selectedStakeholder,
  stakeholderDetailOrigin,
  originLawFirm,
  selectedLawFirm,
  user,
  onBackToWorkspace,
  onCreateStakeholder,
  onUpdateStakeholder,
  onDeleteStakeholder,
  onSelectStakeholder,
  onSelectStakeholderFromLawFirm,
  onStakeholderBack,
  onCreateUser,
  onUpdateWorkspaceUser,
  onUpdateWorkspaceUserRole,
  onRemoveUser,
  onCreateUserRole,
  onUpdateUserRoleDefinition,
  onDeleteUserRole,
  onNavigateToStakeholdersWithFilter,
  onCreatePlatform,
  onUpdatePlatform,
  onDeletePlatform,
  onCreateLawFirm,
  onUpdateLawFirm,
  onDeleteLawFirm,
  onImportLawFirmsCSV,
  onDeleteAllLawFirms,
  onImportStakeholdersCSV,
  onBackFromLawFirm,
  onCreateWorkspace,
  onSelectWorkspace,
  onSignOut,
}: MainContentRendererProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading workspace...</span>
        </div>
      </div>
    )
  }

  if (currentView === 'project-dashboard' && selectedProject) {
    return (
      <ProjectDashboard
        project={selectedProject}
        workspaceUsers={workspaceUsers}
        onBack={onBackToWorkspace}
        onSignOut={onSignOut}
      />
    )
  }

  if (currentView === 'stakeholder-detail' && selectedStakeholder) {
    return (
      <StakeholderDetail
        stakeholder={selectedStakeholder}
        userRoles={userRoles}
        lawFirms={lawFirms}
        origin={stakeholderDetailOrigin}
        backButtonText={
          stakeholderDetailOrigin === 'manager'
            ? 'Back to Stakeholders'
            : stakeholderDetailOrigin === 'law-firm' && originLawFirm
              ? `Back to ${originLawFirm.name}`
              : 'Back to Project'
        }
        onBack={onStakeholderBack}
        onUpdate={(updates) => {
          onUpdateStakeholder(selectedStakeholder.id, updates)
        }}
      />
    )
  }

  if (currentView === 'law-firm-detail' && selectedLawFirm) {
    return (
      <LawFirmDetail
        lawFirm={selectedLawFirm}
        stakeholders={stakeholders}
        userRoles={userRoles}
        onBack={onBackFromLawFirm}
        onUpdate={(updates) => {
          onUpdateLawFirm(selectedLawFirm.id, updates)
        }}
        onSelectStakeholder={onSelectStakeholderFromLawFirm}
      />
    )
  }

  switch (currentView) {
    case 'user-journeys':
      return <UserJourneysManager workspaceId={workspaceId} />
    case 'user-journey-creator':
      return <UserJourneyCreator userRoles={userRoles} platforms={platforms} />
    case 'law-firms':
      return (
        <LawFirmManager
          lawFirms={lawFirms}
          stakeholders={stakeholders}
          userRoles={userRoles}
          loading={loadingBackgroundData}
          onCreateLawFirm={onCreateLawFirm}
          onUpdateLawFirm={onUpdateLawFirm}
          onDeleteLawFirm={onDeleteLawFirm}
          onImportCSV={onImportLawFirmsCSV}
          onDeleteAll={onDeleteAllLawFirms}
          onSelectStakeholder={onSelectStakeholderFromLawFirm}
        />
      )
    case 'settings':
      return (
        <SettingsManager
          workspaceId={workspaceId}
          workspaces={workspaces}
          isPlatformAdmin={isPlatformAdmin}
          workspaceUsers={workspaceUsers}
          userRoles={userRoles}
          platforms={platforms}
          stakeholders={stakeholders}
          onCreateWorkspace={onCreateWorkspace}
          onSelectWorkspace={onSelectWorkspace}
          onCreateUser={onCreateUser}
          onUpdateWorkspaceUser={onUpdateWorkspaceUser}
          onUpdateWorkspaceUserRole={onUpdateWorkspaceUserRole}
          onRemoveUser={onRemoveUser}
          onCreateUserRole={onCreateUserRole}
          onUpdateUserRoleDefinition={onUpdateUserRoleDefinition}
          onDeleteUserRole={onDeleteUserRole}
          onNavigateToStakeholdersWithFilter={onNavigateToStakeholdersWithFilter}
          onCreatePlatform={onCreatePlatform}
          onUpdatePlatform={onUpdatePlatform}
          onDeletePlatform={onDeletePlatform}
        />
      )
    case 'design-system':
      return <DesignSystem onSignOut={onSignOut} userRoles={userRoles} />
    case 'stakeholders':
      return (
        <StakeholderManager
          stakeholders={stakeholders}
          userRoles={userRoles}
          lawFirms={lawFirms}
          loading={loadingBackgroundData}
          onCreateStakeholder={onCreateStakeholder}
          onUpdateStakeholder={onUpdateStakeholder}
          onDeleteStakeholder={onDeleteStakeholder}
          onImportStakeholdersCSV={onImportStakeholdersCSV}
          onSelectStakeholder={onSelectStakeholder}
        />
      )
    default:
      return <UserJourneysManager workspaceId={workspaceId} />
  }
}
