import React, { useState, useEffect } from 'react'
import { Users, Plus, Mail, Shield, UserCheck, Clock, Trash2, Edit, Loader2, ChevronUp, ChevronDown, Check, X } from 'lucide-react'
import type { WorkspaceUser } from '../lib/supabase'

interface TeamManagerProps {
  workspaceId: string
  workspaceUsers: WorkspaceUser[]
  onCreateUser: (email: string, role: 'admin' | 'member', fullName?: string, team?: 'Design' | 'Product' | 'Engineering' | 'Other', username?: string) => Promise<{ user: WorkspaceUser | null, error: string | null }>
  onUpdateUserRole: (userId: string, newRole: 'admin' | 'member') => Promise<void>
  onUpdateWorkspaceUser: (userId: string, updates: { full_name?: string; team?: 'Design' | 'Product' | 'Engineering' | 'Other' | null; username?: string | null }) => Promise<{ success: boolean; error?: string }>
  onRemoveUser: (userId: string) => Promise<void>
}

export function TeamManager({ 
  workspaceId,
  workspaceUsers, 
  onCreateUser, 
  onUpdateUserRole, 
  onUpdateWorkspaceUser,
  onRemoveUser 
}: TeamManagerProps) {
  const [showUserForm, setShowUserForm] = useState(false)
  const [newUser, setNewUser] = useState({ 
    email: '', 
    username: '',
    role: 'member' as 'admin' | 'member',
    fullName: '',
    team: '' as '' | 'Design' | 'Product' | 'Engineering' | 'Other'
  })
  const [creatingUser, setCreatingUser] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [sortField, setSortField] = useState<'email' | 'role' | 'status' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState({ fullName: '', username: '', team: '' as '' | 'Design' | 'Product' | 'Engineering' | 'Other' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  // Load current user role on component mount
  useEffect(() => {
    const loadCurrentUserRole = async () => {
      const { getCurrentUserRole } = await import('../lib/database')
      const role = await getCurrentUserRole(workspaceId)
      setCurrentUserRole(role)
    }
    loadCurrentUserRole()
  }, [workspaceId])

  const handleSort = (field: 'email' | 'role' | 'status') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: 'email' | 'role' | 'status') => {
    if (sortField !== field) {
      return <ChevronUp size={14} className="text-gray-300" />
    }
    return sortDirection === 'asc' 
      ? <ChevronUp size={14} className="text-gray-600" />
      : <ChevronDown size={14} className="text-gray-600" />
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingUser(true)
    setError(null)
    setSuccess(null)
    
    try {
      const { user, error: createError } = await onCreateUser(
        newUser.email, 
        newUser.role, 
        newUser.fullName || undefined,
        newUser.team || undefined,
        newUser.username || undefined
      )
      
      if (createError) {
        setError(createError)
      } else if (user) {
        setSuccess(`Invitation sent to ${newUser.email}`)
        setNewUser({ email: '', username: '', role: 'member', fullName: '', team: '' })
        setShowUserForm(false)
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (error) {
      console.error('Error creating user:', error)
      setError('Failed to send invitation. Please try again.')
    } finally {
      setCreatingUser(false)
    }
  }

  const handleEditUser = (user: WorkspaceUser) => {
    setEditingUserId(user.id)
    setEditingUser({
      fullName: user.full_name || '',
      username: user.username || '',
      team: user.team || ''
    })
  }

  const handleSaveEdit = async () => {
    if (!editingUserId) return
    
    setSavingEdit(true)
    try {
      const result = await onUpdateWorkspaceUser(editingUserId, {
        full_name: editingUser.fullName.trim() || undefined,
        username: editingUser.username.trim() || null,
        team: editingUser.team || null
      })
      if (!result.success) {
        setError(result.error || 'Failed to update user')
        return
      }
      setEditingUserId(null)
      setEditingUser({ fullName: '', username: '', team: '' })
    } catch (error) {
      console.error('Error updating user:', error)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingUserId(null)
    setEditingUser({ fullName: '', username: '', team: '' })
  }

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'member') => {
    try {
      await onUpdateUserRole(userId, newRole)
    } catch (error) {
      console.error('Error updating user role:', error)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to remove this user from the workspace?')) {
      try {
        await onRemoveUser(userId)
      } catch (error) {
        console.error('Error removing user:', error)
      }
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Shield size={16} className="text-yellow-600" />
      case 'admin':
        return <Shield size={16} className="text-blue-600" />
      default:
        return <Users size={16} className="text-gray-600" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <UserCheck size={16} className="text-green-600" />
      case 'pending':
        return <Clock size={16} className="text-yellow-600" />
      default:
        return <Users size={16} className="text-gray-600" />
    }
  }

  const canEditUsers = currentUserRole === 'owner' || currentUserRole === 'admin'

  // Sort workspace users
  const sortedWorkspaceUsers = [...workspaceUsers].sort((a, b) => {
    if (!sortField) return 0
    
    let aValue: string
    let bValue: string
    
    switch (sortField) {
      case 'email':
        aValue = a.user_email.toLowerCase()
        bValue = b.user_email.toLowerCase()
        break
      case 'role':
        aValue = a.role
        bValue = b.role
        break
      case 'status':
        aValue = a.status
        bValue = b.status
        break
      default:
        return 0
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Management</h2>
          <p className="text-gray-600">Manage workspace members and their permissions</p>
        </div>
        <button
          onClick={() => setShowUserForm(true)}
          disabled={!canEditUsers}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={20} />
          Invite Member
        </button>
      </div>

      {/* Success/Error Messages */}
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

      {/* Create User Form */}
      {showUserForm && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite Team Member</h3>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={newUser.fullName}
                onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter full name"
                disabled={creatingUser}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={creatingUser}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value.toLowerCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. jsmith"
                disabled={creatingUser}
                pattern="[a-z0-9_]{3,30}"
                title="3–30 characters: lowercase letters, numbers, underscores"
              />
              <p className="mt-1 text-xs text-gray-500">Used to sign in instead of email (optional)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Team</label>
              <select
                value={newUser.team}
                onChange={(e) => setNewUser({ ...newUser, team: e.target.value as '' | 'Design' | 'Product' | 'Engineering' | 'Other' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={creatingUser}
              >
                <option value="">Select team...</option>
                <option value="Design">Design</option>
                <option value="Product">Product</option>
                <option value="Engineering">Engineering</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'member' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={creatingUser}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button 
                type="submit" 
                disabled={creatingUser}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {creatingUser && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                Send Invitation
              </button>
              <button
                type="button"
                onClick={() => setShowUserForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                disabled={creatingUser}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Team Members List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
            <div className="flex items-center gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider overflow-x-auto">
              <span>Name</span>
              <button 
                className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                onClick={() => handleSort('email')}
              >
                Email
                {getSortIcon('email')}
              </button>
              <span>Team</span>
              <button 
                className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                onClick={() => handleSort('role')}
              >
                Role
                {getSortIcon('role')}
              </button>
              <button 
                className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                onClick={() => handleSort('status')}
              >
                Status
                {getSortIcon('status')}
              </button>
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {sortedWorkspaceUsers.map((user) => (
            <div key={user.id} className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Mail size={20} className="text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  {editingUserId === user.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingUser.fullName}
                        onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Full name"
                        disabled={savingEdit}
                      />
                      <input
                        type="text"
                        value={editingUser.username}
                        onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value.toLowerCase() })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Username"
                        disabled={savingEdit}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="email"
                          value={user.user_email}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50"
                          disabled
                        />
                        <select
                          value={editingUser.team}
                          onChange={(e) => setEditingUser({ ...editingUser, team: e.target.value as '' | 'Design' | 'Product' | 'Engineering' | 'Other' })}
                          className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          disabled={savingEdit}
                        >
                          <option value="">No team</option>
                          <option value="Design">Design</option>
                          <option value="Product">Product</option>
                          <option value="Engineering">Engineering</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-gray-900">
                        {user.full_name || user.user_email}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{user.user_email}</span>
                        {user.username && (
                          <>
                            <span>•</span>
                            <span>@{user.username}</span>
                          </>
                        )}
                        {user.team && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {user.team}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {getRoleIcon(user.role)}
                    <span className="text-sm text-gray-600 capitalize">{user.role}</span>
                    <span className="text-gray-400">•</span>
                    {getStatusIcon(user.status)}
                    <span className="text-sm text-gray-600 capitalize">{user.status}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {editingUserId === user.id ? (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      disabled={savingEdit}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-green-600 hover:bg-green-50 rounded transition-all disabled:opacity-50"
                    >
                      {savingEdit ? <div className="w-3.5 h-3.5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div> : <Check size={14} />}
                      {savingEdit ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={savingEdit}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded transition-all"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </>
                ) : (
                  canEditUsers && user.role !== 'owner' && (
                    <button
                      onClick={() => handleEditUser(user)}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-all"
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                  )
                )}
                {user.role !== 'owner' && canEditUsers && (
                  <>
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.id, e.target.value as 'admin' | 'member')}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => handleRemoveUser(user.id)}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-all"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {sortedWorkspaceUsers.length === 0 && (
            <div className="p-12 text-center">
              <Users size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No team members yet. Invite your first team member!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}