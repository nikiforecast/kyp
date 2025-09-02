import React from 'react'
import { Edit, Trash2, User, Target, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react'
import { Card } from './DesignSystem/components/Card'
import { Button } from './DesignSystem/components/Button'
import type { Example } from '../lib/supabase'

interface ExampleCardProps {
  example: Example
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
}

export const ExampleCard: React.FC<ExampleCardProps> = ({ 
  example, 
  onClick, 
  onEdit, 
  onDelete 
}) => {
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit()
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to delete this example?')) {
      onDelete()
    }
  }

  // Truncate text for display
  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <Card
      onClick={onClick}
      variant="default"
      size="md"
      className="group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <User className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-gray-900 text-sm">
            {example.actor}
          </span>
        </div>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            onClick={handleEdit}
            variant="ghost"
            size="small"
            className="p-1 text-gray-400 hover:text-blue-600"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleDelete}
            variant="ghost"
            size="small"
            className="p-1 text-gray-400 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Goal */}
      <div className="mb-3">
        <div className="flex items-center space-x-2 mb-1">
          <Target className="h-4 w-4 text-green-600" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Goal
          </span>
        </div>
        <p className="text-sm text-gray-900 leading-relaxed">
          {truncateText(example.goal, 120)}
        </p>
      </div>

      {/* Entry Point */}
      <div className="mb-3">
        <div className="flex items-center space-x-2 mb-1">
          <ArrowRight className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Entry Point
          </span>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          {truncateText(example.entry_point, 100)}
        </p>
      </div>

      {/* Actions Preview */}
      <div className="mb-3">
        <div className="flex items-center space-x-2 mb-1">
          <CheckCircle className="h-4 w-4 text-purple-600" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Actions
          </span>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          {truncateText(example.actions, 100)}
        </p>
      </div>

      {/* Error Preview */}
      {example.error && (
        <div className="mb-3">
          <div className="flex items-center space-x-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Error
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {truncateText(example.error, 80)}
          </p>
        </div>
      )}

      {/* Outcome Preview */}
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-1">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Outcome
          </span>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          {truncateText(example.outcome, 100)}
        </p>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Created {formatDate(example.created_at)}</span>
          <span className="text-blue-600 hover:text-blue-700">
            View details →
          </span>
        </div>
      </div>
    </Card>
  )
}
