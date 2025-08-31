import React from 'react'
import { X, Loader2, Star } from 'lucide-react'
import { Button, IconButton } from '../DesignSystem/components'
import type { LawFirm } from '../../lib/supabase'

interface LawFirmFormProps {
  isEditing: boolean
  lawFirm: {
    name: string
    structure: 'centralised' | 'decentralised'
    status: 'active' | 'inactive'
    top_4: boolean
  }
  loading: boolean
  onUpdate: (updates: Partial<{ name: string; structure: 'centralised' | 'decentralised'; status: 'active' | 'inactive'; top_4: boolean }>) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

export function LawFirmForm({
  isEditing,
  lawFirm,
  loading,
  onUpdate,
  onSubmit,
  onClose
}: LawFirmFormProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Law Firm' : 'Add New Law Firm'}
          </h3>
          <IconButton
            icon={X}
            variant="ghost"
            onClick={onClose}
            className="text-gray-500 hover:bg-gray-100"
          />
        </div>
        
        {/* Modal Content */}
        <div className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Firm Name</label>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Star size={16} className="text-yellow-500" />
                  Law firm is top 4
                </div>
              </label>
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
                  <span className="text-sm text-gray-700">Yes</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="top_4"
                    checked={lawFirm.top_4 === false}
                    onChange={() => onUpdate({ top_4: false })}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <span className="text-sm text-gray-700">No</span>
                </label>
              </div>
            </div>

            

            <div className="flex items-center gap-3">
              <Button 
                type="submit" 
                variant="primary"
                disabled={loading}
                loading={loading}
              >
                {isEditing ? 'Update Law Firm' : 'Add Law Firm'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}