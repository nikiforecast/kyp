import React from 'react'
import { UserJourneysManager } from '../UserJourneysManager'
import { UserJourneyCreator } from '../UserJourneyCreator'
import { LawFirmManager } from '../LawFirmManager'
import { UserRoleManager } from '../UserRoleManager'
import { UserPermissionManager } from '../UserPermissionManager'
import { StakeholderManager } from '../StakeholderManager'
import { LawFirmDetail } from '../LawFirmDetail'
import { TeamManager } from '../TeamManager'
import { ProjectDashboard } from '../ProjectDashboard'
import { StakeholderDetail } from '../StakeholderDetail'
import { NoteDetail } from '../NoteDetail'
import { UserStoryDetail } from '../UserStoryDetail'
import { NoteTemplateManager } from '../NoteTemplateManager'
import { NoteTemplateDetail } from '../NoteTemplateDetail'
import { AssetDetail } from '../AssetDetail'
import { SettingsManager } from '../SettingsManager'
import { DesignSystem } from '../DesignSystem'
import type { User } from '@supabase/supabase-js'
import type { 
  Project, 
  Stakeholder, 
  ResearchNote, 
  WorkspaceUser,
  UserRole,
  Platform,
  LawFirm,
  UserPermission,
  UserStory,
  NoteTemplate,
  Design,
  UserStoryComment
} from '../../lib/supabase'

interface MainContentRendererProps {
  currentView: string
  loading: boolean
  loadingBackgroundData: boolean
  workspaceId: string
  
  // Data states
  stakeholders: Stakeholder[]
  workspaceUsers: WorkspaceUser[]
  userRoles: UserRole[]
  platforms: Platform[]
  lawFirms: LawFirm[]
  userPermissions: UserPermission[]
  stakeholderNotesCountMap: Record<string, number>
  noteTemplates: NoteTemplate[]
  
  // Selected items
  selectedProject: Project | null
  selectedStakeholder: Stakeholder | null
  selectedNote: ResearchNote | null
  selectedUserStory: UserStory | null
  noteStakeholderIds: string[]
  userStoryRoleIds: string[]
  stakeholderDetailOrigin: 'project' | 'manager' | 'law-firm'
  originLawFirm: LawFirm | null
  selectedNoteTemplate: NoteTemplate | null
  selectedDesign: Design | null
  selectedDesignForProject: Design | null
  selectedLawFirm: LawFirm | null
  user: User | null
  
  onBackToWorkspace: () => void
  
  // Stakeholder handlers
  onCreateStakeholder: (name: string, userRoleId?: string, lawFirmId?: string, userPermissionId?: string, visitorId?: string, department?: string, pendoRole?: string) => Promise<void>
  onUpdateStakeholder: (stakeholderId: string, updates: { name?: string; user_role_id?: string; law_firm_id?: string; user_permission_id?: string; notes?: string; visitor_id?: string; department?: string; pendo_role?: string }) => Promise<void>
  onDeleteStakeholder: (stakeholderId: string) => Promise<void>
  onSelectStakeholder: (stakeholder: Stakeholder) => void
  onSelectStakeholderFromLawFirm: (stakeholder: Stakeholder, lawFirm: LawFirm) => void
  onStakeholderBack: () => void
  
  // Team management handlers
  onCreateUser: (email: string, role: 'admin' | 'member', fullName?: string, team?: 'Design' | 'Product' | 'Engineering' | 'Other') => Promise<{ user: WorkspaceUser | null, error: string | null }>
  onUpdateWorkspaceUser: (userId: string, updates: { full_name?: string; team?: 'Design' | 'Product' | 'Engineering' | 'Other' | null }) => Promise<void>
  onUpdateWorkspaceUserRole: (userId: string, newRole: 'admin' | 'member') => Promise<void>
  onRemoveUser: (userId: string) => Promise<void>
  
  // User role handlers
  onCreateUserRole: (name: string, colour: string, icon?: string) => Promise<void>
  onUpdateUserRoleDefinition: (roleId: string, updates: { name?: string; colour?: string; icon?: string }) => Promise<boolean>
  onDeleteUserRole: (roleId: string) => Promise<void>
  onNavigateToStakeholdersWithFilter: (userRoleId: string) => void
  
  // Platform handlers
  onCreatePlatform: (name: string, colour: string, logo?: string) => Promise<void>
  onUpdatePlatform: (platformId: string, updates: { name?: string; colour?: string; logo?: string }) => Promise<boolean>
  onDeletePlatform: (platformId: string) => Promise<void>
  
