import React from 'react'
import { Plus, FileText, Edit, Trash2, Loader2, Search, X } from 'lucide-react'
import { CKEditorComponent } from './CKEditorComponent'
import { NoteSummaryCard } from './common/NoteSummaryCard'
import { Button } from './DesignSystem/components'
import type { ResearchNote, Stakeholder, UserRole, LawFirm } from '../lib/supabase'

// Extend ResearchNote type to include stakeholder IDs for editing
interface EditableResearchNote extends ResearchNote {
  stakeholderIds?: string[]
  decision_text?: string
  note_date?: string
}

interface ResearchNotesSectionProps {
  notes: ResearchNote[]
  assignedStakeholders: Stakeholder[]
  userRoles: UserRole[]
  lawFirms: LawFirm[]
  noteStakeholders: Record<string, string[]>
  onViewNote: (note: ResearchNote) => void
  onCreateNote: () => void
  onDeleteNote: (noteId: string) => void
}

export function ResearchNotesSection({ 
  notes, 
  assignedStakeholders, 
  userRoles, 
  lawFirms, 
  noteStakeholders, 
  onViewNote,
  onCreateNote, 
  onDeleteNote, 
}: ResearchNotesSectionProps) {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [selectedStakeholders, setSelectedStakeholders] = React.useState<string[]>([])
  const [selectedUserRoles, setSelectedUserRoles] = React.useState<string[]>([])
  const [selectedFirmType, setSelectedFirmType] = React.useState<string>('')

  const getUserRoleById = (id?: string) => id ? userRoles.find(r => r.id === id) : null
  const getLawFirmById = (id?: string) => id ? lawFirms.find(f => f.id === id) : null

  // Filter notes based on search and filters
  const filteredNotes = notes.filter(note => {
    // Search filter
    const matchesSearch = !searchTerm || 
      note.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.summary && note.summary.toLowerCase().includes(searchTerm.toLowerCase()))

    // Stakeholder filter
    const noteStakeholderIds = noteStakeholders[note.id] || []
    const matchesStakeholders = selectedStakeholders.length === 0 || 
      selectedStakeholders.some(stakeholderId => noteStakeholderIds.includes(stakeholderId))

    // User role filter
    const noteUserRoles = noteStakeholderIds
      .map(stakeholderId => assignedStakeholders.find(s => s.id === stakeholderId))
      .filter(Boolean)
      .map(stakeholder => stakeholder!.user_role_id)
      .filter(Boolean)
    
    const matchesUserRoles = selectedUserRoles.length === 0 ||
      selectedUserRoles.some(roleId => noteUserRoles.includes(roleId))

    // Firm type filter
    const noteFirmTypes = noteStakeholderIds
      .map(stakeholderId => assignedStakeholders.find(s => s.id === stakeholderId))
      .filter(Boolean)
      .map(stakeholder => stakeholder!.law_firm_id)
      .filter(Boolean)
      .map(firmId => lawFirms.find(f => f.id === firmId))
      .filter(Boolean)
      .map(firm => firm!.structure)
    
    const matchesFirmType = !selectedFirmType ||
      noteFirmTypes.includes(selectedFirmType as 'centralised' | 'decentralised')

    return matchesSearch && matchesStakeholders && matchesUserRoles && matchesFirmType
  })

  const handleStakeholderFilterToggle = (stakeholderId: string) => {
    setSelectedStakeholders(prev => 
      prev.includes(stakeholderId)
        ? prev.filter(id => id !== stakeholderId)
        : [...prev, stakeholderId]
    )
  }

  const handleUserRoleFilterToggle = (roleId: string) => {
    setSelectedUserRoles(prev => 
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    )
  }

  const clearAllFilters = () => {
    setSearchTerm('')
    setSelectedStakeholders([])
    setSelectedUserRoles([])
    setSelectedFirmType('')
  }

  const hasActiveFilters = searchTerm || selectedStakeholders.length > 0 || selectedUserRoles.length > 0 || selectedFirmType

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Notes</h2>
          <p className="text-gray-600">
            {filteredNotes.length} of {notes.length} notes & calls
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>
        <Button
          onClick={onCreateNote}
          icon={Plus}
          variant="primary"
          size="default"
        >
          Add Note
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-4">
        {/* Search Bar and Filters - Inline */}
        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search notes by name or summary..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Stakeholder Filter */}
          <div style={{ minWidth: '160px' }}>
            <select
              value={selectedStakeholders[0] || ''}
              onChange={(e) => setSelectedStakeholders(e.target.value ? [e.target.value] : [])}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Stakeholders</option>
              {assignedStakeholders.map((stakeholder) => {
                // Count notes for this stakeholder
                const noteCount = notes.filter(note => 
                  (noteStakeholders[note.id] || []).includes(stakeholder.id)
                ).length
                
                return (
                  <option key={stakeholder.id} value={stakeholder.id}>
                    {stakeholder.name} ({noteCount})
                  </option>
                )
              })}
            </select>
          </div>

          {/* Firm Type Filter */}
          <div style={{ minWidth: '160px' }}>
            <select
              value={selectedFirmType}
              onChange={(e) => setSelectedFirmType(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Firm Types</option>
              {(() => {
                // Count notes for each firm type
                const centralisedCount = notes.filter(note => {
                  const noteStakeholderIds = noteStakeholders[note.id] || []
                  const noteFirmTypes = noteStakeholderIds
                    .map(stakeholderId => assignedStakeholders.find(s => s.id === stakeholderId))
                    .filter(Boolean)
                    .map(stakeholder => stakeholder!.law_firm_id)
                    .filter(Boolean)
                    .map(firmId => lawFirms.find(f => f.id === firmId))
                    .filter(Boolean)
                    .map(firm => firm!.structure)
                  return noteFirmTypes.includes('centralised')
                }).length

                const decentralisedCount = notes.filter(note => {
                  const noteStakeholderIds = noteStakeholders[note.id] || []
                  const noteFirmTypes = noteStakeholderIds
                    .map(stakeholderId => assignedStakeholders.find(s => s.id === stakeholderId))
                    .filter(Boolean)
                    .map(stakeholder => stakeholder!.law_firm_id)
                    .filter(Boolean)
                    .map(firmId => lawFirms.find(f => f.id === firmId))
                    .filter(Boolean)
                    .map(firm => firm!.structure)
                  return noteFirmTypes.includes('decentralised')
                }).length

                const options = []
                if (centralisedCount > 0) {
                  options.push(
                    <option key="centralised" value="centralised">
                      Centralised ({centralisedCount})
                    </option>
                  )
                }
                if (decentralisedCount > 0) {
                  options.push(
                    <option key="decentralised" value="decentralised">
                      Decentralised ({decentralisedCount})
                    </option>
                  )
                }
                return options
              })()}
            </select>
          </div>
          {/* User Role Filter */}
          <div style={{ minWidth: '160px' }}>
            <select
              value={selectedUserRoles[0] || ''}
              onChange={(e) => setSelectedUserRoles(e.target.value ? [e.target.value] : [])}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All User Roles</option>
              {userRoles.filter((role) => {
                // Count notes that have stakeholders with this role
                const noteCount = notes.filter(note => {
                  const noteStakeholderIds = noteStakeholders[note.id] || []
                  const noteUserRoles = noteStakeholderIds
                    .map(stakeholderId => assignedStakeholders.find(s => s.id === stakeholderId))
                    .filter(Boolean)
                    .map(stakeholder => stakeholder!.user_role_id)
                    .filter(Boolean)
                  return noteUserRoles.includes(role.id)
                }).length
                
                return noteCount > 0
              }).map((role) => {
                // Count notes that have stakeholders with this role
                const noteCount = notes.filter(note => {
                  const noteStakeholderIds = noteStakeholders[note.id] || []
                  const noteUserRoles = noteStakeholderIds
                    .map(stakeholderId => assignedStakeholders.find(s => s.id === stakeholderId))
                    .filter(Boolean)
                    .map(stakeholder => stakeholder!.user_role_id)
                    .filter(Boolean)
                  return noteUserRoles.includes(role.id)
                }).length
                
                return (
                  <option key={role.id} value={role.id}>
                    {role.name} ({noteCount})
                  </option>
                )
              })}
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div className="flex justify-end">
            <Button
              onClick={clearAllFilters}
              variant="ghost"
              size="small"
            >
              Clear all filters
            </Button>
          </div>
        )}
      </div>


      <div className="space-y-6">
        {filteredNotes.map((note) => (
          (() => {
            // Pre-process stakeholders for this specific note
            const noteStakeholderIds = noteStakeholders[note.id] || []
            const assignedStakeholdersForCard = assignedStakeholders.filter(stakeholder => 
              noteStakeholderIds.includes(stakeholder.id)
            )
            
            return (
          <NoteSummaryCard
            key={note.id}
            note={note}
            assignedStakeholdersForCard={assignedStakeholdersForCard}
            userRoles={userRoles}
            lawFirms={lawFirms}
            onView={onViewNote}
            onDelete={onDeleteNote}
          />
            )
          })()
        ))}
        {notes.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No notes & calls yet. Add your first note!</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No notes & calls match your current filters.</p>
            <Button
              onClick={clearAllFilters}
              variant="ghost"
              size="small"
              className="mt-2 text-blue-600 hover:text-blue-700"
            >
              Clear filters to see all notes
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}