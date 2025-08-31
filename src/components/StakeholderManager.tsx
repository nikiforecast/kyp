import React, { useState, useEffect } from 'react'
import { Users, Plus, Upload, FileText, X } from 'lucide-react'
import { Button } from './DesignSystem'
import type { Stakeholder, UserRole, LawFirm } from '../lib/supabase'
import { StakeholderDetail } from './StakeholderDetail'
import { StakeholderFilters } from './StakeholderManager/StakeholderFilters'
import { StakeholderForm } from './StakeholderManager/StakeholderForm'
import { StakeholderTable } from './StakeholderManager/StakeholderTable'

interface StakeholderManagerProps {
  stakeholders: Stakeholder[]
  userRoles: UserRole[]
  lawFirms: LawFirm[]
  userPermissions: UserPermission[]
  stakeholderNotesCountMap: Record<string, number>
  onCreateStakeholder: (name: string, userRoleId?: string, lawFirmId?: string, userPermissionId?: string, visitorId?: string, department?: string, pendoRole?: string) => Promise<void>
  onUpdateStakeholder: (stakeholderId: string, updates: { name?: string; user_role_id?: string; law_firm_id?: string; user_permission_id?: string; notes?: string; visitor_id?: string; department?: string; pendo_role?: string }) => Promise<void>
  onDeleteStakeholder: (stakeholderId: string) => Promise<void>
  onImportStakeholdersCSV?: (csvData: string) => Promise<{ success: number, errors: string[] }>
  onSelectStakeholder?: (stakeholder: Stakeholder) => void
}