  // User permission handlers
  onCreateUserPermission: (name: string, description?: string) => Promise<void>
  onUpdateUserPermission: (permissionId: string, updates: { name?: string; description?: string }) => Promise<void>
  onDeleteUserPermission: (permissionId: string) => Promise<void>
  onNavigateToStakeholdersWithPermissionFilter: (userPermissionId: string) => void
  
  // Law firm handlers
  onCreateLawFirm: (name: string, structure: 'centralised' | 'decentralised', status: 'active' | 'inactive') => Promise<LawFirm | null>
  onUpdateLawFirm: (id: string, updates: Partial<Omit<LawFirm, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>>) => Promise<LawFirm | null>
  onDeleteLawFirm: (id: string) => Promise<void>
  onImportLawFirmsCSV: (csvData: string) => Promise<{ success: number, errors: string[] }>
  onDeleteAllLawFirms: () => Promise<void>
  onImportStakeholdersCSV: (csvData: string) => Promise<{ success: number, errors: string[] }>
  
  // Note template handlers
  onCreateNoteTemplate: (name: string, body?: string) => Promise<void>
  onUpdateNoteTemplate: (templateId: string, updates: { name?: string; body?: string }) => Promise<void>
  onDeleteNoteTemplate: (templateId: string) => Promise<void>
  onSelectNoteTemplate: (template: NoteTemplate) => void
  onBackFromDesign: () => void
  onBackFromLawFirm: () => void
  
  onUpdateUserStory: (userStoryId: string, updates: { name?: string; description?: string; estimated_complexity?: number; priority_rating?: 'must' | 'should' | 'could' | 'would'; reason?: string; assigned_to_user_id?: string | null; status?: string }) => Promise<void>
  onStoriesReordered?: () => Promise<void>
  userStoryComments: UserStoryComment[]
  onAddUserStoryComment: (userStoryId: string, commentText: string) => Promise<void>
  onEditUserStoryComment: (commentId: string, commentText: string) => Promise<void>
  onDeleteUserStoryComment: (commentId: string) => Promise<void>
  onCreateTask: (name: string, description?: string, assignedToUserId?: string, userStoryId?: string) => Promise<void>
  onUpdateTask: (taskId: string, updates: { name?: string; description?: string; status?: 'complete' | 'not_complete' | 'no_longer_required'; assigned_to_user_id?: string | null; user_story_id?: string }) => Promise<void>
  onDeleteTask: (taskId: string) => Promise<void>
  onSignOut: () => void
}

