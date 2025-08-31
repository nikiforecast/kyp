import React, { useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import { CKEditorComponent } from '../CKEditorComponent'

interface AiSummaryModalProps {
  aiSummary: string
  onSave: (summary: string) => Promise<void>
  onClose: () => void
  saving: boolean
}

export function AiSummaryModal({ aiSummary, onSave, onClose, saving }: AiSummaryModalProps) {
  const [editableSummary, setEditableSummary] = useState(aiSummary)

  const handleSave = async () => {
    try {
      await onSave(editableSummary)
      onClose()
    } catch (error) {
      console.error('Error saving AI summary:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(107, 66, 209, 0.1)' }}>
          <Sparkles size={20} style={{ color: '#6b42d1' }} />
        </div>
            <h3 className="text-lg font-semibold text-gray-900">Use AI Summary</h3>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="mb-6">
            <p className="text-gray-600">
              The following AI generated summary will be saved as the Summary for this Note. 
              Please check the summary before proceeding.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              AI Generated Summary
            </label>
            <CKEditorComponent
              value={editableSummary}
              onChange={setEditableSummary}
              placeholder="AI generated summary will appear here..."
              disabled={saving}
            />
          </div>
        </div>
        
        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#6b42d1' }}
          >
            <Sparkles size={16} />
            {saving ? 'Adding Summary...' : 'Add Summary'}
          </button>
        </div>
      </div>
    </div>
  )
}