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
  selectedStakeholders,
  onRowClick,
  onEdit,
  onDelete,
  onBulkDelete,
  onSelectionChange,
}: StakeholderTableProps) {
  const getUserRoleById = (id: string | undefined) => id ? userRoles.find(role => role.id === id) : undefined
  const getLawFirmById = (id: string | undefined) => id ? lawFirms.find(firm => firm.id === id) : undefined

  const columns = [
    {
      key: 'icon',
      header: 'Icon',
      width: '80px',
      render: (stakeholder: Stakeholder) => (
        <StakeholderAvatar userRole={getUserRoleById(stakeholder.user_role_id)} size="sm" />
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (stakeholder: Stakeholder) => (
        <div onClick={() => onRowClick(stakeholder)} className="cursor-pointer">
          <span className="text-sm font-medium text-gray-900">{stakeholder.name}</span>
        </div>
      ),
    },
    {
      key: 'user_role',
      header: 'User Role',
      sortable: true,
      render: (stakeholder: Stakeholder) => {
        const role = getUserRoleById(stakeholder.user_role_id)
        return (
          <div onClick={() => onRowClick(stakeholder)} className="cursor-pointer">
            {role ? (
              <span
                className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                style={{ backgroundColor: `${role.colour}20`, color: role.colour }}
              >
                {role.name}
              </span>
            ) : (
              <span className="text-sm text-gray-500">-</span>
            )}
          </div>
        )
      },
    },
    {
      key: 'law_firm',
      header: 'Account',
      sortable: true,
      render: (stakeholder: Stakeholder) => {
        const firm = getLawFirmById(stakeholder.law_firm_id)
        return (
          <div onClick={() => onRowClick(stakeholder)} className="cursor-pointer">
            {firm ? (
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-900">{firm.name}</span>
                {firm.top_4 && <Star size={14} className="text-yellow-500 fill-current" />}
              </div>
            ) : (
              <span className="text-sm text-gray-500">-</span>
            )}
          </div>
        )
      },
    },
    {
      key: 'structure',
      header: 'Structure',
      sortable: true,
      render: (stakeholder: Stakeholder) => {
        const firm = getLawFirmById(stakeholder.law_firm_id)
        return (
          <div onClick={() => onRowClick(stakeholder)} className="cursor-pointer">
            {firm ? (
              <span
                className={getStructureTagStyles(firm.structure).className}
                style={getStructureTagStyles(firm.structure).style}
              >
                {firm.structure === 'centralised' ? 'Centralised' : 'Decentralised'}
              </span>
            ) : (
              <span className="text-sm text-gray-500">-</span>
            )}
          </div>
        )
      },
    },
  ]

  const sortableFields = ['name', 'user_role', 'law_firm', 'structure'] as any

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
