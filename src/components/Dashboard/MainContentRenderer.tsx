import React from 'react'
import { WorkspaceDashboard } from '../WorkspaceDashboard'
import { ProjectManager } from '../ProjectManager'
import { LawFirmManager } from '../LawFirmManager'
import { ThemeManager } from '../ThemeManager'
import { ThemeDetail } from '../ThemeDetail'
import { UserRoleManager } from '../UserRoleManager'
import { UserPermissionManager } from '../UserPermissionManager'
import { StakeholderManager } from '../StakeholderManager'
import { LawFirmDetail } from '../LawFirmDetail'
import { TeamManager } from '../TeamManager'
import { ProjectDashboard } from '../ProjectDashboard'
import { StakeholderDetail } from '../StakeholderDetail'
import { NoteDetail } from '../NoteDetail'
import { UserJourneyEditor } from '../UserJourneyEditor'
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
  LawFirm,
  UserPermission,
  UserJourney,
  UserStory,
  Theme,
  NoteTemplate,
  Design,
  ProjectProgressStatus,
  UserStoryComment
} from '../../lib/supabase'

interface MainContentRendererProps {
  currentView: string
  loading: boolean
  isInitialLoad: boolean
  
  // Data states
  projects: Project[]
  stakeholders: Stakeholder[]
  notes: ResearchNote[]
  workspaceUsers: WorkspaceUser[]
  userRoles: UserRole[]
  lawFirms: LawFirm[]
  userPermissions: UserPermission[]
  stakeholderNotesCountMap: Record<string, number>
  themesWithCounts: Array<Theme & { contentCounts: { userStories: number; userJourneys: number; researchNotes: number; assets: number } }>
  themes: Theme[]
  noteTemplates: NoteTemplate[]
  
  // Selected items
  selectedProject: Project | null
  selectedStakeholder: Stakeholder | null
  selectedNote: ResearchNote | null
  selectedUserJourney: UserJourney | null
  selectedUserStory: UserStory | null
  noteStakeholderIds: string[]
  userStoryRoleIds: string[]
  stakeholderDetailOrigin: 'project' | 'manager' | 'law-firm'
  originLawFirm: LawFirm | null
  selectedTheme: Theme | null
  selectedNoteTemplate: NoteTemplate | null
  selectedDesign: Design | null
  selectedDesignForProject: Design | null
  selectedLawFirm: LawFirm | null
  allProjectProgressStatus: ProjectProgressStatus[]
  allUserStories: UserStory[]
  allUserJourneys: UserJourney[]
  allDesigns: Design[]
  user: User | null
  
  // Project handlers
  onCreateProject: (name: string, overview?: string) => Promise<void>
  onUpdateProject: (project: Project) => Promise<void>
  onDeleteProject: (projectId: string) => Promise<void>
  onSelectProject: (project: Project) => void
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
  
  // User permission handlers
  onCreateUserPermission: (name: string, description?: string) => Promise<void>
  onUpdateUserPermission: (permissionId: string, updates: { name?: string; description?: string }) => Promise<void>
  onDeleteUserPermission: (permissionId: string) => Promise<void>
  onNavigateToStakeholdersWithPermissionFilter: (userPermissionId: string) => void
  
  // Law firm handlers
  onCreateLawFirm: (name: string, structure: 'centralised' | 'decentralised', status: 'active' | 'inactive') => Promise<void>
  onUpdateLawFirm: (id: string, updates: Partial<Omit<LawFirm, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>>) => Promise<void>
  onDeleteLawFirm: (id: string) => Promise<void>
  onImportLawFirmsCSV: (csvData: string) => Promise<{ success: number, errors: string[] }>
  onDeleteAllLawFirms: () => Promise<void>
  onImportStakeholdersCSV: (csvData: string) => Promise<{ success: number, errors: string[] }>
  
