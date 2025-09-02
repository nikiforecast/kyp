import React, { useState } from 'react'
import { ArrowLeft, Edit, Calendar, User as UserIcon, Trash2 } from 'lucide-react'
import { CopyLinkButton } from '../common/CopyLinkButton'
import { ConfirmModal } from '../DesignSystem/components/Modal'
import type { Example, WorkspaceUser } from '../../lib/supabase'

interface ExampleHeaderProps {
  example: Example
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  availableUsers: WorkspaceUser[]
}

export function ExampleHeader({ example, onBack, onEdit, onDelete, availableUsers }: ExampleHeaderProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB')
  }

  const getUserName = (userId: string) => {
    const user = availableUsers.find(u => u.user_id === userId)
    return user ? (user.full_name || user.user_email) : `User ${userId}`
  }

  const handleDeleteClick = () => {
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = () => {
    onDelete()
    setShowDeleteModal(false)
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 w-full">
      {/* Back button and breadcrumb */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Examples
        </button>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit size={16} />
            Edit
          </button>
          <button
            onClick={handleDeleteClick}
            className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
            Delete
          </button>
          <CopyLinkButton entityType="example" shortId={example.short_id} />
        </div>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Example #{example.short_id}
          </h1>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {formatDate(example.created_at)}
            </div>
            
            <div className="flex items-center">
              <UserIcon className="w-4 h-4 mr-1" />
              Created by {getUserName(example.created_by)}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Example"
        message={`Are you sure you want to delete Example #${example.short_id}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        variant="danger"
      />
    </div>
  )
}
