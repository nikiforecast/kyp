import React, { useState, useEffect } from 'react'
import { Plus, Trash2, GripVertical, X } from 'lucide-react'
import { Modal } from '../DesignSystem/components/Modal'
import { Button } from '../DesignSystem/components/Button'
import { LoadingSpinner } from '../DesignSystem/components/LoadingSpinner'
import type { LawFirmCustomColumn } from '../../lib/database/services/lawFirmCustomColumnService'
import {
  getLawFirmCustomColumns,
  createLawFirmCustomColumn,
  updateLawFirmCustomColumn,
  deleteLawFirmCustomColumn,
  reorderLawFirmCustomColumns
} from '../../lib/database/services/lawFirmCustomColumnService'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

interface EditColumnsModalProps {
  isOpen: boolean
  workspaceId: string
  onClose: () => void
  onColumnsUpdated: () => void
}

// Required columns that cannot be edited or deleted
const REQUIRED_COLUMNS = [
  { key: 'name', name: 'Account Name', type: 'string' as const, isRequired: true },
  { key: 'structure', name: 'Structure', type: 'string' as const, isRequired: true }
]

// System customizable columns (real DB columns that can be managed like custom columns)
const SYSTEM_CUSTOMIZABLE_COLUMNS = [
  { key: 'top_4', name: 'Top 4', type: 'boolean' as const }
]