export function MainContentRenderer({
  currentView,
  loading,
  loadingBackgroundData,
  workspaceId,
  stakeholders,
  workspaceUsers,
  userRoles,
  platforms,
  lawFirms,
  userPermissions,
  stakeholderNotesCountMap,
  noteTemplates,
  selectedProject,
  selectedStakeholder,
  selectedNote,
  selectedUserStory,
  noteStakeholderIds,
  userStoryRoleIds,
  stakeholderDetailOrigin,
  originLawFirm,
  selectedNoteTemplate,
  selectedDesign,
  selectedDesignForProject,
  selectedLawFirm,
  user,
  userStoryComments,
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
  onCreateUserPermission,
  onUpdateUserPermission,
  onDeleteUserPermission,
  onNavigateToStakeholdersWithPermissionFilter,
  onCreateLawFirm,
  onUpdateLawFirm,
  onDeleteLawFirm,
  onImportLawFirmsCSV,
  onDeleteAllLawFirms,
  onImportStakeholdersCSV,
  onCreateNoteTemplate,
  onUpdateNoteTemplate,
  onDeleteNoteTemplate,
  onSelectNoteTemplate,
  onBackFromDesign,
  onBackFromLawFirm,
  onAddUserStoryComment,
  onEditUserStoryComment,
  onDeleteUserStoryComment,
  onUpdateUserStory,
  onStoriesReordered,
  onSignOut
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
        initialSelectedNote={selectedNote}
        initialView={selectedNote ? 'note-detail' : 'dashboard'}
        initialSelectedUserStory={selectedUserStory}
        initialUserStoryRoleIds={userStoryRoleIds}
        initialSelectedDesign={selectedDesign}
        workspaceUsers={workspaceUsers}
        onBack={onBackToWorkspace}
        onNavigateToWorkspace={(view) => {
          // This would need to be handled by the parent Dashboard component
          console.log('Navigate to workspace view:', view)
        }}
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
        userPermissions={userPermissions}
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

  if (currentView === 'note-detail' && selectedNote) {
    return (
      <NoteDetail
        note={selectedNote}
        assignedStakeholders={stakeholders}
        allWorkspaceStakeholders={stakeholders}
        projectAssignedStakeholderIds={[]}
        userRoles={userRoles}
        lawFirms={lawFirms}
        userPermissions={userPermissions}
        availableUsers={workspaceUsers}
        noteTemplates={noteTemplates}
        currentUser={user}
        onBack={() => console.log('Back from note')}
        onUpdate={(updatedNote) => {
          console.log('Note updated:', updatedNote)
        }}
        onAssignStakeholderToProject={async (stakeholderId) => {
          console.log('Assign stakeholder to project:', stakeholderId)
        }}
        onRemoveStakeholderFromNoteAndConditionallyProject={async (stakeholderId, noteId) => {
          console.log('Remove stakeholder from note:', stakeholderId, noteId)
        }}
      />
    )
  }


  if (currentView === 'user-story-detail' && selectedUserStory) {
    console.log('🔵 MainContentRenderer: workspaceUsers being passed to UserStoryDetail:', workspaceUsers)
    console.log('🔵 MainContentRenderer: workspaceUsers length:', workspaceUsers.length)
    return (
      <UserStoryDetail
        userStory={selectedUserStory}
        assignedStakeholders={stakeholders}
        userRoles={userRoles}
        userPermissions={userPermissions}
        lawFirms={lawFirms}
        availableUsers={workspaceUsers}
        initialSelectedRoleIds={userStoryRoleIds}
        userStoryComments={userStoryComments}
        onBack={onBackToWorkspace}
        onUpdate={(storyId, updates, updatedRoleIds) => {
          onUpdateUserStory(storyId, updates, updatedRoleIds)
        }}
        onAddComment={(commentText) => onAddUserStoryComment(selectedUserStory.id, commentText)}
        onEditComment={onEditUserStoryComment}
        onDeleteComment={onDeleteUserStoryComment}
        onCreateTask={onCreateTask}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
      />
    )
  }

  if (currentView === 'design-detail' && selectedDesign) {
    return (
      <AssetDetail
        designShortId={selectedDesignForProject?.short_id || 0}
        availableUsers={workspaceUsers}
        onBack={onBackFromDesign}
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

  if (currentView === 'note-template-detail' && selectedNoteTemplate) {
    return (
      <NoteTemplateDetail
        template={selectedNoteTemplate}
        onBack={() => console.log('Back from note template')}
        onUpdate={(updatedTemplate) => {
          console.log('Note template updated:', updatedTemplate)
        }}
      />
    )
  }


  switch (currentView) {
    case 'user-journeys':
      return (
        <UserJourneysManager workspaceId={workspaceId} />
      )
    case 'user-journey-creator':
      return (
        <UserJourneyCreator userRoles={userRoles} platforms={platforms} />
      )
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
    case 'note-templates':
      return (
        <NoteTemplateManager 
          noteTemplates={noteTemplates}
          onCreateNoteTemplate={onCreateNoteTemplate}
          onUpdateNoteTemplate={onUpdateNoteTemplate}
          onDeleteNoteTemplate={onDeleteNoteTemplate}
          onSelectNoteTemplate={onSelectNoteTemplate}
        />
      )
    case 'settings':
      return (
        <SettingsManager 
          workspaceId={workspaceId}
          workspaceUsers={workspaceUsers}
          userRoles={userRoles}
          platforms={platforms}
          userPermissions={userPermissions}
          stakeholders={stakeholders}
          noteTemplates={noteTemplates}
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
          onCreateUserPermission={onCreateUserPermission}
          onUpdateUserPermission={onUpdateUserPermission}
          onDeleteUserPermission={onDeleteUserPermission}
          onNavigateToStakeholdersWithPermissionFilter={onNavigateToStakeholdersWithPermissionFilter}
          onCreateNoteTemplate={onCreateNoteTemplate}
          onUpdateNoteTemplate={onUpdateNoteTemplate}
          onDeleteNoteTemplate={onDeleteNoteTemplate}
          onSelectNoteTemplate={onSelectNoteTemplate}
        />
      )
    case 'design-system':
      return (
        <DesignSystem onSignOut={onSignOut} userRoles={userRoles} />
      )
    case 'stakeholders':
      return (
        <StakeholderManager 
          stakeholders={stakeholders}
          userRoles={userRoles}
          lawFirms={lawFirms}
          userPermissions={userPermissions}
          stakeholderNotesCountMap={stakeholderNotesCountMap}
          loading={loadingBackgroundData}
          onCreateStakeholder={onCreateStakeholder}
          onUpdateStakeholder={onUpdateStakeholder}
          onDeleteStakeholder={onDeleteStakeholder}
          onImportStakeholdersCSV={onImportStakeholdersCSV}
          onSelectStakeholder={onSelectStakeholder}
        />
      )
    default:
      return (
        <UserJourneysManager workspaceId={workspaceId} />
      )
  }
}