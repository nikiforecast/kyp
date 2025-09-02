import React, { useState, useEffect } from 'react'
import { X, User, Target, ArrowRight, CheckCircle, AlertTriangle, Save } from 'lucide-react'
import { Button } from './DesignSystem/components/Button'
import type { Example } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface ExampleFormProps {
  projectId: string
  example?: Example | null
  onSubmit: (exampleData: Omit<Example, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onClose: () => void
}

export const ExampleForm: React.FC<ExampleFormProps> = ({ 
  projectId, 
  example, 
  onSubmit, 
  onClose 
}) => {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    actor: '',
    goal: '',
    entry_point: '',
    actions: '',
    error: '',
    outcome: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form with existing data if editing
  useEffect(() => {
    if (example) {
      setFormData({
        actor: example.actor,
        goal: example.goal,
        entry_point: example.entry_point,
        actions: example.actions,
        error: example.error,
        outcome: example.outcome
      })
    }
  }, [example])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.actor.trim()) {
      newErrors.actor = 'Actor is required'
    }
    if (!formData.goal.trim()) {
      newErrors.goal = 'Goal is required'
    }
    if (!formData.entry_point.trim()) {
      newErrors.entry_point = 'Entry point is required'
    }
    if (!formData.actions.trim()) {
      newErrors.actions = 'Actions are required'
    }
    if (!formData.error.trim()) {
      newErrors.error = 'Error description is required'
    }
    if (!formData.outcome.trim()) {
      newErrors.outcome = 'Outcome is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    if (!user) {
      setErrors({ general: 'User not authenticated' })
      return
    }

    setLoading(true)
    try {
      await onSubmit({
        project_id: projectId,
        actor: formData.actor.trim(),
        goal: formData.goal.trim(),
        entry_point: formData.entry_point.trim(),
        actions: formData.actions.trim(),
        error: formData.error.trim(),
        outcome: formData.outcome.trim(),
        created_by: user.id
      })
    } catch (error) {
      console.error('Error submitting example:', error)
      setErrors({ general: 'Failed to save example. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const isEditing = !!example

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Example' : 'Create New Example'}
          </h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="small"
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          {/* Actor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="inline h-4 w-4 mr-2 text-blue-600" />
              Actor
            </label>
            <input
              type="text"
              value={formData.actor}
              onChange={(e) => handleInputChange('actor', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.actor ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., Customer, Admin User, Support Agent"
            />
            {errors.actor && (
              <p className="mt-1 text-sm text-red-600">{errors.actor}</p>
            )}
          </div>

          {/* Goal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Target className="inline h-4 w-4 mr-2 text-green-600" />
              Goal
            </label>
            <textarea
              value={formData.goal}
              onChange={(e) => handleInputChange('goal', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.goal ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="What does the actor want to achieve?"
            />
            {errors.goal && (
              <p className="mt-1 text-sm text-red-600">{errors.goal}</p>
            )}
          </div>

          {/* Entry Point */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ArrowRight className="inline h-4 w-4 mr-2 text-blue-600" />
              Entry Point
            </label>
            <textarea
              value={formData.entry_point}
              onChange={(e) => handleInputChange('entry_point', e.target.value)}
              rows={2}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.entry_point ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="How does the actor enter or start this process?"
            />
            {errors.entry_point && (
              <p className="mt-1 text-sm text-red-600">{errors.entry_point}</p>
            )}
          </div>

          {/* Actions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CheckCircle className="inline h-4 w-4 mr-2 text-purple-600" />
              Actions
            </label>
            <textarea
              value={formData.actions}
              onChange={(e) => handleInputChange('actions', e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.actions ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="What steps does the actor take? (You can use bullet points or paragraphs)"
            />
            {errors.actions && (
              <p className="mt-1 text-sm text-red-600">{errors.actions}</p>
            )}
          </div>

          {/* Error */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <AlertTriangle className="inline h-4 w-4 mr-2 text-orange-600" />
              Error
            </label>
            <textarea
              value={formData.error}
              onChange={(e) => handleInputChange('error', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.error ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="What error or problem does the actor encounter?"
            />
            {errors.error && (
              <p className="mt-1 text-sm text-red-600">{errors.error}</p>
            )}
          </div>

          {/* Outcome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CheckCircle className="inline h-4 w-4 mr-2 text-green-600" />
              Outcome
            </label>
            <textarea
              value={formData.outcome}
              onChange={(e) => handleInputChange('outcome', e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.outcome ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="What is the final result? What does the actor achieve?"
            />
            {errors.outcome && (
              <p className="mt-1 text-sm text-red-600">{errors.outcome}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              size="default"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              icon={Save}
              iconPosition="left"
              variant="primary"
              size="default"
            >
              {isEditing ? 'Save' : 'Create Example'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