export function EditColumnsModal({
  isOpen,
  workspaceId,
  onClose,
  onColumnsUpdated
}: EditColumnsModalProps) {
  const [columns, setColumns] = useState<LawFirmCustomColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingColumn, setEditingColumn] = useState<LawFirmCustomColumn | null>(null)
  const [newColumnName, setNewColumnName] = useState('')
  const [newColumnType, setNewColumnType] = useState<'boolean' | 'string'>('string')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [showAddColumnForm, setShowAddColumnForm] = useState(false)
  const [hasUnsavedOrderChanges, setHasUnsavedOrderChanges] = useState(false)
  const [originalColumnOrder, setOriginalColumnOrder] = useState<string[]>([])

  useEffect(() => {
    if (isOpen && workspaceId) {
      loadColumns()
      setShowAddColumnForm(false)
      setEditingColumn(null)
      setNewColumnName('')
      setNewColumnType('string')
    }
  }, [isOpen, workspaceId])

  const loadColumns = async () => {
    setLoading(true)
    try {
      const customColumns = await getLawFirmCustomColumns(workspaceId)
      
      // Filter out duplicate system columns and ensure only one exists with the correct key
      const systemColumnKeys = SYSTEM_CUSTOMIZABLE_COLUMNS.map(sc => sc.key)
      const systemColumnNames = SYSTEM_CUSTOMIZABLE_COLUMNS.map(sc => sc.name)
      
      // Find and delete ALL duplicate top_4 entries (keep only ONE with column_key='top_4')
      let columnsAfterCleanup = customColumns
      if (isSupabaseConfigured && supabase) {
        // Find all top_4 related columns (by key or name, case-insensitive)
        const top4Columns = customColumns.filter(c => 
          c.column_key === 'top_4' || 
          c.column_name.toLowerCase() === 'top 4' ||
          c.column_name === 'Top 4'
        )
        
        if (top4Columns.length > 0) {
          // Keep only the one with column_key='top_4', delete ALL others
          const correctTop4 = top4Columns.find(c => c.column_key === 'top_4')
          
          // If no correct one exists, keep the first one and update its key
          let top4ToKeep = correctTop4 || top4Columns[0]
          
          // If the one we're keeping doesn't have the correct key, update it
          if (top4ToKeep.column_key !== 'top_4') {
            try {
              const { data: updated } = await supabase
                .from('law_firm_custom_columns')
                .update({ 
                  column_key: 'top_4',
                  column_name: 'Top 4',
                  column_type: 'boolean'
                })
                .eq('id', top4ToKeep.id)
                .select()
                .single()
              
              if (updated) {
                top4ToKeep = updated as LawFirmCustomColumn
              }
            } catch (error) {
              console.error(`Error updating top_4 column key:`, error)
            }
          }
          
          // Delete ALL other top_4 entries
          const duplicatesToDelete = top4Columns.filter(c => c.id !== top4ToKeep.id)
          
          for (const duplicate of duplicatesToDelete) {
            try {
              await supabase
                .from('law_firm_custom_columns')
                .delete()
                .eq('id', duplicate.id)
            } catch (error) {
              console.error(`Error deleting duplicate top_4 column ${duplicate.id}:`, error)
            }
          }
          
          // Reload columns after cleanup
          const { data: reloadedColumns } = await supabase
            .from('law_firm_custom_columns')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('display_order', { ascending: true })
          
          if (reloadedColumns) {
            columnsAfterCleanup = reloadedColumns as LawFirmCustomColumn[]
          }
        }
      }
      
      // Remove any columns that match system column names but don't have the correct key
      // Keep only columns with the correct system column_key, or non-system columns
      const filteredColumns = columnsAfterCleanup.filter(c => {
        const isSystemColumnByName = systemColumnNames.includes(c.column_name)
        const hasCorrectSystemKey = systemColumnKeys.includes(c.column_key)
        
        // Keep if: not a system column by name, OR has the correct system key
        return !isSystemColumnByName || hasCorrectSystemKey
      })
      
      // Ensure system customizable columns exist with the correct column_key
      // Check both by key and by name to avoid duplicates
      const existingSystemColumns = filteredColumns.filter(c => 
        systemColumnKeys.includes(c.column_key) || 
        systemColumnNames.includes(c.column_name)
      )
      const missingSystemColumns = SYSTEM_CUSTOMIZABLE_COLUMNS.filter(
        sc => !existingSystemColumns.some(ec => 
          ec.column_key === sc.key || ec.column_name === sc.name
        )
      )
      
      // Create missing system columns with the correct column_key
      const maxOrder = filteredColumns.length > 0 
        ? Math.max(...filteredColumns.map(c => c.display_order)) 
        : -1
      
      const newSystemColumns: LawFirmCustomColumn[] = []
      if (isSupabaseConfigured && supabase && missingSystemColumns.length > 0) {
        for (let i = 0; i < missingSystemColumns.length; i++) {
          const sysCol = missingSystemColumns[i]
          try {
            // Check if it already exists (in case of race condition)
            const { data: existing } = await supabase
              .from('law_firm_custom_columns')
              .select('*')
              .eq('workspace_id', workspaceId)
              .eq('column_key', sysCol.key)
              .maybeSingle()
            
            if (existing) {
              newSystemColumns.push(existing)
            } else {
              // Create directly with the correct column_key
              const { data, error } = await supabase
                .from('law_firm_custom_columns')
                .insert({
                  workspace_id: workspaceId,
                  column_key: sysCol.key, // Use the system column key directly
                  column_name: sysCol.name,
                  column_type: sysCol.type,
                  display_order: maxOrder + 1 + i,
                  is_required: false
                })
                .select()
                .single()
              
              if (error) {
                // If error is due to unique constraint violation, fetch the existing one
                if (error.code === '23505') {
                  const { data: existingAfterError } = await supabase
                    .from('law_firm_custom_columns')
                    .select('*')
                    .eq('workspace_id', workspaceId)
                    .eq('column_key', sysCol.key)
                    .single()
                  if (existingAfterError) {
                    newSystemColumns.push(existingAfterError)
                  }
                } else {
                  throw error
                }
              } else if (data) {
                newSystemColumns.push(data)
              }
            }
          } catch (error) {
            console.error(`Error creating system column ${sysCol.key}:`, error)
          }
        }
      }
      
      const allCustomColumns = [...filteredColumns, ...newSystemColumns]
      setColumns(allCustomColumns)
      setOriginalColumnOrder(allCustomColumns.map(c => c.id))
      setHasUnsavedOrderChanges(false)
    } catch (error) {
      console.error('Error loading columns:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return

    setSaving(true)
    try {
      const maxOrder = columns.length > 0 
        ? Math.max(...columns.map(c => c.display_order)) 
        : -1
      
      const newColumn = await createLawFirmCustomColumn(
        workspaceId,
        newColumnName.trim(),
        newColumnType,
        maxOrder + 1
      )

      if (newColumn) {
        const updatedColumns = [...columns, newColumn]
        setColumns(updatedColumns)
        setOriginalColumnOrder(updatedColumns.map(c => c.id))
        setNewColumnName('')
        setNewColumnType('string')
        setShowAddColumnForm(false)
        onColumnsUpdated()
      }
    } catch (error) {
      console.error('Error adding column:', error)
      alert('Failed to add column. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleEditColumn = async (column: LawFirmCustomColumn) => {
    setSaving(true)
    try {
      const updated = await updateLawFirmCustomColumn(column.id, {
        column_name: editingColumn!.column_name,
        column_type: editingColumn!.column_type
      })

      if (updated) {
        setColumns(columns.map(c => c.id === column.id ? updated : c))
        setEditingColumn(null)
        onColumnsUpdated()
      }
    } catch (error) {
      console.error('Error updating column:', error)
      alert('Failed to update column. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteColumn = async (columnId: string) => {
    if (!confirm('Are you sure you want to delete this column? This will remove the column from all accounts.')) {
      return
    }

    setSaving(true)
    try {
      const success = await deleteLawFirmCustomColumn(columnId)
      if (success) {
        const updatedColumns = columns.filter(c => c.id !== columnId)
        setColumns(updatedColumns)
        setOriginalColumnOrder(updatedColumns.map(c => c.id))
        setHasUnsavedOrderChanges(false)
        onColumnsUpdated()
      }
    } catch (error) {
      console.error('Error deleting column:', error)
      alert('Failed to delete column. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const getAllColumns = () => {
    return [
      ...REQUIRED_COLUMNS.map((col, idx) => ({
        id: col.key,
        column_key: col.key,
        column_name: col.name,
        column_type: col.type,
        display_order: idx,
        is_required: true,
        workspace_id: workspaceId,
        created_at: '',
        updated_at: ''
      })),
      ...columns
    ].sort((a, b) => a.display_order - b.display_order)
  }

  const handleDragStart = (index: number) => {
    // Allow dragging all columns except required ones
    const allCols = getAllColumns()
    const column = allCols[index]
    const isRequired = column.is_required || REQUIRED_COLUMNS.some(rc => rc.key === column.column_key)
    if (!isRequired) {
      // Find the index in the columns array (excluding required columns)
      const actualIndex = columns.findIndex(c => c.id === column.id)
      if (actualIndex >= 0) {
        setDraggedIndex(actualIndex)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null) return

    const allCols = getAllColumns()
    const column = allCols[index]
    const isRequired = column.is_required || REQUIRED_COLUMNS.some(rc => rc.key === column.column_key)
    if (isRequired) return

    // Find the index in the columns array
    const targetIndex = columns.findIndex(c => c.id === column.id)
    if (targetIndex < 0) return

    const newColumns = [...columns]
    const draggedColumn = newColumns[draggedIndex]
    newColumns.splice(draggedIndex, 1)
    newColumns.splice(targetIndex, 0, draggedColumn)

    // Update display orders
    const updatedColumns = newColumns.map((col, idx) => ({ ...col, display_order: idx }))
    setColumns(updatedColumns)
    setDraggedIndex(targetIndex)
    
    // Check if order has changed
    const currentOrder = updatedColumns.map(c => c.id).join(',')
    const originalOrder = originalColumnOrder.join(',')
    setHasUnsavedOrderChanges(currentOrder !== originalOrder)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    // Don't save immediately - wait for Save button
  }

  const handleSave = async () => {
    if (!hasUnsavedOrderChanges) {
      onClose()
      return
    }

    setSaving(true)
    try {
      const columnOrders = columns.map((col, idx) => ({
        id: col.id,
        display_order: idx
      }))

      const success = await reorderLawFirmCustomColumns(columnOrders)
      if (success) {
        setOriginalColumnOrder(columns.map(c => c.id))
        setHasUnsavedOrderChanges(false)
        onColumnsUpdated()
        onClose()
      }
    } catch (error) {
      console.error('Error saving column order:', error)
      alert('Failed to save column order. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    // Reset any unsaved order changes
    if (hasUnsavedOrderChanges) {
      loadColumns()
    }
    onClose()
  }

  const allColumns = getAllColumns()

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Columns"
      size="lg"
      closeOnOverlayClick={false}
      footerContent={
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => {
              setShowAddColumnForm(!showAddColumnForm)
              setNewColumnName('')
              setNewColumnType('string')
            }}
            disabled={saving}
          >
            <Plus size={16} className="mr-2" />
            Add Column
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={saving}
            >
              Close
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving}
              loading={saving}
            >
              Save
            </Button>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <>
            {/* Columns List */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Columns</h3>
              <div className="space-y-2">
                {allColumns.map((column, index) => {
                  const isRequired = column.is_required || REQUIRED_COLUMNS.some(rc => rc.key === column.column_key)
                  const isEditing = editingColumn?.id === column.id
                  const isCustomColumn = !isRequired
                  const customColumnIndex = isCustomColumn ? index - REQUIRED_COLUMNS.length : null

                  return (
                    <div
                      key={column.id}
                      draggable={isCustomColumn}
                      onDragStart={() => isCustomColumn && handleDragStart(index)}
                      onDragOver={(e) => isCustomColumn && handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-white ${
                        customColumnIndex !== null && draggedIndex === customColumnIndex ? 'opacity-50' : ''
                      } ${isCustomColumn ? 'cursor-move' : ''}`}
                    >
                      {!isRequired && (
                        <GripVertical size={16} className="text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <input
                              type="text"
                              value={editingColumn.column_name}
                              onChange={(e) => setEditingColumn({ ...editingColumn, column_name: e.target.value })}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                            <select
                              value={editingColumn.column_type}
                              onChange={(e) => setEditingColumn({ ...editingColumn, column_type: e.target.value as 'boolean' | 'string' })}
                              className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 sm:w-auto w-full"
                            >
                              <option value="string">String</option>
                              <option value="boolean">Boolean</option>
                            </select>
                            <div className="flex items-center gap-2 sm:flex-row flex-row-reverse">
                              <Button
                                variant="primary"
                                size="small"
                                onClick={() => handleEditColumn(column)}
                                disabled={saving}
                              >
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="small"
                                onClick={() => setEditingColumn(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">{column.column_name}</span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
                              {column.column_type === 'boolean' ? 'Boolean' : 'String'}
                            </span>
                            {isRequired && (
                              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded whitespace-nowrap">
                                Required
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {!isRequired && !isEditing && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="small"
                            onClick={() => setEditingColumn(column)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="small"
                            onClick={() => handleDeleteColumn(column.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Add New Column Form - shown when button is clicked */}
            {showAddColumnForm && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Add New Column</h3>
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                      type="text"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      placeholder="Column name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddColumn()
                        }
                      }}
                    />
                    <select
                      value={newColumnType}
                      onChange={(e) => setNewColumnType(e.target.value as 'boolean' | 'string')}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:w-auto w-full"
                    >
                      <option value="string">String</option>
                      <option value="boolean">Boolean (True/False)</option>
                    </select>
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleAddColumn}
                    disabled={!newColumnName.trim() || saving}
                    loading={saving}
                    className="w-full sm:w-auto justify-center"
                  >
                    <Plus size={16} className="mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

