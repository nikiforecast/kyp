import React, { useState, useEffect } from 'react'
import { Plus, Upload, Trash2, Shield, Star, Building2, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from './DesignSystem/components'
import { LawFirmForm } from './LawFirmManager/LawFirmForm'
import { LawFirmFilters } from './LawFirmManager/LawFirmFilters'
import { EditColumnsModal } from './LawFirmManager/EditColumnsModal'
import { DataTable, Column } from './DesignSystem/components/DataTable'
import { ConfirmModal } from './DesignSystem/components/Modal'
import { LoadingState } from './DesignSystem/components/LoadingSpinner'
import type { LawFirm } from '../lib/supabase'
import { getCurrentUserRole } from '../lib/database'
import { getStructureTagStyles } from '../utils/structureTagStyles'
import { getWorkspaces } from '../lib/database'
import { getLawFirmCustomColumns, getLawFirmCustomValues, type LawFirmCustomColumn } from '../lib/database/services/lawFirmCustomColumnService'
import type { Stakeholder, UserRole } from '../lib/supabase'

interface LawFirmManagerProps {
  lawFirms: LawFirm[]
  stakeholders?: Stakeholder[]
  userRoles?: UserRole[]
  loading?: boolean
  onCreateLawFirm: (name: string, structure: 'centralised' | 'decentralised', status: 'active' | 'inactive') => Promise<LawFirm | null>
  onUpdateLawFirm: (id: string, updates: Partial<Omit<LawFirm, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>>) => Promise<LawFirm | null>
  onDeleteLawFirm: (id: string) => Promise<void>
  onImportCSV: (csvData: string) => Promise<{ success: number, errors: string[] }>
  onDeleteAll: () => Promise<void>
  onSelectStakeholder?: (stakeholder: Stakeholder, lawFirm: LawFirm) => void
}

export function LawFirmManager({ 
  lawFirms, 
  stakeholders = [],
  userRoles = [],
  loading = false,
  onCreateLawFirm, 
  onUpdateLawFirm, 
  onDeleteLawFirm,
  onImportCSV,
  onDeleteAll,
  onSelectStakeholder
}: LawFirmManagerProps) {
  const navigate = useNavigate()
  const [showLawFirmForm, setShowLawFirmForm] = useState(false)
  const [editingLawFirm, setEditingLawFirm] = useState<LawFirm | null>(null)
  const [newLawFirm, setNewLawFirm] = useState({ 
    name: '', 
    structure: 'decentralised' as 'centralised' | 'decentralised',
    status: 'active' as 'active' | 'inactive',
    top_4: false
  })
  const [creatingLawFirm, setCreatingLawFirm] = useState(false)
  const [updatingLawFirm, setUpdatingLawFirm] = useState(false)
  const [importResults, setImportResults] = useState<{ success: number, errors: string[] } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [structureFilter, setStructureFilter] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [selectedLawFirms, setSelectedLawFirms] = useState<string[]>([])
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [showEditColumnsModal, setShowEditColumnsModal] = useState(false)
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [isOwner, setIsOwner] = useState(false)
  const [customValues, setCustomValues] = useState<Record<string, boolean | string>>({})
  const [editingCustomValues, setEditingCustomValues] = useState<Record<string, boolean | string>>({})
  const [customColumns, setCustomColumns] = useState<LawFirmCustomColumn[]>([])
  const [lawFirmCustomValuesMap, setLawFirmCustomValuesMap] = useState<Record<string, Record<string, boolean | string>>>({})

  // Load user role and workspace on component mount
  React.useEffect(() => {
    const loadUserRole = async () => {
      const role = await getCurrentUserRole()
      setUserRole(role)
      setIsOwner(role === 'owner')
    }
    loadUserRole()
  }, [])

  useEffect(() => {
    const loadWorkspace = async () => {
      const workspaces = await getWorkspaces()
      if (workspaces.length > 0) {
        const wsId = workspaces[0].id
        setWorkspaceId(wsId)
        // Load custom columns and clean up duplicates
        const columns = await getLawFirmCustomColumns(wsId)
        
        // Clean up duplicate top_4 entries
        const { supabase, isSupabaseConfigured } = await import('../lib/supabase')
        if (isSupabaseConfigured && supabase) {
          const top4Columns = columns.filter(c => 
            c.column_key === 'top_4' || 
            c.column_name.toLowerCase() === 'top 4' ||
            c.column_name === 'Top 4'
          )
          
          if (top4Columns.length > 1) {
            // Keep only one with column_key='top_4', delete the rest
            const correctTop4 = top4Columns.find(c => c.column_key === 'top_4') || top4Columns[0]
            const duplicatesToDelete = top4Columns.filter(c => c.id !== correctTop4.id)
            
            for (const duplicate of duplicatesToDelete) {
              try {
                await supabase
                  .from('law_firm_custom_columns')
                  .delete()
                  .eq('id', duplicate.id)
              } catch (error) {
                console.error(`Error deleting duplicate top_4 column:`, error)
              }
            }
            
            // Reload columns after cleanup
            const { data: reloadedColumns } = await supabase
              .from('law_firm_custom_columns')
              .select('*')
              .eq('workspace_id', wsId)
              .order('display_order', { ascending: true })
            
            if (reloadedColumns) {
              // Keep only one top_4 entry, filter out duplicates but keep the one with column_key='top_4'
              const top4Entry = reloadedColumns.find((col: LawFirmCustomColumn) => col.column_key === 'top_4')
              const otherColumns = reloadedColumns.filter((col: LawFirmCustomColumn) => 
                col.column_key !== 'top_4' && 
                col.column_name.toLowerCase() !== 'top 4' &&
                col.column_name !== 'Top 4'
              )
              // Include top_4 entry if it exists, otherwise it will be created by EditColumnsModal
              setCustomColumns(top4Entry ? [top4Entry, ...otherColumns] : otherColumns)
              return
            }
          }
        }
        
        // Keep only one top_4 entry if it exists
        const top4Entry = columns.find(col => col.column_key === 'top_4')
        const otherColumns = columns.filter(col => 
          (col.column_key !== 'top_4' && 
           col.column_name.toLowerCase() !== 'top 4' &&
           col.column_name !== 'Top 4') ||
          col.column_key === 'top_4'
        )
        // Remove duplicates - keep only the one with column_key='top_4'
        const uniqueColumns = top4Entry 
          ? [top4Entry, ...otherColumns.filter(col => col.column_key !== 'top_4')]
          : otherColumns.filter(col => col.column_key !== 'top_4')
        setCustomColumns(uniqueColumns)
      }
    }
    loadWorkspace()
  }, [])

  // Load custom values for all law firms
  useEffect(() => {
    const loadCustomValues = async () => {
      if (lawFirms.length === 0) return
      
      const valuesMap: Record<string, Record<string, boolean | string>> = {}
      for (const firm of lawFirms) {
        const values = await getLawFirmCustomValues(firm.id)
        if (values) {
          valuesMap[firm.id] = values
        }
      }
      setLawFirmCustomValuesMap(valuesMap)
    }
    loadCustomValues()
  }, [lawFirms])

  // Load custom values when editing a law firm
  useEffect(() => {
    const loadEditingCustomValues = async () => {
      if (editingLawFirm?.id) {
        const values = await getLawFirmCustomValues(editingLawFirm.id)
        if (values) {
          setEditingCustomValues(values)
        } else {
          setEditingCustomValues({})
        }
      } else {
        setEditingCustomValues({})
      }
    }
    loadEditingCustomValues()
  }, [editingLawFirm?.id])

  const handleCreateLawFirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingLawFirm(true)
    
    try {
      const createdFirm = await onCreateLawFirm(newLawFirm.name, newLawFirm.structure, newLawFirm.status)
      // Save custom values after law firm is created
      if (createdFirm && workspaceId && Object.keys(customValues).length > 0) {
        const { setLawFirmCustomValues } = await import('../lib/database/services/lawFirmCustomColumnService')
        await setLawFirmCustomValues(createdFirm.id, workspaceId, customValues)
        // Reload custom values map
        const values = await import('../lib/database/services/lawFirmCustomColumnService')
        const updatedValues = await values.getLawFirmCustomValues(createdFirm.id)
        if (updatedValues) {
          setLawFirmCustomValuesMap(prev => ({ ...prev, [createdFirm.id]: updatedValues }))
        }
      }
      setNewLawFirm({ name: '', structure: 'decentralised', status: 'active', top_4: false })
      setCustomValues({})
      setShowLawFirmForm(false)
    } catch (error) {
      console.error('Error creating law firm:', error)
    } finally {
      setCreatingLawFirm(false)
    }
  }

  const handleUpdateLawFirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLawFirm) return
    
    setUpdatingLawFirm(true)
    
    try {
      const updatedFirm = await onUpdateLawFirm(editingLawFirm.id, {
        name: editingLawFirm.name,
        structure: editingLawFirm.structure,
        status: editingLawFirm.status,
        top_4: editingLawFirm.top_4
      })
      // Save custom values after law firm is updated
      if (updatedFirm && workspaceId && Object.keys(editingCustomValues).length > 0) {
        const { setLawFirmCustomValues } = await import('../lib/database/services/lawFirmCustomColumnService')
        await setLawFirmCustomValues(editingLawFirm.id, workspaceId, editingCustomValues)
        // Update custom values map
        setLawFirmCustomValuesMap(prev => ({ ...prev, [editingLawFirm.id]: editingCustomValues }))
      }
      setEditingLawFirm(null)
      setEditingCustomValues({})
    } catch (error) {
      console.error('Error updating law firm:', error)
    } finally {
      setUpdatingLawFirm(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const csvData = e.target?.result as string
      const results = await onImportCSV(csvData)
      setImportResults(results)
    }
    reader.readAsText(file)
  }



  const handleBulkDelete = async () => {
    if (selectedLawFirms.length === 0) return
    
    try {
      // Delete each selected law firm
      for (const id of selectedLawFirms) {
        await onDeleteLawFirm(id)
      }
      setSelectedLawFirms([])
      setShowBulkDeleteModal(false)
    } catch (error) {
      console.error('Error deleting law firms:', error)
    }
  }

  const handleRowClick = (firm: LawFirm) => {
    navigate(`/law-firm/${firm.short_id}`)
  }

  const filteredLawFirms = lawFirms.filter(firm => {
    const matchesSearch = firm.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStructure = !structureFilter || firm.structure === structureFilter
    return matchesSearch && matchesStructure
  })

  // Calculate filter counts
  const centralisedCount = lawFirms.filter(firm => 
    firm.structure === 'centralised' && 
    firm.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).length
  
  const decentralisedCount = lawFirms.filter(firm => 
    firm.structure === 'decentralised' && 
    firm.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).length
  
  const totalCount = lawFirms.filter(firm => 
    firm.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).length

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <LoadingState message="Loading accounts..." size="lg" />
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accounts</h2>
          <p className="text-gray-600">Manage accounts and their organizational structure</p>
        </div>
        <div className="flex items-center gap-3">
          {isOwner && (
            <Button
              variant="outline"
              icon={Settings}
              onClick={() => setShowEditColumnsModal(true)}
            >
              Edit Columns
            </Button>
          )}
          <label className="cursor-pointer">
            <Button
              variant="secondary"
              icon={Upload}
              className="bg-green-600 hover:bg-green-700"
            >
              Import CSV
            </Button>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setShowLawFirmForm(true)}
          >
            Add Account
          </Button>
        </div>
      </div>

      {/* Import Results */}
      {importResults && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Results</h3>
          <div className="space-y-2">
            <p className="text-green-600">✓ Successfully imported {importResults.success} accounts</p>
            {importResults.errors.length > 0 && (
              <div>
                <p className="text-red-600 mb-2">⚠ {importResults.errors.length} errors occurred:</p>
                <ul className="text-sm text-red-600 space-y-1 ml-4">
                  {importResults.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button
            onClick={() => setImportResults(null)}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
          >
            Close
          </button>
        </div>
      )}

      <LawFirmFilters
        searchTerm={searchTerm}
        structureFilter={structureFilter}
        totalCount={totalCount}
        centralisedCount={centralisedCount}
        decentralisedCount={decentralisedCount}
        onSearchChange={setSearchTerm}
        onStructureFilterChange={setStructureFilter}
      />

      {/* Create Law Firm Modal */}
      <LawFirmForm
        isOpen={showLawFirmForm}
        isEditing={false}
        workspaceId={workspaceId}
        lawFirm={newLawFirm}
        customValues={customValues}
        loading={creatingLawFirm}
        onUpdate={(updates) => setNewLawFirm({ ...newLawFirm, ...updates })}
        onCustomValuesUpdate={setCustomValues}
        onSubmit={handleCreateLawFirm}
        onClose={() => {
          setShowLawFirmForm(false)
          setCustomValues({})
        }}
      />

      {/* Edit Law Firm Modal */}
      <LawFirmForm
        isOpen={!!editingLawFirm}
        isEditing={true}
        workspaceId={workspaceId}
        lawFirmId={editingLawFirm?.id}
        lawFirm={editingLawFirm ? {
          name: editingLawFirm.name,
          structure: editingLawFirm.structure,
          status: editingLawFirm.status,
          top_4: editingLawFirm.top_4 || false
        } : {
          name: '',
          structure: 'decentralised',
          status: 'active',
          top_4: false
        }}
        customValues={editingCustomValues}
        loading={updatingLawFirm}
        onUpdate={(updates) => editingLawFirm && setEditingLawFirm({ ...editingLawFirm, ...updates })}
        onCustomValuesUpdate={setEditingCustomValues}
        onSubmit={handleUpdateLawFirm}
        onClose={() => {
          setEditingLawFirm(null)
          setEditingCustomValues({})
        }}
      />

      {/* Law Firms Table */}
      <DataTable
        data={filteredLawFirms}
        tableLayout="auto"
        columns={[
          {
            key: 'name',
            header: 'Account Name',
            sortable: true,
            width: 'minmax(200px, 1fr)',
            render: (firm) => (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-gray-900 truncate">{firm.name}</span>
                {firm.top_4 && (
                  <Star size={16} className="text-yellow-500 fill-current flex-shrink-0" />
                )}
              </div>
            )
          },
          {
            key: 'structure',
            header: 'Structure',
            sortable: true,
            width: '140px',
            render: (firm) => (
              <span 
                className={getStructureTagStyles(firm.structure).className}
                style={getStructureTagStyles(firm.structure).style}
              >
                {firm.structure === 'centralised' ? 'Centralised' : 'Decentralised'}
              </span>
            )
          },
          // Top 4 column - real database column
          {
            key: 'top_4',
            header: 'Top 4',
            sortable: false,
            width: '100px',
            render: (firm) => (
              <span className="text-sm text-gray-600">
                {firm.top_4 === true ? 'True' : firm.top_4 === false ? 'False' : '-'}
              </span>
            )
          },
          // Add custom columns dynamically (excluding top_4 since it's already added above)
          ...customColumns
            .filter(column => 
              column.column_key !== 'top_4' && 
              column.column_name.toLowerCase() !== 'top 4' &&
              column.column_name !== 'Top 4'
            )
            .map((column) => ({
              key: column.column_key,
              header: column.column_name,
              sortable: false,
              width: column.column_type === 'boolean' ? '100px' : '150px',
              render: (firm: LawFirm) => {
                const customValue = lawFirmCustomValuesMap[firm.id]?.[column.column_key]
                if (column.column_type === 'boolean') {
                  return (
                    <span className="text-sm text-gray-600">
                      {customValue === true ? 'True' : customValue === false ? 'False' : '-'}
                    </span>
                  )
                } else {
                  return (
                    <span className="text-sm text-gray-600 truncate" title={customValue ? String(customValue) : ''}>
                      {customValue ? String(customValue) : '-'}
                    </span>
                  )
                }
              }
            }))
        ]}
        sortableFields={['name', 'structure']}
        getItemId={(firm) => firm.id}
        selectable={true}
        selectedItems={selectedLawFirms}
        onSelectionChange={setSelectedLawFirms}
        onRowClick={handleRowClick}
        onEdit={setEditingLawFirm}
        onDelete={onDeleteLawFirm}
        onBulkDelete={() => setShowBulkDeleteModal(true)}
        emptyStateIcon={Building2}
        emptyStateMessage="No accounts match your current filters."
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        message={`Are you sure you want to delete ${selectedLawFirms.length} account${selectedLawFirms.length > 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={handleBulkDelete}
        variant="danger"
      />

      {/* Edit Columns Modal */}
      {workspaceId && (
        <EditColumnsModal
          isOpen={showEditColumnsModal}
          workspaceId={workspaceId}
          onClose={() => setShowEditColumnsModal(false)}
          onColumnsUpdated={async () => {
            // Reload custom columns, keep only one top_4 entry
            const columns = await getLawFirmCustomColumns(workspaceId)
            const top4Entry = columns.find(col => col.column_key === 'top_4')
            const otherColumns = columns.filter(col => 
              (col.column_key !== 'top_4' && 
               col.column_name.toLowerCase() !== 'top 4' &&
               col.column_name !== 'Top 4') ||
              col.column_key === 'top_4'
            )
            // Remove duplicates - keep only the one with column_key='top_4'
            const uniqueColumns = top4Entry 
              ? [top4Entry, ...otherColumns.filter(col => col.column_key !== 'top_4')]
              : otherColumns.filter(col => col.column_key !== 'top_4')
            setCustomColumns(uniqueColumns)
            // Reload custom values for all law firms
            const valuesMap: Record<string, Record<string, boolean | string>> = {}
            for (const firm of lawFirms) {
              const values = await getLawFirmCustomValues(firm.id)
              if (values) {
                valuesMap[firm.id] = values
              }
            }
            setLawFirmCustomValuesMap(valuesMap)
          }}
        />
      )}
    </div>
  )
}