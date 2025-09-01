import React, { useState, useEffect } from 'react'
import { Edit, Check, X } from 'lucide-react'
import { BlockNoteEditor } from '../DesignSystem/components/BlockNoteEditor'
import { htmlToBlockNoteBlocks, blockNoteBlocksToHtml, type BlockNoteBlock } from '../../utils/blocknoteConverters'

interface NoteSummarySectionProps {
  summary: string | null
  onSave: (summary: string) => Promise<void>
  summary_blocknote?: BlockNoteBlock[] | null
  onSaveJSON?: (blocks: BlockNoteBlock[] | null) => Promise<void>
  saving: boolean
}

export function NoteSummarySection({ summary, onSave, saving, summary_blocknote, onSaveJSON }: NoteSummarySectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editBlocks, setEditBlocks] = useState<BlockNoteBlock[] | null>(null)

  // Update editValue when summary changes or when starting to edit
  useEffect(() => {
    if (!isEditing) return
    if (summary_blocknote && Array.isArray(summary_blocknote)) {
      setEditBlocks(summary_blocknote)
    } else {
      setEditBlocks(htmlToBlockNoteBlocks(summary || ''))
    }
  }, [summary, isEditing, summary_blocknote])

  const handleSave = async () => {
    try {
      // Persist JSON if supported
      if (onSaveJSON) {
        await onSaveJSON(editBlocks || [])
      }
      // Also persist HTML fallback for legacy paths
      const html = blockNoteBlocksToHtml(editBlocks || [])
      await onSave(html)
      setIsEditing(false)
      // The summary prop will be updated by the parent component after successful save
    } catch (error) {
      console.error('Error saving summary:', error)
      // Show user-friendly error message
      alert('Failed to save summary. Please try again.')
    }
  }

  const handleCancel = () => {
    setEditBlocks(null)
    setIsEditing(false)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
        
        {!isEditing && (
          <button
            onClick={() => {
              // Initialize blocks when entering edit mode
              if (summary_blocknote && Array.isArray(summary_blocknote)) {
                setEditBlocks(summary_blocknote)
              } else {
                setEditBlocks(htmlToBlockNoteBlocks(summary || ''))
              }
              setIsEditing(true)
            }}
            className="flex items-center px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <BlockNoteEditor
            initialContent={editBlocks || []}
            onChange={(blocks) => setEditBlocks(blocks)}
          />
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Check className="w-4 h-4 mr-1" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="prose max-w-none text-gray-700">
          {summary ? (
            <div 
              className="whitespace-pre-line leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: summary
                  .replace(/<p>/g, '')
                  .replace(/<\/p>/g, '\n')
                  .replace(/<br\s*\/?>(?![^]*<\/)/g, '\n')
                  .replace(/&nbsp;/g, ' ')
                  .trim()
              }} 
            />
          ) : (
            <p className="text-gray-500 italic">No key points could be extracted from the notes</p>
          )}
        </div>
      )}
    </div>
  )
}