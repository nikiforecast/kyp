import React from 'react'
import { Users, Star } from 'lucide-react'
import { DataTable } from '../DesignSystem'
import { StakeholderAvatar } from '../common/StakeholderAvatar'
import { getStructureTagStyles } from '../../utils/structureTagStyles'
import type { Stakeholder, UserRole, LawFirm } from '../../lib/supabase'

interface StakeholderTableProps {
  stakeholders: Stakeholder[]
  userRoles: UserRole[]
  lawFirms: LawFirm[]
  userPermissions: any[]
  stakeholderNotesCountMap: Record<string, number>
  selectedStakeholders: string[]
  onRowClick: (stakeholder: Stakeholder) => void
  onEdit: (stakeholder: Stakeholder) => void
  onDelete: (stakeholderId: string) => void
  onBulkDelete: (stakeholderIds: string[]) => void
  onSelectionChange: (stakeholderIds: string[]) => void
}

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
  const getUserRoleById = (id: string | undefined) => id ? userRoles.find(role => role.id === id) : undefined
  const getUserPermissionById = (id: string | undefined) => id ? userPermissions.find(permission => permission.id === id) : undefined
  const getLawFirmById = (id: string | undefined) => id ? lawFirms.find(firm => firm.id === id) : undefined

  // Define columns for the DataTable
  const columns = [
    {
      key: 'icon',
      header: 'Icon',
      width: '80px',
             render: (stakeholder: Stakeholder) => (
         <StakeholderAvatar
           userRole={getUserRoleById(stakeholder.user_role_id)}
           size="sm"
         />
       )
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (stakeholder: Stakeholder) => (
        <div 
          onClick={() => onRowClick(stakeholder)}
          className="cursor-pointer"
        >
          <span className="text-sm font-medium text-gray-900">{stakeholder.name}</span>
        </div>
      )
    },
    {
      key: 'user_role',
      header: 'User Role',
      sortable: true,
      render: (stakeholder: Stakeholder) => (
        <div 
          onClick={() => onRowClick(stakeholder)}
          className="cursor-pointer"
        >
          {getUserRoleById(stakeholder.user_role_id) ? (
            <span 
              className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
              style={{ 
                backgroundColor: `${getUserRoleById(stakeholder.user_role_id)?.colour}20`,
                color: getUserRoleById(stakeholder.user_role_id)?.colour 
              }}
            >
              {getUserRoleById(stakeholder.user_role_id)?.name}
            </span>
          ) : (
            <span className="text-sm text-gray-500">-</span>
          )}
        </div>
      )
    },
    {
      key: 'user_permission',
      header: 'User Permission',
      sortable: true,
      render: (stakeholder: Stakeholder) => (
        <div 
          onClick={() => onRowClick(stakeholder)}
          className="cursor-pointer"
        >
          {getUserPermissionById(stakeholder.user_permission_id) ? (
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
              getUserPermissionById(stakeholder.user_permission_id)?.name === 'Administrator'
                ? 'bg-indigo-100 text-indigo-700'
                : getUserPermissionById(stakeholder.user_permission_id)?.name === 'General User'
                ? 'bg-gray-100 text-gray-700'
                : 'text-gray-500'
            }`}>
              {getUserPermissionById(stakeholder.user_permission_id)?.name === 'Administrator' && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {getUserPermissionById(stakeholder.user_permission_id)?.name}
            </span>
          ) : (
            <span className="text-sm text-gray-500">-</span>
          )}
        </div>
      )
    },
    {
      key: 'notes_count',
      header: 'Notes Tagged',
      sortable: true,
      render: (stakeholder: Stakeholder) => (
        <div 
          onClick={() => onRowClick(stakeholder)}
          className="cursor-pointer"
        >
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
      render: (stakeholder: Stakeholder) => (
        <div 
          onClick={() => onRowClick(stakeholder)}
          className="cursor-pointer"
        >
          {getLawFirmById(stakeholder.law_firm_id) ? (
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-900">{getLawFirmById(stakeholder.law_firm_id)?.name}</span>
              {getLawFirmById(stakeholder.law_firm_id)?.top_4 && (
                <Star size={14} className="text-yellow-500 fill-current" />
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-500">-</span>
          )}
        </div>
      )
    },
    {
      key: 'structure',
      header: 'Structure',
      sortable: true,
      render: (stakeholder: Stakeholder) => (
        <div 
          onClick={() => onRowClick(stakeholder)}
          className="cursor-pointer"
        >
          {getLawFirmById(stakeholder.law_firm_id) ? (
            <span 
              className={getStructureTagStyles(getLawFirmById(stakeholder.law_firm_id)?.structure || 'centralised').className}
              style={getStructureTagStyles(getLawFirmById(stakeholder.law_firm_id)?.structure || 'centralised').style}
            >
              {getLawFirmById(stakeholder.law_firm_id)?.structure === 'centralised' ? 'Centralised' : 'Decentralised'}
            </span>
          ) : (
            <span className="text-sm text-gray-500">-</span>
          )}
        </div>
      )
    }
  ]

  // Define sortable fields - these are custom sort keys, not direct Stakeholder properties
  const sortableFields = ['name', 'user_role', 'user_permission', 'notes_count', 'law_firm', 'structure'] as any

  return (
    <DataTable
      data={stakeholders}
      columns={columns}
      sortableFields={sortableFields}
      onRowClick={onRowClick}
      onEdit={onEdit}
      onDelete={(stakeholder) => onDelete(stakeholder.id)}
      onBulkDelete={onBulkDelete}
      getItemId={(stakeholder) => stakeholder.id}
      getItemName={(stakeholder) => stakeholder.name}
      selectable={true}
      selectedItems={selectedStakeholders}
      onSelectionChange={onSelectionChange}
      emptyStateIcon={Users as any}
      emptyStateMessage="No stakeholders match your current filters."
    />
  )
}