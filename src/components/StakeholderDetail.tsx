import React, { useState, useEffect } from 'react'
import { ArrowLeft, Edit, Star } from 'lucide-react'
import { UserRoleTag } from './common/UserRoleTag'
import { CopyLinkButton } from './common/CopyLinkButton'
import { updateStakeholder, getProjectsForStakeholder } from '../lib/database'
import { getStructureTagStyles } from '../utils/structureTagStyles'
import { StakeholderSummary } from './StakeholderDetail/StakeholderSummary'
import { StakeholderProjects } from './StakeholderDetail/StakeholderProjects'
import { StakeholderForm } from './StakeholderManager/StakeholderForm'
import { EditableContentSection } from './common/EditableContentSection'
import type { Stakeholder, UserRole, LawFirm, Project } from '../lib/supabase'

interface StakeholderDetailProps {
  stakeholder: Stakeholder
  userRoles: UserRole[]
  lawFirms: LawFirm[]
  origin: 'project' | 'manager' | 'law-firm'
  backButtonText: string
  onBack: () => void
  onUpdate: (updates: Partial<Stakeholder>) => void
}

export function StakeholderDetail({
  stakeholder,
  userRoles,
  lawFirms,
  backButtonText,
  onBack,
  onUpdate,
}: StakeholderDetailProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingStakeholderData, setEditingStakeholderData] = useState({
    name: '',
    user_role_id: '',
    law_firm_id: '',
    visitor_id: '',
    department: '',
    pendo_role: '',
  })
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    loadStakeholderData()
  }, [stakeholder.id])

  const loadStakeholderData = async () => {
    try {
      setLoading(true)
      setProjects(await getProjectsForStakeholder(stakeholder.id))
    } catch (error) {
      console.error('Error loading stakeholder data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNotes = async (notes: string) => {
    const updates = { notes }
    const updatedStakeholder = await updateStakeholder(stakeholder.id, updates)
    if (updatedStakeholder) {
      onUpdate(updates)
    }
  }

  const handleOpenEditModal = () => {
    setEditingStakeholderData({
      name: stakeholder.name,
      user_role_id: stakeholder.user_role_id || '',
      law_firm_id: stakeholder.law_firm_id || '',
      visitor_id: stakeholder.visitor_id || '',
      department: stakeholder.department || '',
      pendo_role: stakeholder.pendo_role || '',
    })
    setShowEditModal(true)
  }

  const handleSaveEditedStakeholder = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingEdit(true)

    try {
      await onUpdate({
        name: editingStakeholderData.name,
        user_role_id: editingStakeholderData.user_role_id || undefined,
        law_firm_id: editingStakeholderData.law_firm_id || undefined,
        visitor_id: editingStakeholderData.visitor_id || undefined,
        department: editingStakeholderData.department || undefined,
        pendo_role: editingStakeholderData.pendo_role || undefined,
      })
      setShowEditModal(false)
    } catch (error) {
      console.error('Error updating stakeholder:', error)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleEditFormChange = (updates: Partial<{ name: string; user_role_id: string; law_firm_id: string; visitor_id: string; department: string; pendo_role: string }>) => {
    setEditingStakeholderData({ ...editingStakeholderData, ...updates })
  }

  const handleProjectClick = (project: Project) => {
    window.location.href = `/project/${project.short_id}`
  }

  const userRole = stakeholder.user_role_id
    ? userRoles.find(role => role.id === stakeholder.user_role_id)
    : null
  const lawFirm = stakeholder.law_firm_id
    ? lawFirms.find(firm => firm.id === stakeholder.law_firm_id)
    : null

  return (
    <div className="h-full flex flex-col w-full">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 w-full">
        <div className="flex justify-between">
          <div>
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-3"
            >
              <ArrowLeft size={20} />
              {backButtonText}
            </button>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{stakeholder.name}</h2>
              {userRole && <UserRoleTag userRole={userRole} size="md" />}
            </div>

            <div className="flex items-center gap-2">
              {lawFirm && (
                <>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-gray-700">{lawFirm.name}</span>
                    {lawFirm.top_4 && <Star size={14} className="text-yellow-500 fill-current" />}
                  </div>
                  <span
                    className={getStructureTagStyles(lawFirm.structure).className}
                    style={getStructureTagStyles(lawFirm.structure).style}
                  >
                    {lawFirm.structure === 'centralised' ? 'Centralised' : 'Decentralised'}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleOpenEditModal}
              className="flex text-sm gap-2 px-4 py-2 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
            >
              <Edit size={16} />
              Edit
            </button>
            <CopyLinkButton entityType="stakeholder" shortId={stakeholder.short_id} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        <div className="w-full space-y-6 p-6">
          <StakeholderSummary projects={projects} />

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <EditableContentSection
              title="Notes"
              initialContent={stakeholder.notes || ''}
              placeholder="Add notes about this stakeholder..."
              onSave={handleSaveNotes}
            />
          </div>

          <StakeholderProjects
            projects={projects}
            loading={loading}
            onProjectClick={handleProjectClick}
          />
        </div>
      </div>

      {showEditModal && (
        <StakeholderForm
          isVisible={true}
          isEditing={true}
          stakeholder={editingStakeholderData}
          userRoles={userRoles}
          lawFirms={lawFirms}
          loading={savingEdit}
          onSubmit={handleSaveEditedStakeholder}
          onChange={handleEditFormChange}
          onCancel={() => setShowEditModal(false)}
        />
      )}
    </div>
  )
}
