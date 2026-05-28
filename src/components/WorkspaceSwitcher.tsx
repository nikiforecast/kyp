import React from 'react'
import { Building2, ChevronDown } from 'lucide-react'
import type { Workspace } from '../lib/supabase'

interface WorkspaceSwitcherProps {
  workspaces: Workspace[]
  activeWorkspaceId: string
  onSelectWorkspace: (workspaceId: string) => void
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
}: WorkspaceSwitcherProps) {
  if (workspaces.length <= 1) return null

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId)

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0">
      <Building2 size={16} className="text-gray-500" />
      <div className="relative">
        <select
          value={activeWorkspaceId}
          onChange={(e) => onSelectWorkspace(e.target.value)}
          className="appearance-none pl-2 pr-8 py-1 text-sm font-medium text-gray-900 bg-transparent border-none focus:ring-0 cursor-pointer"
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
      {activeWorkspace && (
        <span className="text-xs text-gray-500">Active workspace</span>
      )}
    </div>
  )
}
