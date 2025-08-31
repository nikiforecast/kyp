import React, { useState, useEffect } from 'react'
import { ArrowLeft, Building2, Users, Edit, Save, X, Star } from 'lucide-react'
import { updateLawFirm } from '../lib/database'
import { getStructureTagStyles } from '../utils/structureTagStyles'
import { EditableContentSection } from './common/EditableContentSection'
import { StakeholderAvatar } from './common/StakeholderAvatar'
import { CopyLinkButton } from './common/CopyLinkButton'
import type { LawFirm, Stakeholder, UserRole } from '../lib/supabase'

interface LawFirmDetailProps {
  lawFirm: LawFirm
  stakeholders: Stakeholder[]
  userRoles: UserRole[]
  onBack: () => void
  onUpdate: (updates: Partial<LawFirm>) => void
  onSelectStakeholder?: (stakeholder: Stakeholder, lawFirm: LawFirm) => void
}

const sections = [
  {
    title: 'Quick Facts',
    field: 'quick_facts',
    placeholder: 'Add quick facts about this law firm...'
  },
  {
    title: 'Key Quotes',
    field: 'key_quotes', 
    placeholder: 'Add key quotes from this law firm...'
  },
  {
    title: 'Insights',
    field: 'insights',
    placeholder: 'Add insights about this law firm...'
  },
  {
    title: 'Opportunities',
    field: 'opportunities',
    placeholder: 'Add opportunities with this law firm...'
  }
]

export function LawFirmDetail({ 
  lawFirm, 
  stakeholders, 
  userRoles, 
  onBack, 
  onUpdate,
  onSelectStakeholder
}: LawFirmDetailProps) {

  const firmStakeholders = stakeholders.filter(s => s.law_firm_id === lawFirm.id)

  const handleSaveSection = async (field: string, content: string) => {
    
    try {
      const updates = { [field]: content }
      const updatedFirm = await updateLawFirm(lawFirm.id, updates)
      
      if (updatedFirm) {
        onUpdate(updates)
      }
    } catch (error) {
      console.error('Error updating law firm:', error)
    }
  }

  const getUserRoleById = (roleId?: string) => {
    if (!roleId) return null
    return userRoles.find(role => role.id === roleId)
  }

  return (
    <div className="h-full flex flex-col w-full">
      {/* Full-width page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 w-full">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-3"
            >
              <ArrowLeft size={20} />
              Back to Law Firms
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900">{lawFirm.name}</h2>
                {lawFirm.top_4 && (
                  <Star size={20} className="text-yellow-500 fill-current" />
                )}
              </div>
            </div>
            
            {/* Tags */}
            <div className="flex items-center gap-2">
              <span 
                className={getStructureTagStyles(lawFirm.structure).className}
                style={getStructureTagStyles(lawFirm.structure).style}
              >
                {lawFirm.structure === 'centralised' ? 'Centralised' : 'Decentralised'}
              </span>
            </div>
          </div>
          <CopyLinkButton entityType="law-firm" shortId={lawFirm.short_id || 0} />
        </div>
      </div>

      {/* Content with normal padding */}
      <div className="flex-1 overflow-y-auto w-full">
        <div className="w-full space-y-6 p-6">
        {/* Summary */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(107, 66, 209, 0.1)' }}>
          <Users size={20} style={{ color: '#6b42d1' }} />
        </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{firmStakeholders.length}</p>
                <p className="text-sm text-gray-600">Stakeholders</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 capitalize">{lawFirm.structure}</p>
                <p className="text-sm text-gray-600">Structure</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sections.map((section) => (
            <EditableContentSection
              key={section.field}
              title={section.title}
              initialContent={lawFirm[section.field] || ''}
              placeholder={section.placeholder}
              onSave={(content) => handleSaveSection(section.field, content)}
            />
          ))}
        </div>

        {/* Stakeholders */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Stakeholders ({firmStakeholders.length})
          </h3>
          
          {firmStakeholders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {firmStakeholders.map((stakeholder) => {
                const userRole = getUserRoleById(stakeholder.user_role_id)
                return (
                  <div 
                    key={stakeholder.id} 
                    className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => onSelectStakeholder?.(stakeholder, lawFirm)}
                  >
                    <StakeholderAvatar 
                      userRole={userRole}
                      size="lg"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{stakeholder.name}</p>
                      {userRole && (
                        <span 
                          className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full"
                          style={{ 
                            backgroundColor: `${userRole.colour}20`,
                            color: userRole.colour 
                          }}
                        >
                          {userRole.name}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No stakeholders associated with this law firm yet.</p>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}