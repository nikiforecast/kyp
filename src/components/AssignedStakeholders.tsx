import React from 'react'
import { Trash2, Users, ArrowRight, Star, RefreshCw, ArrowLeft } from 'lucide-react'
import { StakeholderTag } from './common/StakeholderTag'
import { StakeholderAvatar } from './common/StakeholderAvatar'
import { StakeholderSelectionTable } from './common/StakeholderSelectionTable'
import { getStructureTagStyles } from '../utils/structureTagStyles'
import type { Stakeholder, UserRole, LawFirm } from '../lib/supabase'

interface AssignedStakeholdersProps {
  assignedStakeholders: Stakeholder[]
  unassignedStakeholders: Stakeholder[]
  userRoles: UserRole[]
  lawFirms: LawFirm[]
  showAssignModal: boolean
  onShowAssignModal: (show: boolean) => void
  onAssignStakeholder: (stakeholderId: string) => void
  onRemoveStakeholder: (stakeholderId: string) => void
  onViewStakeholder: (stakeholder: Stakeholder) => void
  onRefreshStakeholders: () => Promise<void>
  refreshing?: boolean
  onBack?: () => void
}

export const AssignedStakeholders: React.FC<AssignedStakeholdersProps> = ({
  assignedStakeholders,
  unassignedStakeholders,
  userRoles,
  lawFirms,
  showAssignModal,
  onShowAssignModal,
  onAssignStakeholder,
  onRemoveStakeholder,
  onViewStakeholder,
  onRefreshStakeholders,
  refreshing = false,
  onBack
}) => {
  const [selectedStakeholders, setSelectedStakeholders] = React.useState<string[]>([])

  // Reset selected stakeholders when modal opens/closes
  React.useEffect(() => {
    if (!showAssignModal) {
      setSelectedStakeholders([])
    }
  }, [showAssignModal])

  const getStakeholderRole = (stakeholder: Stakeholder) => {
    return userRoles.find(role => role.id === stakeholder.user_role_id)
  }

  const getStakeholderLawFirm = (stakeholder: Stakeholder) => {
    return lawFirms.find(firm => firm.id === stakeholder.law_firm_id)
  }

  const handleStakeholderToggle = (stakeholderId: string) => {
    setSelectedStakeholders(prev => 
      prev.includes(stakeholderId)
        ? prev.filter(id => id !== stakeholderId)
        : [...prev, stakeholderId]
    )
  }

  const handleAddSelectedStakeholders = () => {
    selectedStakeholders.forEach(stakeholderId => {
      onAssignStakeholder(stakeholderId)
    })
    onShowAssignModal(false)
  }
  return (
    <div className="space-y-6">
      {/* Assigned Stakeholders Section */}
      <div>
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-3"
          >
            <ArrowLeft size={20} />
            Back to Project Overview
          </button>
        )}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Stakeholders</h2>
            <p className="text-gray-600">Add stakeholders to this project by tagging them to Notes & Calls, and User Journeys</p>
          </div>
        </div>

        {assignedStakeholders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No stakeholders assigned to this project yet.</p>
           
          </div>
        ) : (
          <div className="space-y-3">
            {assignedStakeholders.map((stakeholder) => {
              const role = getStakeholderRole(stakeholder)
              const lawFirm = getStakeholderLawFirm(stakeholder)

              return (
                <div
                  key={stakeholder.id}
                  className="relative bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onViewStakeholder(stakeholder)}
                >
                  <div className="flex items-center space-x-4">
                    {/* Role Icon - Left side */}
                    <StakeholderAvatar userRole={role} size="lg" className="flex-shrink-0" />

                    {/* Stakeholder Info - Center */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="text-sm font-medium text-gray-900">{stakeholder.name}</h4>
                      
                      {/* Law Firm Name */}
                      {lawFirm && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <p className="text-sm text-gray-600">{lawFirm.name}</p>
                            {lawFirm.top_4 && (
                              <Star size={12} className="text-yellow-500 fill-current" />
                            )}
                          </div>
                          {/* Law Firm Structure - stacked below */}
                          <div>
                            <span 
                              className={getStructureTagStyles(lawFirm.structure).className}
                              style={getStructureTagStyles(lawFirm.structure).style}
                            >
                              {lawFirm.structure === 'centralised' ? 'Centralised' : 'Decentralised'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Remove button - Right side */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm(`Are you sure you want to remove ${stakeholder.name} from this project?`)) {
                          onRemoveStakeholder(stakeholder.id)
                        }
                      }}
                      disabled={true}
                      className="hidden p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      title="Remove from project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Assign Stakeholder Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Project Stakeholders</h3>
              {selectedStakeholders.length > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  {selectedStakeholders.length} stakeholder{selectedStakeholders.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              {unassignedStakeholders.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  All stakeholders are already assigned to this project.
                </p>
              ) : (
                <StakeholderSelectionTable
                  stakeholders={unassignedStakeholders}
                  userRoles={userRoles}
                  lawFirms={lawFirms}
                  userPermissions={userPermissions}
                  selectedStakeholderIds={selectedStakeholders}
                  onStakeholderToggle={handleStakeholderToggle}
                />
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
              {selectedStakeholders.length > 0 && (
                <button
                  onClick={handleAddSelectedStakeholders}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add to project ({selectedStakeholders.length})
                </button>
              )}
              <button
                onClick={() => onShowAssignModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-2">
        <div>
          <button
            onClick={onRefreshStakeholders}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
            title="Refresh and clean up stakeholders"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <p className="text-sm text-gray-600">{assignedStakeholders.length} stakeholders assigned to this project</p>
      </div>
    </div>
  )
}