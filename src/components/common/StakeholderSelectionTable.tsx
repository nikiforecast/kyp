import React, { useState } from 'react'
import { Search, Users, Star } from 'lucide-react'
import { StakeholderAvatar } from './StakeholderAvatar'
import { getStructureTagStyles } from '../../utils/structureTagStyles'
import type { Stakeholder, UserRole, LawFirm, UserPermission } from '../../lib/supabase'

interface StakeholderSelectionTableProps {
  stakeholders: Stakeholder[]
  userRoles: UserRole[]
  lawFirms: LawFirm[]
  userPermissions?: UserPermission[]
  selectedStakeholderIds: string[]
  onStakeholderToggle: (stakeholderId: string) => void
}

export function StakeholderSelectionTable({
  stakeholders = [],
  userRoles,
  lawFirms = [],
  userPermissions = [],
  selectedStakeholderIds,
  onStakeholderToggle
}: StakeholderSelectionTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [userPermissionFilter, setUserPermissionFilter] = useState('')
  const [structureFilter, setStructureFilter] = useState('')

  const getUserRoleById = (roleId?: string) => {
    if (!roleId) return null
    return userRoles.find(role => role.id === roleId)
  }

  const getUserPermissionById = (permissionId?: string) => {
    if (!permissionId) return null
    return (userPermissions || []).find(permission => permission.id === permissionId)
  }

  const getLawFirmById = (firmId?: string) => {
    if (!firmId) return null
    return (lawFirms || []).find(firm => firm.id === firmId)
  }

  // Filter stakeholders based on search and filters
  const filteredStakeholders = stakeholders.filter(stakeholder => {
    const userRole = getUserRoleById(stakeholder.user_role_id)
    const userPermission = getUserPermissionById(stakeholder.user_permission_id)
    const lawFirm = getLawFirmById(stakeholder.law_firm_id)
    
    // Search filter
    const matchesSearch = stakeholder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userRole?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userPermission?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lawFirm?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    // User role filter
    const matchesUserRole = !userRoleFilter || stakeholder.user_role_id === userRoleFilter
    
    // User permission filter
    const matchesUserPermission = !userPermissionFilter || stakeholder.user_permission_id === userPermissionFilter
    
    // Structure filter
    const matchesStructure = !structureFilter || lawFirm?.structure === structureFilter
    
    return matchesSearch && matchesUserRole && matchesUserPermission && matchesStructure
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all filtered stakeholders
      filteredStakeholders.forEach(stakeholder => {
        if (!selectedStakeholderIds.includes(stakeholder.id)) {
          onStakeholderToggle(stakeholder.id)
        }
      })
    } else {
      // Deselect all filtered stakeholders
      filteredStakeholders.forEach(stakeholder => {
        if (selectedStakeholderIds.includes(stakeholder.id)) {
          onStakeholderToggle(stakeholder.id)
        }
      })
    }
  }

  const isAllFilteredSelected = filteredStakeholders.length > 0 && 
    filteredStakeholders.every(stakeholder => selectedStakeholderIds.includes(stakeholder.id))
  
  const isSomeFilteredSelected = filteredStakeholders.some(stakeholder => 
    selectedStakeholderIds.includes(stakeholder.id)
  )

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search stakeholders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* User Role Filter */}
          <div className="w-48">
            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All User Roles</option>
              {userRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* User Permission Filter */}
          <div className="w-48">
            <select
              value={userPermissionFilter}
              onChange={(e) => setUserPermissionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Permissions</option>
              {userPermissions.map((permission) => (
                <option key={permission.id} value={permission.id}>
                  {permission.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Structure Filter */}
          <div className="w-48">
            <select
              value={structureFilter}
              onChange={(e) => setStructureFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Structures</option>
              <option value="centralised">Centralised</option>
              <option value="decentralised">Decentralised</option>
            </select>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {filteredStakeholders.length} of {stakeholders.length} stakeholders
            {selectedStakeholderIds.length > 0 && ` • ${selectedStakeholderIds.length} selected`}
          </span>
          
          {/* Clear Filters */}
          {(searchTerm || userRoleFilter || userPermissionFilter || structureFilter) && (
            <button
              onClick={() => {
                setSearchTerm('')
                setUserRoleFilter('')
                setUserPermissionFilter('')
                setStructureFilter('')
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isSomeFilteredSelected && !isAllFilteredSelected
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stakeholder
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User Permission
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Structure
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStakeholders.map((stakeholder) => {
                const userRole = getUserRoleById(stakeholder.user_role_id)
                const userPermission = getUserPermissionById(stakeholder.user_permission_id)
                const lawFirm = getLawFirmById(stakeholder.law_firm_id)
                const isSelected = selectedStakeholderIds.includes(stakeholder.id)
                
                return (
                  <tr 
                    key={stakeholder.id} 
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => onStakeholderToggle(stakeholder.id)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onClick={(e) => {
                          e.stopPropagation()
                          onStakeholderToggle(stakeholder.id)
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <StakeholderAvatar userRole={userRole} size="md" />
                        <div className="font-medium text-gray-900">{stakeholder.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
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
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {userPermission ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
                          {userPermission.name}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
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
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
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
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          {filteredStakeholders.length === 0 && (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                {searchTerm || userRoleFilter || structureFilter 
                  ? 'No stakeholders match your current filters.'
                  : 'No stakeholders available.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}