export function StakeholderManager({ 
  stakeholders = [], 
  userRoles = [],
  lawFirms = [],
  userPermissions = [],
  stakeholderNotesCountMap,
  onCreateStakeholder, 
  onUpdateStakeholder, 
  onDeleteStakeholder,
  onImportStakeholdersCSV,
  onSelectStakeholder
}: StakeholderManagerProps) {
  const [showStakeholderForm, setShowStakeholderForm] = useState(false)
  const [editingStakeholder, setEditingStakeholder] = useState<Stakeholder | null>(null)
  const [newStakeholder, setNewStakeholder] = useState({ 
    name: '', 
    user_role_id: '', 
    law_firm_id: '', 
    user_permission_id: '',
    visitor_id: '',
    department: '',
    pendo_role: ''
  })
  const [creatingStakeholder, setCreatingStakeholder] = useState(false)
  const [updatingStakeholder, setUpdatingStakeholder] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [structureFilter, setStructureFilter] = useState('')
  const [userPermissionFilter, setUserPermissionFilter] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [importResults, setImportResults] = useState<{ success: number, errors: string[] } | null>(null)
  const [selectedStakeholders, setSelectedStakeholders] = useState<string[]>([])
  const [uploadingCSV, setUploadingCSV] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Check for filter from navigation on component mount
  useEffect(() => {
    const filterUserRole = localStorage.getItem('stakeholder_filter_user_role')
    const filterUserPermission = localStorage.getItem('stakeholder_filter_user_permission')
    if (filterUserRole) {
      setUserRoleFilter(filterUserRole)
      // Clear the filter from localStorage after applying it
      localStorage.removeItem('stakeholder_filter_user_role')
    }
    if (filterUserPermission) {
      setUserPermissionFilter(filterUserPermission)
      // Clear the filter from localStorage after applying it
      localStorage.removeItem('stakeholder_filter_user_permission')
    }
  }, [])

  const handleCreateStakeholder = async (e: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault()
    }
    setCreatingStakeholder(true)
    
    try {
      await onCreateStakeholder(
        newStakeholder.name, 
        newStakeholder.user_role_id || undefined,
        newStakeholder.law_firm_id || undefined,
        newStakeholder.user_permission_id || undefined,
        newStakeholder.visitor_id || undefined,
        newStakeholder.department || undefined,
        newStakeholder.pendo_role || undefined
      )
      setNewStakeholder({ 
        name: '', 
        user_role_id: '', 
        law_firm_id: '', 
        user_permission_id: '',
        visitor_id: '',
        department: '',
        pendo_role: ''
      })
      setShowStakeholderForm(false)
    } catch (error) {
      console.error('Error creating stakeholder:', error)
    } finally {
      setCreatingStakeholder(false)
    }
  }

  const handleUpdateStakeholder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStakeholder) return
    
    setUpdatingStakeholder(true)
    
    try {
      await onUpdateStakeholder(editingStakeholder.id, {
        name: editingStakeholder.name,
        user_role_id: editingStakeholder.user_role_id || undefined,
        law_firm_id: editingStakeholder.law_firm_id || undefined,
        user_permission_id: editingStakeholder.user_permission_id || undefined,
        visitor_id: editingStakeholder.visitor_id || undefined,
        department: editingStakeholder.department || undefined,
        pendo_role: editingStakeholder.pendo_role || undefined
      })
      setEditingStakeholder(null)
    } catch (error) {
      console.error('Error updating stakeholder:', error)
    } finally {
      setUpdatingStakeholder(false)
    }
  }

  const handleBulkDelete = async (stakeholderIds: string[]) => {
    try {
      // Delete all selected stakeholders
      await Promise.all(stakeholderIds.map(id => onDeleteStakeholder(id)))
      // Clear selection after successful deletion
      setSelectedStakeholders([])
    } catch (error) {
      console.error('Error during bulk delete:', error)
    }
  }

  const handleDeleteStakeholder = async (stakeholderId: string) => {
    if (window.confirm('Are you sure you want to delete this stakeholder?')) {
      await onDeleteStakeholder(stakeholderId)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !onImportStakeholdersCSV) return

    setUploadingCSV(true)
    setUploadProgress(0)
    setImportResults(null)

    const reader = new FileReader()
    
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 50) // File reading is 50% of progress
        setUploadProgress(progress)
      }
    }
    
    reader.onload = async (e) => {
      const csvData = e.target?.result as string
      setUploadProgress(50) // File reading complete, now processing
      
      const results = await onImportStakeholdersCSV(csvData)
      setUploadProgress(100) // Processing complete
      setImportResults(results)
      setUploadingCSV(false)
      
      // Reset progress after a short delay
      setTimeout(() => setUploadProgress(0), 1000)
    }
    
    reader.onerror = () => {
      setUploadingCSV(false)
      setUploadProgress(0)
    }
    
    reader.readAsText(file)
  }

  const getUserRoleById = (roleId?: string) => {
    if (!roleId) return null
    return userRoles.find(role => role.id === roleId)
  }

  const getUserPermissionById = (permissionId?: string) => {
    if (!permissionId) return null
    return userPermissions.find(permission => permission.id === permissionId)
  }

  const getLawFirmById = (firmId?: string) => {
    if (!firmId) return null
    return lawFirms.find(firm => firm.id === firmId)
  }

  const filteredStakeholders = stakeholders.filter(stakeholder => {
    const userRole = getUserRoleById(stakeholder.user_role_id)
    const userPermission = getUserPermissionById(stakeholder.user_permission_id)
    const lawFirm = getLawFirmById(stakeholder.law_firm_id)
    
    // Search filter
    const matchesSearch = stakeholder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userRole?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userPermission?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lawFirm?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    // User role filter
    const matchesUserRole = !userRoleFilter || stakeholder.user_role_id === userRoleFilter
    
    // User permission filter
    const matchesUserPermission = !userPermissionFilter || stakeholder.user_permission_id === userPermissionFilter
    
    // Structure filter
    const matchesStructure = !structureFilter || lawFirm?.structure === structureFilter
    
    return matchesSearch && matchesUserRole && matchesUserPermission && matchesStructure
  })

  const handleRowClick = (stakeholder: Stakeholder) => {
    if (onSelectStakeholder) {
      onSelectStakeholder(stakeholder)
    }
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Stakeholders</h2>
          <p className="text-gray-600">Manage stakeholders and their roles within your workspace</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowImportModal(true)}
            variant="secondary"
            icon={Upload}
          >
            Import CSV
          </Button>
          <Button
            onClick={() => setShowStakeholderForm(true)}
            variant="primary"
            icon={Plus}
          >
            Create Stakeholder
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <StakeholderFilters
        searchTerm={searchTerm}
        userRoleFilter={userRoleFilter}
        userPermissionFilter={userPermissionFilter}
        structureFilter={structureFilter}
        userRoles={userRoles}
        userPermissions={userPermissions}
        onSearchChange={setSearchTerm}
        onUserRoleFilterChange={setUserRoleFilter}
        onUserPermissionFilterChange={setUserPermissionFilter}
        onStructureFilterChange={setStructureFilter}
      />

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Import Stakeholders from CSV</h3>
              <Button
                onClick={() => {
                  setShowImportModal(false)
                  setImportResults(null)
                }}
                variant="ghost"
                size="small"
                className="text-gray-500"
              >
                <X size={20} />
              </Button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Upload Progress */}
              {uploadingCSV && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">
                      {uploadProgress < 50 ? 'Reading file...' : 'Processing stakeholders...'}
                    </span>
                    <span className="text-sm text-blue-700">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Import Results */}
              {importResults && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Import Results</h4>
                  <div className="space-y-2">
                    <p className="text-green-600">✓ Successfully imported {importResults.success} stakeholders</p>
                    {importResults.errors.length > 0 && (
                      <div>
                        <p className="text-red-600 mb-2">⚠ {importResults.errors.length} errors occurred:</p>
                        <ul className="text-sm text-red-600 space-y-1 ml-4 max-h-32 overflow-y-auto">
                          {importResults.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => {
                      setImportResults(null)
                      setShowImportModal(false)
                    }}
                    variant="primary"
                  >
                    Close
                  </Button>
                </div>
              )}

              {!importResults && !uploadingCSV && (
                <>
                  {/* Instructions */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">CSV Format Requirements</h4>
                    <p className="text-gray-600 mb-4">
                      Your CSV file should contain the following columns in this exact order. If any cell is blank, that field will not be updated for the stakeholder:
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-20 text-gray-500 font-mono">Column 1:</span>
                          <span className="font-medium">Visitor ID</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-20 text-gray-500 font-mono">Column 2:</span>
                          <span className="font-medium">Law Firm ID</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-20 text-gray-500 font-mono">Column 3:</span>
                          <span className="font-medium">Name</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-20 text-gray-500 font-mono">Column 4:</span>
                          <span className="font-medium">Department</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-20 text-gray-500 font-mono">Column 5:</span>
                          <span className="font-medium">Pendo Role</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-20 text-gray-500 font-mono">Column 6:</span>
                          <span className="font-medium">Law Firm Name</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-20 text-gray-500 font-mono">Column 7:</span>
                          <span className="font-medium">User Role (optional)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-20 text-gray-500 font-mono">Column 8:</span>
                          <span className="font-medium">User Permission (TRUE/FALSE)</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800 text-sm">
                        <strong>Notes:</strong>
                      </p>
                      <ul className="text-blue-800 text-sm mt-2 space-y-1 list-disc list-inside">
                        <li>If a stakeholder with the same Visitor ID and Law Firm ID already exists, no duplicate will be created</li>
                        <li>The system will automatically match Law Firm Names and User Roles to existing records</li>
                        <li>If a Law Firm or User Role doesn't exist, it will be created automatically</li>
                        <li>For User Permission: 'TRUE' = Administrator, 'FALSE' = General User (case-insensitive)</li>
                        <li>If User Role or User Permission cells are blank, those fields will not be set for the stakeholder</li>
                      </ul>
                    </div>
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-amber-800 text-sm">
                        <strong>Example CSV row:</strong><br/>
                        <code className="font-mono text-xs bg-white px-1 py-0.5 rounded">visitor123,firm456,John Doe,Legal,Senior,Acme Law,Partner,TRUE</code>
                      </p>
                    </div>
                  </div>

                  {/* File Upload */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Upload CSV File</h4>
                    <p className="text-gray-600 mb-4">Select a CSV file to import stakeholders</p>
                    <label className="cursor-pointer">
                      <Button
                        variant="primary"
                        icon={Upload}
                        disabled={uploadingCSV}
                        className="cursor-pointer"
                      >
                        Choose CSV File
                      </Button>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploadingCSV}
                      />
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Stakeholder Form */}
      <StakeholderForm
        isVisible={showStakeholderForm}
        isEditing={false}
        stakeholder={newStakeholder}
        userRoles={userRoles}
        lawFirms={lawFirms}
        userPermissions={userPermissions}
        stakeholderNotesCountMap={stakeholderNotesCountMap}
        loading={creatingStakeholder}
        onSubmit={handleCreateStakeholder}
        onChange={(updates) => setNewStakeholder({ ...newStakeholder, ...updates })}
        onCancel={() => setShowStakeholderForm(false)}
      />

      {/* Edit Stakeholder Form */}
      {editingStakeholder && (
        <StakeholderForm
          isVisible={true}
          isEditing={true}
          stakeholder={{
            name: editingStakeholder.name,
            user_role_id: editingStakeholder.user_role_id || '',
            law_firm_id: editingStakeholder.law_firm_id || '',
            user_permission_id: editingStakeholder.user_permission_id || '',
            visitor_id: editingStakeholder.visitor_id || '',
            department: editingStakeholder.department || '',
            pendo_role: editingStakeholder.pendo_role || ''
          }}
          userRoles={userRoles}
          lawFirms={lawFirms}
          userPermissions={userPermissions}
          loading={updatingStakeholder}
          onSubmit={handleUpdateStakeholder}
          onChange={(updates) => setEditingStakeholder({ 
            ...editingStakeholder, 
            ...updates
          })}
          onCancel={() => setEditingStakeholder(null)}
        />
      )}

      {/* Stakeholders Table */}
      {filteredStakeholders.length === 0 && stakeholders.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12">
          <div className="text-center">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No stakeholders match your current filters.</p>
          </div>
        </div>
      ) : (
        <StakeholderTable
          stakeholders={filteredStakeholders}
          userRoles={userRoles}
          lawFirms={lawFirms}
          userPermissions={userPermissions}
          stakeholderNotesCountMap={stakeholderNotesCountMap}
          selectedStakeholders={selectedStakeholders}
          onRowClick={handleRowClick}
          onEdit={setEditingStakeholder}
          onDelete={handleDeleteStakeholder}
          onBulkDelete={handleBulkDelete}
          onSelectionChange={setSelectedStakeholders}
        />
      )}

      {stakeholders.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12">
          <div className="text-center">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No stakeholders yet. Add stakeholders to organize your team!</p>
          </div>
        </div>
      )}
    </div>
  )
}