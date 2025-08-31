import React from 'react'
import { Users, Star } from 'lucide-react'
import { DataTable, Column } from '../../DesignSystem/components/DataTable'
import { StakeholderAvatar } from '../common/StakeholderAvatar'
import { getStructureTagStyles } from '../../utils/structureTagStyles'
import type { Stakeholder, UserRole, LawFirm } from '../../lib/supabase'

interface StakeholderTableRefactoredProps {
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

export function StakeholderTableRefactored({
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
}: StakeholderTableRefactoredProps) {
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

  // Define columns using the new DataTable Column interface
  const columns: Column<Stakeholder>[] = [
    {
      key: 'avatar',
      header: 'Icon',
      render: (stakeholder) => {
        const userRole = getUserRoleById(stakeholder.user_role_id)
        return (
          <div onClick={() => onRowClick(stakeholder)} className="cursor-pointer">
            <StakeholderAvatar userRole={userRole} size="lg" />
          </div>
        )
      }
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (stakeholder) => (
        <div onClick={() => onRowClick(stakeholder)} className="cursor-pointer">
          <div className="text-sm font-medium text-gray-900">{stakeholder.name}</div>
        </div>
      )
    },
    {
      key: 'user_role',
      header: 'User Role',
      sortable: true,
      render: (stakeholder) => {
        const userRole = getUserRoleById(stakeholder.user_role_id)
        return (
          <div onClick={() => onRowClick(stakeholder)} className="cursor-pointer">
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
        )
      }
    },
    {
      key: 'user_permission',
      header: 'User Permission',
      sortable: true,
      render: (stakeholder) => {
        const userPermission = getUserPermissionById(stakeholder.user_permission_id)
        return (
          <div onClick={() => onRowClick(stakeholder)} className="cursor-pointer">
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
        )
      }
    },
    {
      key: 'notes_count',
      header: 'Notes Tagged',
      sortable: true,
      render: (stakeholder) => (
        <div onClick={() => onRowClick(stakeholder)} className="cursor-pointer">
          <span className="text-sm text-gray-900">
            {stakeholderNotesCountMap[stakeholder.id] || 0}
          </span>
        </div>
      )
    },
    {
      key: 'law_firm',
      header: 'Law Firm',
      sortable: true,
      render: (stakeholder) => {
        const lawFirm = getLawFirmById(stakeholder.law_firm_id)
        return (
          <div onClick={() => onRowClick(stakeholder)} className="cursor-pointer">
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
        )
      }
    },
    {
      key: 'structure',
      header: 'Structure',
      sortable: true,
      render: (stakeholder) => {
        const lawFirm = getLawFirmById(stakeholder.law_firm_id)
        return (
          <div onClick={() => onRowClick(stakeholder)} className="cursor-pointer">
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
        )
      }
    }
  ]

  return (
    <DataTable
      data={stakeholders}
      columns={columns}
      sortableFields={['name', 'user_role', 'user_permission', 'notes_count', 'law_firm', 'structure']}
      getItemId={(stakeholder) => stakeholder.id}
      getItemName={(stakeholder) => 'stakeholder'}
      selectable={true}
      selectedItems={selectedStakeholders}
      onSelectionChange={onSelectionChange}
      onRowClick={onRowClick}
      onEdit={onEdit}
      onDelete={onDelete}
      onBulkDelete={onBulkDelete}
      emptyStateIcon={Users}
      emptyStateMessage="No stakeholders match your current filters."
    />
  )
}
