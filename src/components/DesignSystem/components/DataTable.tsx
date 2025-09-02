import React, { useState } from 'react'
import { ChevronUp, ChevronDown, Users, Building2, Edit, Trash2 } from 'lucide-react'
import { Button } from './Button'

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render: (item: T) => React.ReactNode
  width?: string
}

export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  sortableFields?: (keyof T)[]
  onRowClick?: (item: T) => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  onBulkDelete?: (ids: string[]) => void
  getItemId: (item: T) => string
  getItemName?: (item: T) => string
  selectable?: boolean
  selectedItems?: string[]
  onSelectionChange?: (ids: string[]) => void
  emptyStateIcon?: React.ComponentType<{ size?: number; className?: string }>
  emptyStateMessage?: string
  bulkActions?: React.ReactNode
  className?: string
}

export function DataTable<T>({
  data,
  columns,
  sortableFields = [],
  onRowClick,
  onEdit,
  onDelete,
  onBulkDelete,
  getItemId,
  getItemName,
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  emptyStateIcon: EmptyStateIcon = Users,
  emptyStateMessage = 'No data available',
  bulkActions,
  className = ''
}: DataTableProps<T>) {
  const [sortField, setSortField] = useState<keyof T | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)

  const handleSort = (field: keyof T) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: keyof T) => {
    if (sortField !== field) {
      return <ChevronUp size={14} className="text-gray-300" />
    }
    return sortDirection === 'asc' 
      ? <ChevronUp size={14} className="text-gray-600" />
      : <ChevronDown size={14} className="text-gray-600" />
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange?.(data.map(item => getItemId(item)))
    } else {
      onSelectionChange?.([])
    }
  }

  const handleSelectItem = (itemId: string, checked: boolean, event?: React.MouseEvent | React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return

    const currentIndex = sortedData.findIndex(item => getItemId(item) === itemId)
    
    // Check if shift key is pressed and we have a previous selection
    if (event && 'shiftKey' in event && event.shiftKey && lastSelectedIndex !== null && currentIndex !== -1) {
      const startIndex = Math.min(lastSelectedIndex, currentIndex)
      const endIndex = Math.max(lastSelectedIndex, currentIndex)
      
      // Get all item IDs in the range
      const rangeItemIds = sortedData
        .slice(startIndex, endIndex + 1)
        .map(item => getItemId(item))
      
      // If the current checkbox is being checked, select all in range
      if (checked) {
        const newSelection = [...new Set([...selectedItems, ...rangeItemIds])]
        onSelectionChange(newSelection)
      } else {
        // If unchecking, remove all in range
        const newSelection = selectedItems.filter(id => !rangeItemIds.includes(id))
        onSelectionChange(newSelection)
      }
    } else {
      // Normal single selection
      if (checked) {
        onSelectionChange([...selectedItems, itemId])
      } else {
        onSelectionChange(selectedItems.filter(id => id !== itemId))
      }
    }
    
    // Update the last selected index for future shift-clicks
    setLastSelectedIndex(currentIndex)
  }

  const handleBulkDelete = () => {
    if (selectedItems.length === 0 || !onBulkDelete) return
    
    const itemName = getItemName ? getItemName(data[0]) : 'item'
    const confirmMessage = `Are you sure you want to delete ${selectedItems.length} ${itemName}${selectedItems.length > 1 ? 's' : ''}? This action cannot be undone.`
    
    if (window.confirm(confirmMessage)) {
      onBulkDelete(selectedItems)
    }
  }

  const isAllSelected = data.length > 0 && selectedItems.length === data.length
  const isIndeterminate = selectedItems.length > 0 && selectedItems.length < data.length

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    if (!sortField) return 0
    
    let aValue = a[sortField]
    let bValue = b[sortField]
    
    if (typeof aValue === 'string') aValue = aValue.toLowerCase()
    if (typeof bValue === 'string') bValue = bValue.toLowerCase()
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div 
    data-component="KYP-table"
    className={`space-y-4 ${className}`}>
     
      
      {/* Bulk Actions */}
      {selectable && selectedItems.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-3">
              {bulkActions}
              {onBulkDelete && (
                <Button
                  variant="primary"
                  icon={Building2}
                  onClick={handleBulkDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Selected
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {selectable && (
                  <th className="px-6 py-3 text-left" style={{ width: '50px' }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isIndeterminate
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th 
                    key={column.key}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      column.sortable && sortableFields.includes(column.key as keyof T)
                        ? 'cursor-pointer hover:bg-gray-100 transition-colors'
                        : ''
                    }`}
                    style={{ width: column.width }}
                    onClick={() => {
                      if (column.sortable && sortableFields.includes(column.key as keyof T)) {
                        handleSort(column.key as keyof T)
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {column.header}
                      {column.sortable && sortableFields.includes(column.key as keyof T) && (
                        getSortIcon(column.key as keyof T)
                      )}
                    </div>
                  </th>
                ))}
                {(onEdit || onDelete) && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '80px' }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((item) => {
                const itemId = getItemId(item)
                const isSelected = selectedItems.includes(itemId)
                
                return (
                                    <tr
                    key={itemId}
                    className={`transition-colors ${
                      onRowClick ? 'hover:bg-gray-50 cursor-pointer' : ''
                    }`}
                    onClick={(e) => {
                      // Only trigger row click if not clicking on checkbox, buttons, or other interactive elements
                      const target = e.target as HTMLElement
                      if (!target.closest('input[type="checkbox"]') && 
                          !target.closest('button') && 
                          !target.closest('a') &&
                          !target.closest('[role="button"]')) {
                        onRowClick?.(item)
                      }
                    }}
                  >
                    {selectable && (
                      <td 
                        className="px-6 py-4 whitespace-nowrap cursor-pointer" 
                        style={{ width: '50px' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectItem(itemId, !isSelected, e)
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation()
                            handleSelectItem(itemId, e.target.checked, e)
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 pointer-events-none"
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td 
                        key={column.key}
                        className="px-6 py-4 whitespace-nowrap"
                        style={{ width: column.width }}
                      >
                        {column.render(item)}
                      </td>
                    ))}
                    {(onEdit || onDelete) && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ width: '80px' }}>
                        <div className="flex items-center gap-2">
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="small"
                              icon={Edit}
                              onClick={(e) => {
                                e.stopPropagation()
                                onEdit(item)
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            />
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="small"
                              icon={Trash2}
                              onClick={(e) => {
                                e.stopPropagation()
                                onDelete(item)
                              }}
                              className="text-red-600 hover:text-red-900"
                            />
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          {sortedData.length === 0 && (
            <div className="text-center py-12">
              <EmptyStateIcon size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">{emptyStateMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
