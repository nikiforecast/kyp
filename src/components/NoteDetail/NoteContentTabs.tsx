import React, { useState, useEffect } from 'react'
import { BlockNoteEditor } from '../DesignSystem/components/BlockNoteEditor'
import { htmlToBlockNoteBlocks, type BlockNoteBlock } from '../../utils/blocknoteConverters'
import { updateResearchNote } from '../../lib/database'
import type { ResearchNote } from '../../lib/supabase'

interface NoteContentTabsProps {
  note: ResearchNote
  onUpdateSummary: (summary: string) => Promise<ResearchNote | null>
  saving: boolean
}

export function NoteContentTabs({ 
  note, 
  onUpdateSummary, 
  saving
}: NoteContentTabsProps) {
  const [editingSummary, setEditingSummary] = useState(false)
  const [editBlocks, setEditBlocks] = useState<BlockNoteBlock[] | null>(null)
  const [viewBlocks, setViewBlocks] = useState<BlockNoteBlock[]>([])
  const viewKey = React.useMemo(() => JSON.stringify(viewBlocks), [viewBlocks])

  const hasJSON = Array.isArray((note as any).summary_blocknote) && (note as any).summary_blocknote.length > 0

  // Initialize / sync from note
  useEffect(() => {
    if (hasJSON) {
      setViewBlocks((note as any).summary_blocknote)
    } else {
      setViewBlocks([])
    }
    if (!editingSummary) setEditBlocks(null)
  }, [note])

  const handleSaveSummary = async () => {
    try {
      if (editBlocks) {
        await updateResearchNote(note.id, { summary_blocknote: editBlocks } as any)
        setViewBlocks(editBlocks)
      }
      setEditingSummary(false)
    } catch (error) {
      console.error('Error updating summary:', error)
      alert('Failed to save summary. Please try again.')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Content */}
      <div className="p-6">
        <div>
          {editingSummary ? (
            <div className="space-y-4">
              <BlockNoteEditor
                initialContent={editBlocks || (hasJSON ? (note as any).summary_blocknote : htmlToBlockNoteBlocks(note.summary || ''))}
                onChange={(blocks) => setEditBlocks(blocks)}
              />
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSaveSummary}
                  disabled={saving}
                  className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                
                <button
                  onClick={() => {
                    setEditBlocks(null)
                    setEditingSummary(false)
                  }}
                  disabled={saving}
                  className="flex items-center px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="flex-1">
                {hasJSON ? (
                  <BlockNoteEditor key={viewKey} initialContent={viewBlocks} editable={false} />
                ) : (
                  <div className="prose max-w-none text-gray-700">
                    {note.summary ? (
                      <div className="leading-relaxed" dangerouslySetInnerHTML={{ __html: note.summary }} />
                    ) : (
                      <p className="text-gray-500 italic">No summary available</p>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setEditBlocks(hasJSON ? (note as any).summary_blocknote : htmlToBlockNoteBlocks(note.summary || ''))
                  setEditingSummary(true)
                }}
                className="flex-shrink-0 flex items-center px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}