  // Theme handlers
  onThemeCreate: (theme: Theme) => void
  onThemeUpdate: (themeId: string, updates: { name?: string; description?: string; color?: string }) => Promise<void>
  onThemeDelete: (themeId: string) => Promise<void>
  onSelectTheme: (theme: Theme) => void
  
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
  isInitialLoad,
  projects,
  stakeholders,
  notes,
  workspaceUsers,
  userRoles,
  lawFirms,
  userPermissions,
  stakeholderNotesCountMap,
  themesWithCounts,
  themes,
  noteTemplates,
  selectedProject,
  selectedStakeholder,
  selectedNote,
  selectedUserJourney,
  selectedUserStory,
  noteStakeholderIds,
  userStoryRoleIds,
  stakeholderDetailOrigin,
  originLawFirm,
  selectedTheme,
  selectedNoteTemplate,
  selectedDesign,
  selectedDesignForProject,
  selectedLawFirm,
  allProjectProgressStatus,
  allUserStories,
  allUserJourneys,
  allDesigns,
  user,
  userStoryComments,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onSelectProject,
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
  onThemeCreate,
  onThemeUpdate,
  onThemeDelete,
  onSelectTheme,
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
  // Show loading only for initial critical data load
  if (isInitialLoad) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading critical data...</span>
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
        initialSelectedUserJourney={selectedUserJourney}
        initialUserStoryRoleIds={userStoryRoleIds}
        initialSelectedDesign={selectedDesign}
        workspaceUsers={workspaceUsers}
        onBack={onBackToWorkspace}
        onThemeCreate={onThemeCreate}
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
        themes={themes}
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
        onThemeCreate={onThemeCreate}
      />
    )
  }

  if (currentView === 'user-journey-detail' && selectedUserJourney) {
    return (
      <UserJourneyEditor
        journey={selectedUserJourney}
        assignedStakeholders={stakeholders}
        userRoles={userRoles}
        lawFirms={lawFirms}
        onBack={() => console.log('Back from user journey')}
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
        themes={themes}
        availableUsers={workspaceUsers}
        initialSelectedRoleIds={userStoryRoleIds}
        userStoryComments={userStoryComments}
        onBack={onBackToWorkspace}
        onThemeCreate={onThemeCreate}
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

  if (currentView === 'theme-detail' && selectedTheme) {
    return (
      <ThemeDetail
        themeShortId={selectedTheme.short_id || 0}
        onBack={() => console.log('Back from theme')}
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
    case 'workspace-dashboard':
      return (
        <WorkspaceDashboard 
          workspaceUsers={workspaceUsers}
          onSignOut={onSignOut}
        />
      )
    case 'projects':
      return (
        <ProjectManager 
          projects={projects}
          notes={notes}
          allProjectProgressStatus={allProjectProgressStatus}
          allUserStories={allUserStories}
          allUserJourneys={allUserJourneys}
          allDesigns={allDesigns}
          isInitialLoad={isInitialLoad}
          onCreateProject={onCreateProject}
          onSelectProject={onSelectProject}
          onUpdateProject={onUpdateProject}
          onDeleteProject={onDeleteProject}
        />
      )
    case 'law-firms':
      return (
        <LawFirmManager 
          lawFirms={lawFirms}
          stakeholders={stakeholders}
          userRoles={userRoles}
          onCreateLawFirm={onCreateLawFirm}
          onUpdateLawFirm={onUpdateLawFirm}
          onDeleteLawFirm={onDeleteLawFirm}
          onImportCSV={onImportLawFirmsCSV}
          onDeleteAll={onDeleteAllLawFirms}
          onSelectStakeholder={onSelectStakeholderFromLawFirm}
        />
      )
    case 'themes':
      return (
        <ThemeManager 
          themes={themesWithCounts}
          onCreateTheme={async (name, description, color) => {
            const { createTheme } = await import('../../lib/database')
            const newTheme = await createTheme(name, description, color)
            if (newTheme) {
              onThemeCreate(newTheme)
            }
          }}
          onUpdateTheme={onThemeUpdate}
          onDeleteTheme={onThemeDelete}
          onSelectTheme={onSelectTheme}
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
          workspaceUsers={workspaceUsers}
          userRoles={userRoles}
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
        <DesignSystem onSignOut={onSignOut} />
      )
    case 'stakeholders':
      return (
        <StakeholderManager 
          stakeholders={stakeholders}
          userRoles={userRoles}
          lawFirms={lawFirms}
          userPermissions={userPermissions}
          stakeholderNotesCountMap={stakeholderNotesCountMap}
          onCreateStakeholder={onCreateStakeholder}
          onUpdateStakeholder={onUpdateStakeholder}
          onDeleteStakeholder={onDeleteStakeholder}
          onImportStakeholdersCSV={onImportStakeholdersCSV}
          onSelectStakeholder={onSelectStakeholder}
        />
      )
    default:
      return (
        <ProjectManager 
          projects={projects}
          notes={notes}
          allProjectProgressStatus={allProjectProgressStatus}
          allUserStories={allUserStories}
          allUserJourneys={allUserJourneys}
          allDesigns={allDesigns}
          isInitialLoad={isInitialLoad}
          onCreateProject={onCreateProject}
          onSelectProject={onSelectProject}
          onUpdateProject={onUpdateProject}
          onDeleteProject={onDeleteProject}
        />
      )
  }
}