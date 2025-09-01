import React, { useState, useEffect } from 'react'
import { ArrowLeft, Check, Plus, Trash2, ExternalLink, CheckCircle, ClipboardList, X, Tag } from 'lucide-react'
import { Button, IconButton, TextButton } from '../DesignSystem/components'
import { BlockNoteEditor } from '../DesignSystem/components/BlockNoteEditor'
import { htmlToBlockNoteBlocks, blockNoteBlocksToHtml, type BlockNoteBlock } from '../../utils/blocknoteConverters'
import { StakeholderAvatar } from '../common/StakeholderAvatar'
import { AddStakeholdersModal } from '../common/AddStakeholdersModal'
import { AddLinkModal } from '../common/AddLinkModal'
import { TagThemeCard } from '../common/TagThemeCard'
import { TaskForm, type TaskData } from '../common/TaskForm'
import { NoteTemplateSelectionModal } from './NoteTemplateSelectionModal'
import type { Stakeholder, UserRole, Theme, WorkspaceUser, UserPermission, LawFirm, NoteTemplate, Design } from '../../lib/supabase'

interface NoteLink {
  name: string
  url: string
}



interface NoteCreateFormProps {
  assignedStakeholders: Stakeholder[]
  allWorkspaceStakeholders: Stakeholder[]
  projectId: string
  projectAssignedStakeholderIds: string[]
  userRoles?: UserRole[]
  userPermissions?: UserPermission[]
  lawFirms?: LawFirm[]
  themes: Theme[]
  availableUsers?: WorkspaceUser[]
  noteTemplates: NoteTemplate[]
  onBack: () => void
  onAssignStakeholderToProject: (stakeholderId: string) => Promise<void>
  onThemeCreate: (theme: Theme) => void
  onCreate: (noteData: {
    name: string
    summary: string
    nativeNotes: string
    note_date: string
    stakeholderIds: string[]
    decision_text: string[]
    links: NoteLink[]
    tasks: TaskData[]
    themeIds: string[]
    summaryBlocks?: BlockNoteBlock[]
  }) => Promise<void>
}

