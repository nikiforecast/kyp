import React, { useState } from 'react'
import { Settings, Shield, UserCheck, FileText, UserPlus, Server } from 'lucide-react'
import { UserPermissionManager } from './UserPermissionManager'
import { UserRoleManager } from './UserRoleManager'
import { PlatformManager } from './PlatformManager'
import { NoteTemplateManager } from './NoteTemplateManager'
import { TeamManager } from './TeamManager'
import type { 
  WorkspaceUser,
  UserRole,
  Platform,
  UserPermission,
  Stakeholder,
  NoteTemplate
} from '../lib/supabase'

interface SettingsManagerProps {
  // Data states
  workspaceId: string
  workspaceUsers: WorkspaceUser[]
  userRoles: UserRole[]
  platforms: Platform[]
  userPermissions: UserPermission[]
  stakeholders: Stakeholder[]
  noteTemplates: NoteTemplate[]
  
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
  
  // Note template handlers
  onCreateNoteTemplate: (name: string, body?: string) => Promise<void>
  onUpdateNoteTemplate: (templateId: string, updates: { name?: string; body?: string }) => Promise<void>
  onDeleteNoteTemplate: (templateId: string) => Promise<void>
  onSelectNoteTemplate: (template: NoteTemplate) => void
}

export function SettingsManager({
  workspaceId,
  workspaceUsers,
  userRoles,
  platforms,
  userPermissions,
  stakeholders,
  noteTemplates,
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
  onCreateNoteTemplate,
  onUpdateNoteTemplate,
  onDeleteNoteTemplate,
  onSelectNoteTemplate
}: SettingsManagerProps) {
  const [currentView, setCurrentView] = useState('user-permissions')

  const menuItems = [
    { id: 'user-permissions', label: 'User Permissions', icon: Shield },
    { id: 'user-roles', label: 'User Roles', icon: UserCheck },
    { id: 'platforms', label: 'Platforms', icon: Server },
    { id: 'note-templates', label: 'Note Templates', icon: FileText },
    { id: 'team', label: 'JS Team', icon: UserPlus },
  ]

  const renderContent = () => {
    switch (currentView) {
      case 'user-permissions':
        return (
          <UserPermissionManager 
            userPermissions={userPermissions}
            stakeholders={stakeholders}
            onCreateUserPermission={onCreateUserPermission}
            onUpdateUserPermission={onUpdateUserPermission}
            onDeleteUserPermission={onDeleteUserPermission}
            onNavigateToStakeholders={onNavigateToStakeholdersWithPermissionFilter}
          />
        )
      case 'user-roles':
        return (
          <UserRoleManager 
            userRoles={userRoles}
            stakeholders={stakeholders}
            onCreateUserRole={onCreateUserRole}
            onUpdateUserRole={onUpdateUserRoleDefinition}
            onDeleteUserRole={onDeleteUserRole}
            onNavigateToStakeholders={onNavigateToStakeholdersWithFilter}
          />
        )
      case 'platforms':
        return (
          <PlatformManager 
            platforms={platforms}
            onCreatePlatform={onCreatePlatform}
            onUpdatePlatform={onUpdatePlatform}
            onDeletePlatform={onDeletePlatform}
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
      case 'team':
        return (
          <TeamManager 
            workspaceUsers={workspaceUsers}
            onCreateUser={onCreateUser}
            onUpdateUserRole={onUpdateWorkspaceUserRole}
            onUpdateWorkspaceUser={onUpdateWorkspaceUser}
            onRemoveUser={onRemoveUser}
          />
        )
      default:
        return (
          <UserPermissionManager 
            userPermissions={userPermissions}
            stakeholders={stakeholders}
            onCreateUserPermission={onCreateUserPermission}
            onUpdateUserPermission={onUpdateUserPermission}
            onDeleteUserPermission={onDeleteUserPermission}
            onNavigateToStakeholders={onNavigateToStakeholdersWithPermissionFilter}
          />
        )
    }
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden w-full">
      {/* Settings Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Settings size={20} className="text-gray-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-500">Workspace Configuration</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map(item => {
              const Icon = item.icon
              const isActive = currentView === item.id
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setCurrentView(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  )
}