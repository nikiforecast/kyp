import React from 'react'
import { Search } from 'lucide-react'
import type { UserRole } from '../../lib/supabase'

interface StakeholderFiltersProps {
  searchTerm: string
  userRoleFilter: string
  structureFilter: string
  userRoles: UserRole[]
  onSearchChange: (value: string) => void
  onUserRoleFilterChange: (value: string) => void
  onStructureFilterChange: (value: string) => void
}

export function StakeholderFilters({
  searchTerm,
  userRoleFilter,
  structureFilter,
  userRoles,
  onSearchChange,
  onUserRoleFilterChange,
  onStructureFilterChange,
}: StakeholderFiltersProps) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search stakeholders..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="w-48">
          <select
            value={userRoleFilter}
            onChange={(e) => onUserRoleFilterChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All User Roles</option>
            {userRoles.map((role) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </div>

        <div className="w-48">
          <select
            value={structureFilter}
            onChange={(e) => onStructureFilterChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Structures</option>
            <option value="centralised">Centralised</option>
            <option value="decentralised">Decentralised</option>
          </select>
        </div>
      </div>
    </div>
  )
}
