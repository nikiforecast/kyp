import React from 'react'
import { Users, Edit, Trash2, Trash, ChevronUp, ChevronDown, Star } from 'lucide-react'
import { StakeholderAvatar } from '../common/StakeholderAvatar'
import { getStructureTagStyles } from '../../utils/structureTagStyles'
import type { Stakeholder, UserRole, LawFirm } from '../../lib/supabase'

interface StakeholderTableProps {
  stakeholders: Stakeholder[]
  userRoles: UserRole[]
  lawFirms: LawFirm[]
  userPermissions: UserPermission[]
  stakeholderNotesCountMap: Record<string, number>
  selectedStakeholders: string[]
  onRowClick: (stakeholder: Stakeholder) => void
  onEdit: (stakeholder: Stakeholder) => void
  onDelete: (stakeholderId: string) => void
  onBulkDelete: (stakeholderIds: string[]) => void
  onSelectionChange: (stakeholderIds: string[]) => void
}

type SortField = 'name' | 'user_role' | 'user_permission' | 'notes_count' | 'law_firm' | 'structure'

export function StakeholderTable({
  stakeholders,
  userRoles,
  lawFirms,
  userPermissions,
  stakeholderNotesCountMap = {},
  selectedStakeholders,
  onRowClick,
  onEdit,
  onDelete,
  onBulkDelete,
  onSelectionChange
}: StakeholderTableProps) {
  const [sortField, setSortField] = React.useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')
  const [lastSelectedIndex, setLastSelectedIndex] = React.useState<number | null>(null)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronUp size={14} className="text-gray-300" />
    }
    return sortDirection === 'asc' 
      ? <ChevronUp size={14} className="text-gray-600" />
      : <ChevronDown size={14} className="text-gray-600" />
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(stakeholders.map(s => s.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectStakeholder = (stakeholderId: string, checked: boolean, event?: React.MouseEvent) => {
    const currentIndex = sortedStakeholders.findIndex(s => s.id === stakeholderId)
    
    // Check if shift key is pressed and we have a previous selection
    if (event?.shiftKey && lastSelectedIndex !== null && currentIndex !== -1) {
      const startIndex = Math.min(lastSelectedIndex, currentIndex)
      const endIndex = Math.max(lastSelectedIndex, currentIndex)
      
      // Get all stakeholder IDs in the range
      const rangeStakeholderIds = sortedStakeholders
        .slice(startIndex, endIndex + 1)
        .map(s => s.id)
      
      // If the current checkbox is being checked, select all in range
      if (checked) {
        const newSelection = [...new Set([...selectedStakeholders, ...rangeStakeholderIds])]
        onSelectionChange(newSelection)
      } else {
        // If unchecking, remove all in range
        const newSelection = selectedStakeholders.filter(id => !rangeStakeholderIds.includes(id))
        onSelectionChange(newSelection)
      }
    } else {
      // Normal single selection
      if (checked) {
        onSelectionChange([...selectedStakeholders, stakeholderId])
      } else {
        onSelectionChange(selectedStakeholders.filter(id => id !== stakeholderId))
      }
    }
    
    // Update the last selected index for future shift-clicks
    setLastSelectedIndex(currentIndex)
  }

  const handleBulkDelete = () => {
    if (selectedStakeholders.length === 0) return
    
    const confirmMessage = `Are you sure you want to delete ${selectedStakeholders.length} stakeholder${selectedStakeholders.length > 1 ? 's' : ''}? This action cannot be undone.`
    
    if (window.confirm(confirmMessage)) {
      onBulkDelete(selectedStakeholders)
    }
  }

  const getUserRoleById = (roleId?: string) => {
    if (!roleId) return null
    return userRoles.find(role => role.id === roleId)
  }

  const getUserPermissionById = (permissionId?: string) => {
    if (!permissionId) return null
    return userPermissions.find(permission => permission.id === permissionId)
  }

  const getLawFirmById = (firmId?: string) => {
    if (!firmId) return null
    return lawFirms.find(firm => firm.id === firmId)
  }

  const isAllSelected = stakeholders.length > 0 && selectedStakeholders.length === stakeholders.length
  const isIndeterminate = selectedStakeholders.length > 0 && selectedStakeholders.length < stakeholders.length

  // Sort stakeholders
  const sortedStakeholders = [...stakeholders].sort((a, b) => {
    if (!sortField) return 0
    
    let aValue: string
    let bValue: string
    
    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'user_role':
        const aRole = getUserRoleById(a.user_role_id)
        const bRole = getUserRoleById(b.user_role_id)
        aValue = aRole?.name.toLowerCase() || ''
        bValue = bRole?.name.toLowerCase() || ''
        break
      case 'user_permission':
        const aPermission = getUserPermissionById(a.user_permission_id)
        const bPermission = getUserPermissionById(b.user_permission_id)
        aValue = aPermission?.name.toLowerCase() || ''
        bValue = bPermission?.name.toLowerCase() || ''
        break
      case 'notes_count':
        const aNotesCount = stakeholderNotesCountMap[a.id] || 0
        const bNotesCount = stakeholderNotesCountMap[b.id] || 0
        return sortDirection === 'asc' ? aNotesCount - bNotesCount : bNotesCount - aNotesCount
      case 'law_firm':
        const aFirm = getLawFirmById(a.law_firm_id)
        const bFirm = getLawFirmById(b.law_firm_id)
        aValue = aFirm?.name.toLowerCase() || ''
        bValue = bFirm?.name.toLowerCase() || ''
        break
      case 'structure':
        const aFirmStructure = getLawFirmById(a.law_firm_id)
        const bFirmStructure = getLawFirmById(b.law_firm_id)
        aValue = aFirmStructure?.structure || ''
        bValue = bFirmStructure?.structure || ''
        break
      default:
        return 0
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div className="space-y-4">
     
      
      {/* Bulk Actions */}
      {selectedStakeholders.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedStakeholders.length} stakeholder{selectedStakeholders.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
            >
              <Trash size={16} />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isIndeterminate
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Icon</th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Name
                  {getSortIcon('name')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('user_role')}
              >
                <div className="flex items-center gap-1">
                  User Role
                  {getSortIcon('user_role')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('user_permission')}
              >
                <div className="flex items-center gap-1">
                  User Permission
                  {getSortIcon('user_permission')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('notes_count')}
              >
                <div className="flex items-center gap-1">
                  Notes Tagged
                  {getSortIcon('notes_count')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('law_firm')}
              >
                <div className="flex items-center gap-1">
                  Law Firm
                  {getSortIcon('law_firm')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('structure')}
              >
                <div className="flex items-center gap-1">
                  Structure
                  {getSortIcon('structure')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedStakeholders.map((stakeholder) => {
              const userRole = getUserRoleById(stakeholder.user_role_id)
              const userPermission = getUserPermissionById(stakeholder.user_permission_id)
              const lawFirm = getLawFirmById(stakeholder.law_firm_id)
              const isSelected = selectedStakeholders.includes(stakeholder.id)
              
              return (
                <tr 
                  key={stakeholder.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onClick={(e) => {
                        e.stopPropagation()
                        const newCheckedState = !isSelected
                        handleSelectStakeholder(stakeholder.id, newCheckedState, e)
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div 
                      onClick={() => onRowClick(stakeholder)}
                      className="cursor-pointer"
                    >
                    <StakeholderAvatar userRole={userRole} size="lg" />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div 
                      onClick={() => onRowClick(stakeholder)}
                      className="cursor-pointer"
                    >
                    <div className="text-sm font-medium text-gray-900">{stakeholder.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div 
                      onClick={() => onRowClick(stakeholder)}
                      className="cursor-pointer"
                    >
                    {userRole ? (
                      <span 
                        className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                        style={{ 
                          backgroundColor: `${userRole.colour}20`,
                          color: userRole.colour 
                        }}
                      >
                        {userRole.name}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div 
                      onClick={() => onRowClick(stakeholder)}
                      className="cursor-pointer"
                    >
                    {userPermission ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                        userPermission.name === 'Administrator'
                          ? 'bg-indigo-100 text-indigo-700'
                          : userPermission.name === 'General User'
                          ? 'bg-gray-100 text-gray-700'
                          : 'text-gray-500'
                      }`}>
                        {userPermission.name === 'Administrator' && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {userPermission.name}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div 
                      onClick={() => onRowClick(stakeholder)}
                      className="cursor-pointer"
                    >
                      <span className="text-sm text-gray-900">
                        {stakeholderNotesCountMap[stakeholder.id] || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div 
                      onClick={() => onRowClick(stakeholder)}
                      className="cursor-pointer"
                    >
                    {lawFirm ? (
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-900">{lawFirm.name}</span>
                        {lawFirm.top_4 && (
                          <Star size={14} className="text-yellow-500 fill-current" />
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div 
                      onClick={() => onRowClick(stakeholder)}
                      className="cursor-pointer"
                    >
                    {lawFirm ? (
                      <span 
                        className={getStructureTagStyles(lawFirm.structure).className}
                        style={getStructureTagStyles(lawFirm.structure).style}
                      >
                        {lawFirm.structure === 'centralised' ? 'Centralised' : 'Decentralised'}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit(stakeholder)
                        }}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(stakeholder.id)
                        }}
                        className="text-red-600 hover:text-red-900 flex items-center gap-1"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        
        {sortedStakeholders.length === 0 && (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No stakeholders match your current filters.</p>
          </div>
        )}
      </div>
    </div>
    </div>
  )
}