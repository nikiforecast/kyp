import React from 'react'
import { Plus, Loader2, X } from 'lucide-react'
import { Button } from '../DesignSystem'
import type { UserRole, LawFirm } from '../../lib/supabase'

interface StakeholderFormProps {
  isVisible: boolean
  isEditing: boolean
  stakeholder: {
    name: string
    user_role_id: string
    law_firm_id: string
    user_permission_id: string
    visitor_id: string
    department: string
    pendo_role: string
  }
  userRoles: UserRole[]
  lawFirms: LawFirm[]
  userPermissions: UserPermission[]
  loading: boolean
  onSubmit: (e: React.FormEvent) => void
  onChange: (updates: Partial<{ name: string; user_role_id: string; law_firm_id: string; user_permission_id: string; visitor_id: string; department: string; pendo_role: string }>) => void
  onCancel: () => void
}

export function StakeholderForm({
  isVisible,
  isEditing,
  stakeholder,
  userRoles,
  lawFirms,
  userPermissions,
  loading,
  onSubmit,
  onChange,
  onCancel
}: StakeholderFormProps) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Stakeholder' : 'Add New Stakeholder'}
          </h3>
          <Button
            onClick={onCancel}
            variant="ghost"
            size="small"
            className="text-gray-500"
          >
            <X size={20} />
          </Button>
        </div>
        
        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={stakeholder.name}
                onChange={(e) => onChange({ name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pendo User ID (Email Address)</label>
              <input
                type="text"
                value={stakeholder.visitor_id}
                onChange={(e) => onChange({ visitor_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
                placeholder="Enter Pendo User ID..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Law Firm</label>
              <select
                value={stakeholder.law_firm_id}
                onChange={(e) => onChange({ law_firm_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
                required
              >
                <option value="">Select a law firm...</option>
                {lawFirms.filter(firm => firm.status === 'active').sort((a, b) => a.name.localeCompare(b.name)).map((firm) => (
                  <option key={firm.id} value={firm.id}>
                    {firm.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <input
                type="text"
                value={stakeholder.department}
                onChange={(e) => onChange({ department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
                placeholder="Enter department..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pendo Role</label>
              <input
                type="text"
                value={stakeholder.pendo_role}
                onChange={(e) => onChange({ pendo_role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
                placeholder="Enter the user role from Pendo if available..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User Role (Optional)</label>
              <select
                value={stakeholder.user_role_id}
                onChange={(e) => onChange({ user_role_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="">Select a role...</option>
                {userRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Legl Platform user permission</label>
              <select
                value={stakeholder.user_permission_id}
                onChange={(e) => onChange({ user_permission_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="">Select a permission...</option>
                {userPermissions.map((permission) => (
                  <option key={permission.id} value={permission.id}>
                    {permission.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                type="submit" 
                disabled={loading}
                loading={loading}
                variant="primary"
              >
                {isEditing ? 'Update Stakeholder' : 'Add Stakeholder'}
              </Button>
              <Button
                type="button"
                onClick={onCancel}
                variant="outline"
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}