export function NoteCreateForm({ 
  allWorkspaceStakeholders,
  projectId,
  userRoles, 
  userPermissions = [],
  lawFirms = [],
  themes,
  availableUsers = [],
  noteTemplates,
  onBack, 
  onThemeCreate,
  onCreate 
}: NoteCreateFormProps) {
  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [summaryBlocks, setSummaryBlocks] = useState<BlockNoteBlock[] | null>(null)
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedStakeholderIds, setSelectedStakeholderIds] = useState<string[]>([])
  const [decisionTexts, setDecisionTexts] = useState<string[]>([''])
  const [saving, setSaving] = useState(false)
  const [links, setLinks] = useState<NoteLink[]>([])
  const [showAddLinkModal, setShowAddLinkModal] = useState(false)
  const [tasks, setTasks] = useState<TaskData[]>([])
  const [showAddStakeholderModal, setShowAddStakeholderModal] = useState(false)
  const [selectedThemes, setSelectedThemes] = useState<Theme[]>([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  
  // Modal states
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [showTagThemeModal, setShowTagThemeModal] = useState(false)
  const [showAddDesignLinkModal, setShowAddDesignLinkModal] = useState(false)
  
  // Linked designs state
  const [linkedDesigns] = useState<Design[]>([])

  // Keep blocks in sync when summary HTML changes externally
  useEffect(() => {
    setSummaryBlocks(htmlToBlockNoteBlocks(summary))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) return
    
    setSaving(true)
    try {
      console.log('🔗 NoteCreateForm: Creating note with links:', links)
      // Use the blocks directly to preserve BlockNote structure
      const htmlSummary = summaryBlocks ? blockNoteBlocksToHtml(summaryBlocks) : summary
      await onCreate({
        name: name.trim(),
        summary: htmlSummary,
        nativeNotes: '',
        note_date: noteDate,
        stakeholderIds: selectedStakeholderIds,
        decision_text: decisionTexts.filter(decision => decision.trim() !== ''),
        links: links,
        tasks: tasks,
        themeIds: selectedThemes.map(theme => theme.id),
        summaryBlocks: summaryBlocks || undefined
      })
      // After successful creation, go back to the notes dashboard
      onBack()
    } catch (error) {
      console.error('Error creating note:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleThemeAdd = (theme: Theme) => {
    if (!selectedThemes.some(t => t.id === theme.id)) {
      setSelectedThemes([...selectedThemes, theme])
    }
  }

  const handleThemeRemove = (themeId: string) => {
    setSelectedThemes(selectedThemes.filter(theme => theme.id !== themeId))
  }

  const handleTemplateSelected = (templateBody: string) => {
    if (templateBody.trim()) {
      // Add template content to existing summary with proper separation
      const separator = summary.trim() ? '<br><br>' : ''
      const nextHtml = summary + separator + templateBody
      setSummary(nextHtml)
      setSummaryBlocks(htmlToBlockNoteBlocks(nextHtml))
    }
  }

  const toggleStakeholder = (stakeholderId: string) => {
    setSelectedStakeholderIds(prev =>
      prev.includes(stakeholderId)
        ? prev.filter(id => id !== stakeholderId)
        : [...prev, stakeholderId]
    )
  }

  const addDecision = () => {
    setDecisionTexts([...decisionTexts, ''])
  }

  const removeDecision = (index: number) => {
    if (decisionTexts.length > 1) {
      setDecisionTexts(decisionTexts.filter((_, i) => i !== index))
    }
  }

  const updateDecision = (index: number, value: string) => {
    const newValues = [...decisionTexts]
    newValues[index] = value
    setDecisionTexts(newValues)
  }

  const handleSaveLink = async (name: string, url: string) => {
    const newLink: NoteLink = { name, url }
    setLinks([...links, newLink])
    console.log('🔗 NoteCreateForm: Added link to state:', newLink)
    console.log('🔗 NoteCreateForm: Current links array:', [...links, newLink])
    setShowAddLinkModal(false)
  }

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index))
    console.log('🔗 NoteCreateForm: Removed link at index:', index)
  }

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index))
  }

  const handleCreateTaskFromModal = async (taskData: TaskData) => {
    try {
      setTasks([...tasks, { ...taskData }])
      setShowCreateTaskModal(false)
    } catch (error) {
      console.error('Error creating task:', error)
      throw error
    }
  }

  const handleSaveStakeholderSelection = async (stakeholderIds: string[]) => {
    try {
      // Update the selected stakeholders for the note
      setSelectedStakeholderIds(stakeholderIds)
    } catch (error) {
      console.error('Error adding stakeholders to note:', error)
      throw error
    }
  }

  return (
    <div className="h-full flex flex-col w-full">
      <div className="bg-white border-b border-gray-200 p-6 -mx-6 -mt-6 mb-6">
        <TextButton
          onClick={onBack}
          icon={ArrowLeft}
          className="mb-4"
        >
          Back to Notes & Calls
        </TextButton>
        
        <h1 className="text-2xl font-bold text-gray-900">Create New Note</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Note Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter note name..."
                required
              />
            </div>

            <div>
              <label htmlFor="noteDate" className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="noteDate"
                  value={noteDate}
                  onChange={(e) => setNoteDate(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {noteDate && (
                  <IconButton
                    icon={X}
                    size="small"
                    variant="ghost"
                    onClick={() => setNoteDate('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">

          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
                <Button
                  variant="ghost"
                  size="small"
                  icon={Plus}
                  onClick={() => setShowTemplateModal(true)}
                  className="text-blue-600 hover:bg-blue-50"
                >
                  Add Note Template
                </Button>
              </div>
              <BlockNoteEditor
                initialContent={summaryBlocks || htmlToBlockNoteBlocks(summary)}
                onChange={(blocks) => {
                  setSummaryBlocks(blocks)
                  // Convert blocks to HTML for the summary state (for backward compatibility)
                  setSummary(blockNoteBlocksToHtml(blocks))
                }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Decisions ({decisionTexts.filter(d => d.trim() !== '').length})
            </h2>
          </div>
          
          <div className="space-y-3">
            {decisionTexts.map((decision, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={decision}
                  onChange={(e) => updateDecision(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter decision..."
                />
                {decisionTexts.length > 1 && (
                  <IconButton
                    icon={Trash2}
                    size="small"
                    variant="ghost"
                    onClick={() => removeDecision(index)}
                    className="text-red-600 hover:bg-red-50"
                  />
                )}
              </div>
            ))}
            
            <Button
              variant="ghost"
              icon={Plus}
              onClick={addDecision}
              className="text-blue-600 hover:bg-blue-50"
            >
              Add Decision
            </Button>
          </div>
        </div>

        {tasks.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Associated Tasks ({tasks.length})
              </h2>
            </div>
            
            {/* Task List */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Tasks to be created:</h3>
              {tasks.map((task, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900">{task.name}</h4>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                          task.status === 'complete' 
                            ? 'bg-green-100 text-green-700'
                            : task.status === 'no_longer_required'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {task.status === 'not_complete' ? 'Not Complete' : 
                           task.status === 'complete' ? 'Complete' : 'No Longer Required'}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-600">{task.description}</p>
                      )}
                      {task.assignedToUserId && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">Assigned to: </span>
                          <span className="text-xs font-medium text-blue-600">
                            {availableUsers.find(u => u.user_id === task.assignedToUserId)?.user_email || 'Unknown User'}
                          </span>
                        </div>
                      )}
                    </div>
                    <IconButton
                      icon={Trash2}
                      size="small"
                      variant="ghost"
                      onClick={() => removeTask(index)}
                      className="text-red-600 hover:bg-red-50"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedThemes.length > 0 && (
          <TagThemeCard
            availableThemes={themes}
            selectedThemes={selectedThemes}
            onThemeAdd={handleThemeAdd}
            onThemeRemove={handleThemeRemove}
            onThemeCreate={onThemeCreate}
          />
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
            Tagged Stakeholders ({selectedStakeholderIds.length})
            </h2>
            <Button
              variant="ghost"
              size="small"
              icon={Plus}
              onClick={() => setShowAddStakeholderModal(true)}
              className="text-blue-600 hover:bg-blue-50"
            >
              Add Stakeholders
            </Button>
          </div>
          
          <div className="space-y-2 overflow-y-auto">
            {allWorkspaceStakeholders
              .filter(stakeholder => selectedStakeholderIds.includes(stakeholder.id))
              .map(stakeholder => {
                const userRole = userRoles?.find(role => role.id === stakeholder.user_role_id)
                
                return (
                  <div
                    key={stakeholder.id}
                    className="p-3 border border-blue-500 bg-blue-50 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <StakeholderAvatar userRole={userRole} size="md" />
                        <div className="font-medium text-gray-900">{stakeholder.name}</div>
                      </div>
                      
                      <IconButton
                        icon={X}
                        size="small"
                        variant="ghost"
                        onClick={() => toggleStakeholder(stakeholder.id)}
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {links.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Links ({links.length})
            </h2>
            
            <div className="space-y-3 mb-4">
              {links.map((link, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => window.open(link.url.startsWith('http') ? link.url : `https://${link.url}`, '_blank', 'noopener,noreferrer')}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <ExternalLink className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{link.name}</p>
                      <p className="text-sm text-gray-600 truncate max-w-md">{link.url}</p>
                    </div>
                  </div>
                  
                  <IconButton
                    icon={Trash2}
                    size="small"
                    variant="ghost"
                    onClick={() => handleRemoveLink(index)}
                    className="text-red-600 hover:bg-red-50"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unified Action Buttons Row */}
        {(links.length === 0 || tasks.length === 0 || linkedDesigns.length === 0 || selectedThemes.length === 0) && (
         
            
            <div className="flex items-center gap-4 flex-wrap">
              {links.length === 0 && (
                <Button
                  variant="primary"
                  icon={Plus}
                  onClick={() => setShowAddLinkModal(true)}
                  disabled={saving}
                >
                  Add Link
                </Button>
              )}
              
              {tasks.length === 0 && (
                <Button
                  variant="primary"
                  icon={Plus}
                  onClick={() => setShowCreateTaskModal(true)}
                  disabled={saving}
                >
                  Create Tasks
                </Button>
              )}

              {linkedDesigns.length === 0 && (
                <Button
                  variant="primary"
                  icon={Plus}
                  onClick={() => setShowAddDesignLinkModal(true)}
                  disabled={saving}
                >
                  Add Design Link
                </Button>
              )}

              {selectedThemes.length === 0 && (
                <Button
                  variant="primary"
                  icon={Tag}
                  onClick={() => setShowTagThemeModal(true)}
                  disabled={saving}
                >
                  Tag Theme
                </Button>
              )}
            </div>
        
        )}

   
          <div className="flex items-center justify-end space-x-3 pb-6">
            <Button
              variant="ghost"
              onClick={onBack}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={Check}
              disabled={saving || !name.trim()}
              loading={saving}
            >
              {saving ? 'Creating...' : 'Create Note'}
            </Button>
          </div>
  
      </form>

      <AddStakeholdersModal
        isOpen={showAddStakeholderModal}
        onClose={() => setShowAddStakeholderModal(false)}
        allWorkspaceStakeholders={allWorkspaceStakeholders}
        userRoles={userRoles || []}
        lawFirms={lawFirms}
        userPermissions={userPermissions}
        initialSelectedStakeholderIds={selectedStakeholderIds}
        onSaveSelection={handleSaveStakeholderSelection}
        title="Add Stakeholders to Note"
      />

      <NoteTemplateSelectionModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        noteTemplates={noteTemplates}
        onSelectTemplate={handleTemplateSelected}
      />

      <AddLinkModal
        isOpen={showAddLinkModal}
        onClose={() => setShowAddLinkModal(false)}
        onSaveLink={handleSaveLink}
      />

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Task</h3>
              <IconButton
                icon={X}
                variant="ghost"
                onClick={() => setShowCreateTaskModal(false)}
                className="text-gray-500 hover:bg-gray-100"
              />
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
              <TaskForm
                availableUsers={availableUsers}
                initialTaskData={{ projectId: projectId }}
                onSubmit={handleCreateTaskFromModal}
                onCancel={() => setShowCreateTaskModal(false)}
                loading={saving}
                isEditing={false}
                isInsideModal={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tag Theme Modal */}
      {showTagThemeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Tag Theme</h3>
              <IconButton
                icon={X}
                variant="ghost"
                onClick={() => setShowTagThemeModal(false)}
                className="text-gray-500 hover:bg-gray-100"
              />
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              <TagThemeCard
                availableThemes={themes}
                selectedThemes={selectedThemes}
                onThemeAdd={handleThemeAdd}
                onThemeRemove={handleThemeRemove}
                onThemeCreate={onThemeCreate}
                className="border-0 shadow-none p-0"
              />
            </div>
            
            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <Button
                variant="ghost"
                onClick={() => setShowTagThemeModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowTagThemeModal(false)}
                disabled={saving}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Design Link Modal - Placeholder for now */}
      {showAddDesignLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Design Link</h3>
              <IconButton
                icon={X}
                variant="ghost"
                onClick={() => setShowAddDesignLinkModal(false)}
                className="text-gray-500 hover:bg-gray-100"
              />
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
              <p className="text-gray-600 mb-4">Design linking functionality will be available after note creation.</p>
              <Button
                variant="primary"
                onClick={() => setShowAddDesignLinkModal(false)}
                fullWidth
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}