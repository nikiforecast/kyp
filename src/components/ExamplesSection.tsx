import React, { useState, useEffect } from 'react'
import { BookOpen, Plus, Search, Upload } from 'lucide-react'
import { ExampleForm } from './ExampleForm'
import { ExampleDetail } from './ExampleDetail'
import { DataTable, Column } from './DesignSystem/components/DataTable'
import { ScreenshotUploader } from './ScreenshotUploader'
import { ImportResultsNotification } from './ImportResultsNotification'

import { Button } from './DesignSystem/components/Button'
import { 
  getExamples, 
  createExample, 
  updateExample, 
  deleteExample,
  getExamplesCount,
  bulkCreateExamples
} from '../lib/database'

import type { BulkImportResult } from '../lib/database/services/bulkExampleService'
import type { Example } from '../lib/supabase'

interface ExamplesSectionProps {
  projectId: string
  onViewExample?: (example: Example) => void
}

export const ExamplesSection: React.FC<ExamplesSectionProps> = ({ projectId, onViewExample }) => {
  const [examples, setExamples] = useState<Example[]>([])
  const [filteredExamples, setFilteredExamples] = useState<Example[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedExample, setSelectedExample] = useState<Example | null>(null)
  const [editingExample, setEditingExample] = useState<Example | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [actorFilter, setActorFilter] = useState('')
  const [examplesCount, setExamplesCount] = useState(0)
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null)
  const [selectedExamples, setSelectedExamples] = useState<string[]>([])

  // Load examples on component mount
  useEffect(() => {
    loadExamples()
  }, [projectId])

  // Filter examples when search term or actor filter changes
  useEffect(() => {
    filterExamples()
  }, [examples, searchTerm, actorFilter])

  const loadExamples = async () => {
    try {
      setLoading(true)
      const [examplesData, count] = await Promise.all([
        getExamples(projectId),
        getExamplesCount(projectId)
      ])
      setExamples(examplesData)
      setExamplesCount(count)
    } catch (error) {
      console.error('Error loading examples:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterExamples = () => {
    let filtered = examples

    // Filter by search term (searches across all text fields)
    if (searchTerm) {
      filtered = filtered.filter(example =>
        example.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        example.goal.toLowerCase().includes(searchTerm.toLowerCase()) ||
        example.entry_point.toLowerCase().includes(searchTerm.toLowerCase()) ||
        example.actions.toLowerCase().includes(searchTerm.toLowerCase()) ||
        example.error.toLowerCase().includes(searchTerm.toLowerCase()) ||
        example.outcome.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by actor
    if (actorFilter) {
      filtered = filtered.filter(example =>
        example.actor.toLowerCase().includes(actorFilter.toLowerCase())
      )
    }

    setFilteredExamples(filtered)
  }

  const handleCreateExample = async (exampleData: Omit<Example, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newExample = await createExample(exampleData)
      setExamples(prev => [newExample, ...prev])
      setShowCreateForm(false)
      await loadExamples() // Refresh count
    } catch (error) {
      console.error('Error creating example:', error)
      throw error
    }
  }

  const handleUpdateExample = async (exampleData: Omit<Example, 'id' | 'created_at' | 'updated_at'>) => {
    if (!editingExample) {
      throw new Error('No example being edited')
    }
    
    try {
      const updatedExample = await updateExample(editingExample.id, exampleData)
      setExamples(prev => prev.map(ex => ex.id === editingExample.id ? updatedExample : ex))
      setEditingExample(null)
      setSelectedExample(updatedExample)
    } catch (error) {
      console.error('Error updating example:', error)
      throw error
    }
  }

  const handleDeleteExample = async (id: string) => {
    try {
      await deleteExample(id)
      setExamples(prev => prev.filter(ex => ex.id !== id))
      if (selectedExample?.id === id) {
        setSelectedExample(null)
      }
      await loadExamples() // Refresh count
    } catch (error) {
      console.error('Error deleting example:', error)
      throw error
    }
  }

  const handleExampleClick = (example: Example) => {
    if (onViewExample) {
      onViewExample(example)
    } else {
      setSelectedExample(example)
    }
  }

  const handleEditExample = (example: Example) => {
    setEditingExample(example)
  }

  const handleCloseDetail = () => {
    setSelectedExample(null)
  }

  const handleCloseForm = () => {
    setShowCreateForm(false)
    setEditingExample(null)
  }

  const handleCloseImportModal = () => {
    setShowImportModal(false)
  }

  const handleImportComplete = async (examples: Omit<Example, 'id' | 'short_id' | 'created_at' | 'updated_at'>[]) => {
    try {
      // Use bulk import service for better performance and error handling
      const result = await bulkCreateExamples(examples)
      
      if (result.totalSuccessful > 0) {
        // Update local state with successfully created examples
        setExamples(prev => [...result.success, ...prev])
        await loadExamples() // Refresh count
      }
      
      setShowImportModal(false)
      setImportResult(result)
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setImportResult(null)
      }, 5000)
    } catch (error) {
      console.error('Error importing examples:', error)
      throw error
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setActorFilter('')
  }

  // Table columns configuration
  const columns: Column<Example>[] = [
    {
      key: 'short_id',
      header: '#',
      sortable: true,
      width: '80px',
      render: (example) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            #{example.short_id}
          </span>
        </div>
      )
    },
    {
      key: 'actor',
      header: 'Actor',
      sortable: true,
      width: '160px',
      render: (example) => (
        <div className="text-sm text-gray-600 truncate" title={example.actor}>
          {example.actor}
        </div>
      )
    },
    {
      key: 'goal',
      header: 'Goal',
      sortable: true,
      width: '240px',
      render: (example) => (
        <div className="text-sm text-gray-600 truncate" title={example.goal}>
          {example.goal}
        </div>
      )
    },
    {
      key: 'entry_point',
      header: 'Entry Point',
      sortable: true,
      width: '160px',
      render: (example) => (
        <div className="text-sm text-gray-600 truncate" title={example.entry_point}>
          {example.entry_point}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      width: '240px',
      render: (example) => (
        <div className="text-sm text-gray-600 truncate" title={example.actions}>
          {example.actions}
        </div>
      )
    },
    {
      key: 'error',
      header: 'Error',
      sortable: true,
      width: '240px',
      render: (example) => (
        <div className="text-sm text-gray-600 truncate" title={example.error}>
          {example.error}
        </div>
      )
    },
    {
      key: 'outcome',
      header: 'Outcome',
      sortable: true,
      width: '240px',
      render: (example) => (
        <div className="text-sm text-gray-600 truncate" title={example.outcome}>
          {example.outcome}
        </div>
      )
    }
  ]

  const handleBulkDelete = async (exampleIds: string[]) => {
    try {
      await Promise.all(exampleIds.map(id => deleteExample(id)))
      setExamples(prev => prev.filter(ex => !exampleIds.includes(ex.id)))
      setSelectedExamples([])
      await loadExamples() // Refresh count
    } catch (error) {
      console.error('Error bulk deleting examples:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BookOpen className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Examples</h2>
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
            {examplesCount}
          </span>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowImportModal(true)}
            icon={Upload}
            iconPosition="left"
            variant="outline"
            size="default"
          >
            Import from Screenshot
          </Button>
          <Button
            onClick={() => setShowCreateForm(true)}
            icon={Plus}
            iconPosition="left"
            variant="primary"
            size="default"
          >
            Add Example
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search examples..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {(searchTerm || actorFilter) && (
          <Button
            onClick={clearFilters}
            variant="outline"
            size="small"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Examples Table */}
      <div className="w-full overflow-hidden">
        <DataTable
          data={filteredExamples}
          columns={columns}
          sortableFields={['short_id', 'actor', 'goal', 'entry_point', 'error', 'outcome']}
          getItemId={(example) => example.id}
          getItemName={() => 'example'}
          selectable={true}
          selectedItems={selectedExamples}
          onSelectionChange={setSelectedExamples}
          onRowClick={handleExampleClick}
          onEdit={handleEditExample}
          onDelete={(example) => handleDeleteExample(example.id)}
          onBulkDelete={handleBulkDelete}
          emptyStateIcon={BookOpen as React.ComponentType<{ size?: number; className?: string }>}
          emptyStateMessage={examples.length === 0 ? 'No examples yet. Get started by creating your first example.' : 'No examples match your filters. Try adjusting your search terms or filters.'}
          className="min-w-0"
        />
      </div>

      {/* Create/Edit Form Modal */}
      {(showCreateForm || editingExample) && (
        <ExampleForm
          projectId={projectId}
          example={editingExample}
          onSubmit={editingExample ? handleUpdateExample : handleCreateExample}
          onClose={handleCloseForm}
        />
      )}

      {/* Example Detail Modal - only show if onViewExample is not provided */}
      {selectedExample && !onViewExample && (
        <ExampleDetail
          example={selectedExample}
          onEdit={() => handleEditExample(selectedExample)}
          onDelete={() => handleDeleteExample(selectedExample.id)}
          onClose={handleCloseDetail}
        />
      )}

      {/* Screenshot Import Modal */}
      {showImportModal && (
        <ScreenshotUploader
          projectId={projectId}
          onImportComplete={handleImportComplete}
          onClose={handleCloseImportModal}
        />
      )}

      {/* Import Results Notification */}
      {importResult && (
        <ImportResultsNotification
          result={importResult}
          onClose={() => setImportResult(null)}
        />
      )}
    </div>
  )
}
