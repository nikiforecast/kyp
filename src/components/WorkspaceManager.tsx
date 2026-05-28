import React, { useState } from 'react'
import { Building2, Plus, Loader2 } from 'lucide-react'
import type { Workspace } from '../lib/supabase'

interface WorkspaceManagerProps {
  workspaces: Workspace[]
  activeWorkspaceId: string
  isPlatformAdmin: boolean
  onCreateWorkspace: (name: string) => Promise<{ workspace: Workspace | null; error: string | null }>
  onSelectWorkspace: (workspaceId: string) => void
}

export function WorkspaceManager({
  workspaces,
  activeWorkspaceId,
  isPlatformAdmin,
  onCreateWorkspace,
  onSelectWorkspace,
}: WorkspaceManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [workspaceName, setWorkspaceName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspaceName.trim()) return

    setCreating(true)
    setError(null)
    setSuccess(null)

    const result = await onCreateWorkspace(workspaceName.trim())

    if (result.error) {
      setError(result.error)
    } else if (result.workspace) {
      setSuccess(`Workspace "${result.workspace.name}" created`)
      setWorkspaceName('')
      setShowCreateForm(false)
      onSelectWorkspace(result.workspace.id)
      setTimeout(() => setSuccess(null), 3000)
    }

    setCreating(false)
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Workspaces</h2>
          <p className="text-gray-600">
            {isPlatformAdmin
              ? 'Create and manage shared workspaces for your team'
              : 'Switch between workspaces you belong to'}
          </p>
        </div>
        {isPlatformAdmin && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            <Plus size={20} />
            Create Workspace
          </button>
        )}
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {showCreateForm && isPlatformAdmin && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Workspace</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Workspace Name</label>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. Acme Corp"
                required
                disabled={creating}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={creating || !workspaceName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {creating && <Loader2 size={16} className="animate-spin" />}
                Create Workspace
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                disabled={creating}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Your Workspaces</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {workspaces.map((workspace) => {
            const isActive = workspace.id === activeWorkspaceId
            return (
              <div
                key={workspace.id}
                className={`p-6 flex items-center justify-between ${
                  isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Building2 size={20} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{workspace.name}</p>
                    {isActive && (
                      <span className="text-xs text-blue-600 font-medium">Active workspace</span>
                    )}
                  </div>
                </div>
                {!isActive && (
                  <button
                    onClick={() => onSelectWorkspace(workspace.id)}
                    className="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-all"
                  >
                    Switch to this workspace
                  </button>
                )}
              </div>
            )
          })}
          {workspaces.length === 0 && (
            <div className="p-12 text-center">
              <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                {isPlatformAdmin
                  ? 'No workspaces yet. Create your first workspace to get started.'
                  : 'You are not a member of any workspace yet.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {isPlatformAdmin && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            Platform admin access is configured in Supabase Auth. Set{' '}
            <code className="text-xs bg-gray-200 px-1 py-0.5 rounded">app_metadata.is_admin</code>{' '}
            to <code className="text-xs bg-gray-200 px-1 py-0.5 rounded">true</code> for a user in the
            Supabase dashboard under Authentication → Users.
          </p>
        </div>
      )}
    </div>
  )
}
