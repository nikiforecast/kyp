import React, { useState } from 'react'
import { Settings, UserCheck, UserPlus, Server, Building2 } from 'lucide-react'
import { UserRoleManager } from './UserRoleManager'
import { PlatformManager } from './PlatformManager'
import { TeamManager } from './TeamManager'
import { WorkspaceManager } from './WorkspaceManager'
import type { Workspace, WorkspaceUser, UserRole, Platform, Stakeholder } from '../lib/supabase'

interface SettingsManagerProps {
  workspaceId: string
  workspaces: Workspace[]
  isPlatformAdmin: boolean
  workspaceUsers: WorkspaceUser[]
  userRoles: UserRole[]
  platforms: Platform[]
  stakeholders: Stakeholder[]
  onCreateWorkspace: (name: string) => Promise<{ workspace: Workspace | null; error: string | null }>
  onSelectWorkspace: (workspaceId: string) => void
  onCreateUser: (email: string, role: 'admin' | 'member', fullName?: string, team?: 'Design' | 'Product' | 'Engineering' | 'Other', username?: string) => Promise<{ user: WorkspaceUser | null, error: string | null }>
  onUpdateWorkspaceUser: (userId: string, updates: { full_name?: string; team?: 'Design' | 'Product' | 'Engineering' | 'Other' | null; username?: string | null }) => Promise<{ success: boolean; error?: string }>
  onUpdateWorkspaceUserRole: (userId: string, newRole: 'admin' | 'member') => Promise<void>
  onRemoveUser: (userId: string) => Promise<void>
  onCreateUserRole: (name: string, colour: string, icon?: string) => Promise<void>
  onUpdateUserRoleDefinition: (roleId: string, updates: { name?: string; colour?: string; icon?: string }) => Promise<boolean>
  onDeleteUserRole: (roleId: string) => Promise<void>
  onNavigateToStakeholdersWithFilter: (userRoleId: string) => void
  onCreatePlatform: (name: string, colour: string, logo?: string) => Promise<void>
  onUpdatePlatform: (platformId: string, updates: { name?: string; colour?: string; logo?: string }) => Promise<boolean>
  onDeletePlatform: (platformId: string) => Promise<void>
}

export function SettingsManager({
  workspaceId,
  workspaces,
  isPlatformAdmin,
  workspaceUsers,
  userRoles,
  platforms,
  stakeholders,
  onCreateWorkspace,
  onSelectWorkspace,
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
}: SettingsManagerProps) {
  const [currentView, setCurrentView] = useState(isPlatformAdmin ? 'workspaces' : 'user-roles')

  const menuItems = [
    ...(isPlatformAdmin ? [{ id: 'workspaces', label: 'Workspaces', icon: Building2 }] : []),
    { id: 'user-roles', label: 'User Roles', icon: UserCheck },
    { id: 'platforms', label: 'Platforms', icon: Server },
    { id: 'team', label: 'JS Team', icon: UserPlus },
  ]

  const renderContent = () => {
    switch (currentView) {
      case 'workspaces':
        return (
          <WorkspaceManager
            workspaces={workspaces}
            activeWorkspaceId={workspaceId}
            isPlatformAdmin={isPlatformAdmin}
            onCreateWorkspace={onCreateWorkspace}
            onSelectWorkspace={onSelectWorkspace}
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
      case 'team':
        return (
          <TeamManager
            workspaceId={workspaceId}
            workspaceUsers={workspaceUsers}
            onCreateUser={onCreateUser}
            onUpdateUserRole={onUpdateWorkspaceUserRole}
            onUpdateWorkspaceUser={onUpdateWorkspaceUser}
            onRemoveUser={onRemoveUser}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden w-full">
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
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

      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  )
}
