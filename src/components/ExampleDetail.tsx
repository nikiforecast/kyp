import React from 'react'
import { X, Edit, Trash2, User, Target, ArrowRight, CheckCircle, AlertTriangle, Calendar, User as UserIcon } from 'lucide-react'
import { Button } from './DesignSystem/components/Button'
import type { Example } from '../lib/supabase'

interface ExampleDetailProps {
  example: Example
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

export const ExampleDetail: React.FC<ExampleDetailProps> = ({ 
  example, 
  onEdit, 
  onDelete, 
  onClose 
}) => {
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this example? This action cannot be undone.')) {
      onDelete()
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatText = (text: string) => {
    // Convert line breaks to proper formatting
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Example: {example.actor}
              </h2>
              <p className="text-sm text-gray-500">
                Created {formatDate(example.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={onEdit}
              icon={Edit}
              iconPosition="left"
              variant="outline"
              size="small"
              className="text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100"
            >
              Edit
            </Button>
            <Button
              onClick={handleDelete}
              icon={Trash2}
              iconPosition="left"
              variant="outline"
              size="small"
              className="text-red-600 bg-red-50 border-red-200 hover:bg-red-100"
            >
              Delete
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="small"
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Actor Section */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <User className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Actor</h3>
            </div>
            <p className="text-gray-900 text-lg">{example.actor}</p>
          </div>

          {/* Goal Section */}
          <div className="bg-green-50 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Target className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Goal</h3>
            </div>
            <p className="text-gray-900 leading-relaxed">
              {formatText(example.goal)}
            </p>
          </div>

          {/* Entry Point Section */}
          <div className="bg-blue-50 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <ArrowRight className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Entry Point</h3>
            </div>
            <p className="text-gray-900 leading-relaxed">
              {formatText(example.entry_point)}
            </p>
          </div>

          {/* Actions Section */}
          <div className="bg-purple-50 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <CheckCircle className="h-6 w-6 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Actions</h3>
            </div>
            <div className="text-gray-900 leading-relaxed">
              {formatText(example.actions)}
            </div>
          </div>

          {/* Error Section */}
          <div className="bg-orange-50 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">Error</h3>
            </div>
            <p className="text-gray-900 leading-relaxed">
              {formatText(example.error)}
            </p>
          </div>

          {/* Outcome Section */}
          <div className="bg-emerald-50 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">Outcome</h3>
            </div>
            <div className="text-gray-900 leading-relaxed">
              {formatText(example.outcome)}
            </div>
          </div>

          {/* Metadata Section */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Created:</span>
                <span className="text-gray-900">{formatDate(example.created_at)}</span>
              </div>
              {example.updated_at !== example.created_at && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Updated:</span>
                  <span className="text-gray-900">{formatDate(example.updated_at)}</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <UserIcon className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Created by:</span>
                <span className="text-gray-900">User {example.created_by}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <Button
            onClick={onClose}
            variant="outline"
            size="default"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
