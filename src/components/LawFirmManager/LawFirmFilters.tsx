import React from 'react'
import { Search } from 'lucide-react'

interface LawFirmFiltersProps {
  searchTerm: string
  structureFilter: string
  totalCount: number
  centralisedCount: number
  decentralisedCount: number
  onSearchChange: (value: string) => void
  onStructureFilterChange: (value: string) => void
}

export function LawFirmFilters({
  searchTerm,
  structureFilter,
  totalCount,
  centralisedCount,
  decentralisedCount,
  onSearchChange,
  onStructureFilterChange
}: LawFirmFiltersProps) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <select
            value={structureFilter}
            onChange={(e) => onStructureFilterChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Types ({totalCount})</option>
            <option value="centralised">Centralised ({centralisedCount})</option>
            <option value="decentralised">Decentralised ({decentralisedCount})</option>
          </select>
        </div>
      </div>
    </div>
  )
}