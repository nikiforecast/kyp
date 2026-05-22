import React, { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { Button } from '../DesignSystem/components'
import { Modal } from '../DesignSystem/components/Modal'
import { LoadingSpinner } from '../DesignSystem/components/LoadingSpinner'
import type { LawFirm } from '../../lib/supabase'
import { getLawFirmCustomColumns, getLawFirmCustomValues, type LawFirmCustomColumn } from '../../lib/database/services/lawFirmCustomColumnService'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

interface LawFirmFormProps {
  isOpen: boolean
  isEditing: boolean
  workspaceId?: string
  lawFirmId?: string
  lawFirm: {
    name: string
    structure: 'centralised' | 'decentralised'
    status: 'active' | 'inactive'
    top_4?: boolean
  }
  customValues?: Record<string, boolean | string>
  loading: boolean
  onUpdate: (updates: Partial<{ name: string; structure: 'centralised' | 'decentralised'; status: 'active' | 'inactive'; top_4?: boolean }>) => void
  onCustomValuesUpdate?: (customValues: Record<string, boolean | string>) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

export function LawFirmForm({
  isOpen,
  isEditing,
  workspaceId,
  lawFirmId,
  lawFirm,
  customValues: initialCustomValues = {},
  loading,
  onUpdate,
  onCustomValuesUpdate,
  onSubmit,
  onClose
}: LawFirmFormProps) {
  const [customColumns, setCustomColumns] = useState<LawFirmCustomColumn[]>([])
  const [loadingColumns, setLoadingColumns] = useState(false)
  const [customValues, setCustomValues] = useState<Record<string, boolean | string>>(initialCustomValues)

  useEffect(() => {
    if (isOpen && workspaceId) {
      loadCustomColumns()
    }
  }, [isOpen, workspaceId])

  useEffect(() => {
    if (isOpen && isEditing && lawFirmId && workspaceId) {
      loadCustomValues()
    } else {
      setCustomValues(initialCustomValues)
    }
  }, [isOpen, isEditing, lawFirmId, workspaceId])

  const loadCustomColumns = async () => {
    if (!workspaceId) return
    setLoadingColumns(true)
    try {
      const columns = await getLawFirmCustomColumns(workspaceId)
      
      // Clean up duplicate top_4 entries if any exist
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
            .eq('workspace_id', workspaceId)
            .order('display_order', { ascending: true })
          
          if (reloadedColumns) {
            // Filter out top_4 from the list since it's a real database column
            const filteredColumns = reloadedColumns.filter((col: LawFirmCustomColumn) => 
              col.column_key !== 'top_4' && 
              col.column_name.toLowerCase() !== 'top 4' &&
              col.column_name !== 'Top 4'
            )
            setCustomColumns(filteredColumns)
            return
          }
        }
      }
      
      // Filter out top_4 since it's a real database column, not a custom column
      // Check both by key and by name to catch all variations
      const filteredColumns = columns.filter(col => 
        col.column_key !== 'top_4' && 
        col.column_name.toLowerCase() !== 'top 4' &&
        col.column_name !== 'Top 4'
      )
      setCustomColumns(filteredColumns)
    } catch (error) {
      console.error('Error loading custom columns:', error)
    } finally {
      setLoadingColumns(false)
    }
  }

  const loadCustomValues = async () => {
    if (!lawFirmId) return
    try {
      const values = await getLawFirmCustomValues(lawFirmId)
      if (values) {
        setCustomValues(values)
        if (onCustomValuesUpdate) {
          onCustomValuesUpdate(values)
        }
      }
    } catch (error) {
      console.error('Error loading custom values:', error)
    }
  }

  const handleCustomValueChange = (columnKey: string, value: boolean | string) => {
    const updated = { ...customValues, [columnKey]: value }
    setCustomValues(updated)
    if (onCustomValuesUpdate) {
      onCustomValuesUpdate(updated)
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(e)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Account' : 'Add New Account'}
      size="md"
      closeOnOverlayClick={false}
      footerContent={
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary"
            disabled={loading}
            loading={loading}
            onClick={handleFormSubmit}
          >
            {isEditing ? 'Update Account' : 'Add Account'}
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
          <input
            type="text"
            value={lawFirm.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={loading}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Structure</label>
          <select
            value={lawFirm.structure}
            onChange={(e) => onUpdate({ structure: e.target.value as 'centralised' | 'decentralised' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          >
            <option value="decentralised">Decentralised</option>
            <option value="centralised">Centralised</option>
          </select>
        </div>

        {/* Top 4 field - real database column */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Top 4</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="top_4"
                checked={lawFirm.top_4 === true}
                onChange={() => onUpdate({ top_4: true })}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                disabled={loading}
              />
              <span className="text-sm text-gray-700">True</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="top_4"
                checked={lawFirm.top_4 === false || lawFirm.top_4 === undefined}
                onChange={() => onUpdate({ top_4: false })}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                disabled={loading}
              />
              <span className="text-sm text-gray-700">False</span>
            </label>
          </div>
        </div>

        {/* Custom Columns */}
        {loadingColumns ? (
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner size="sm" />
          </div>
        ) : (
          customColumns.map((column) => (
            <div key={column.id}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {column.column_name}
                {column.is_required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {column.column_type === 'boolean' ? (
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={column.column_key}
                      checked={customValues[column.column_key] === true}
                      onChange={() => handleCustomValueChange(column.column_key, true)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      disabled={loading}
                    />
                    <span className="text-sm text-gray-700">True</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={column.column_key}
                      checked={customValues[column.column_key] === false || customValues[column.column_key] === undefined}
                      onChange={() => handleCustomValueChange(column.column_key, false)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      disabled={loading}
                    />
                    <span className="text-sm text-gray-700">False</span>
                  </label>
                </div>
              ) : (
                <input
                  type="text"
                  value={(customValues[column.column_key] as string) || ''}
                  onChange={(e) => handleCustomValueChange(column.column_key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={column.is_required}
                  disabled={loading}
                />
              )}
            </div>
          ))
        )}
      </div>
    </Modal>
  )
}