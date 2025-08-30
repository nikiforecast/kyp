import React from 'react'
import { FileText, Trash2 } from 'lucide-react'
import { StakeholderTag } from './StakeholderTag'
import { Button } from '../DesignSystem/components'
import type { ResearchNote, Stakeholder, UserRole, LawFirm } from '../../lib/supabase'

interface NoteSummaryCardProps {
  note: ResearchNote
  assignedStakeholdersForCard: Stakeholder[]
  userRoles: UserRole[]
  lawFirms: LawFirm[]
  onView: (note: ResearchNote) => void
  onDelete: (noteId: string) => void
  showDeleteButton?: boolean
}

export function NoteSummaryCard({ 
  note, 
  assignedStakeholdersForCard,
  userRoles, 
  lawFirms, 
  onView, 
  onDelete,
  showDeleteButton = true
}: NoteSummaryCardProps) {
  const getUserRoleById = (id?: string) => id ? userRoles.find(r => r.id === id) : null
  const getLawFirmById = (id?: string) => id ? lawFirms.find(f => f.id === id) : null

  const displayDate = note.note_date ? new Date(note.note_date) : new Date(note.created_at)
  const isFutureDate = displayDate > new Date()

  return (
    <div className="flex items-center gap-6 mb-4 relative cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors" onClick={() => onView(note)}>
      {/* Date */}
      <div className="w-24 text-right flex-shrink-0 self-center">
        <div className="text-sm font-medium text-gray-900">
          {displayDate.toLocaleDateString()}
        </div>
        <div className="text-xs text-gray-500">
          {displayDate.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>

      {/* Timeline dot */}
      <div className="flex flex-col items-center flex-shrink-0 self-center">
        <div className={`w-3 h-3 rounded-full ${isFutureDate ? 'bg-green-500' : 'bg-indigo-600'}`}></div>
      </div>

      {/* Note card */}
      <div className="flex-1 bg-white rounded-xl p-6 border border-gray-200 transition-all self-center">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{note.name}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showDeleteButton && (
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(note.id)
                }}
                icon={Trash2}
                variant="ghost"
                size="small"
                className="text-red-600 hover:bg-red-50"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
        
        {/* Decision Text */}
        {note.decision_text && note.decision_text.length > 0 && (
          <div className="mb-4">
            {note.decision_text.map((decision, index) => {
              // Extract decision text without timestamp (format: "timestamp|decision_text")
              const decisionText = decision.includes('|') ? decision.split('|').slice(1).join('|') : decision
              return (
                <div key={index} className="bg-green-100 border border-green-300 rounded-lg p-3 mb-4">
                  <p className="text-green-800 font-medium">{decisionText}</p>
                </div>
              )
            })}
          </div>
        )}
        
        {/* Tagged Stakeholders */}
        {assignedStakeholdersForCard.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {assignedStakeholdersForCard.map((stakeholder) => {
              const userRole = getUserRoleById(stakeholder.user_role_id)
              
              return (
                <StakeholderTag
                  key={stakeholder.id}
                  stakeholder={stakeholder}
                  userRole={userRole}
                  size="sm"
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}