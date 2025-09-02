import React, { useState, useEffect } from 'react'
import { User, Target, ArrowRight, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, Save, X } from 'lucide-react'
import { ExampleHeader } from './ExampleHeader'
import { HistorySection } from '../common/HistorySection'
import { getExampleComments, createExampleComment, updateExampleComment, deleteExampleComment, updateExample } from '../../lib/database'
import { Button } from '../DesignSystem/components/Button'
import type { Example, ExampleComment, WorkspaceUser } from '../../lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface ExampleDetailPageProps {
  example: Example
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  user: SupabaseUser | null
  availableUsers: WorkspaceUser[]
}

export function ExampleDetailPage({ 
  example, 
  onBack, 
  onEdit,
  onDelete,
  user,
  availableUsers
}: ExampleDetailPageProps) {
  

  const [exampleComments, setExampleComments] = useState<ExampleComment[]>([])
  const [saving, setSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(true)
  
  // Edit state for each field
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{
    actor: string
    goal: string
    entry_point: string
    actions: string
    error: string
    outcome: string
  }>({
    actor: example.actor,
    goal: example.goal,
    entry_point: example.entry_point,
    actions: example.actions,
    error: example.error,
    outcome: example.outcome
  })
  const [currentExample, setCurrentExample] = useState<Example>(example)

  // Update currentExample when the example prop changes
  useEffect(() => {
    setCurrentExample(example)
    // Also update editValues to reflect the new data
    setEditValues({
      actor: example.actor,
      goal: example.goal,
      entry_point: example.entry_point,
      actions: example.actions,
      error: example.error,
      outcome: example.outcome
    })
  }, [example])

  // Load comments when component mounts
  useEffect(() => {
    loadExampleComments()
  }, [currentExample.id])

  const loadExampleComments = async () => {
    try {
      const comments = await getExampleComments(currentExample.id)
      setExampleComments(comments)
    } catch (error) {
      console.error('Error loading example comments:', error)
    }
  }

  const handleAddComment = async (commentText: string) => {
    if (!user) return
    
    setSaving(true)
    try {
      const newComment = await createExampleComment(currentExample.id, commentText, user.id, false)
      if (newComment) {
        setExampleComments(prev => [newComment, ...prev])
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleEditComment = async (commentId: string, commentText: string) => {
    setSaving(true)
    try {
      const updatedComment = await updateExampleComment(commentId, commentText)
      if (updatedComment) {
        setExampleComments(prev => 
          prev.map(comment => 
            comment.id === commentId ? updatedComment : comment
          )
        )
      }
    } catch (error) {
      console.error('Error updating comment:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    setSaving(true)
    try {
      const success = await deleteExampleComment(commentId)
      if (success) {
        setExampleComments(prev => prev.filter(comment => comment.id !== commentId))
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleAddDecision = async (decisionText: string) => {
    if (!user) return
    
    setSaving(true)
    try {
      const newDecision = await createExampleComment(currentExample.id, decisionText, user.id, true)
      if (newDecision) {
        setExampleComments(prev => [newDecision, ...prev])
      }
    } catch (error) {
      console.error('Error adding decision:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleEditDecision = async (_decisionIndex: number, decisionText: string) => {
    // For now, we'll treat decisions the same as comments
    // In the future, we might want to store decisions differently
    const decisionComment = exampleComments.find(comment => comment.is_decision)
    if (decisionComment) {
      await handleEditComment(decisionComment.id, decisionText)
    }
  }

  const handleDeleteDecision = async (_decisionIndex: number) => {
    // For now, we'll treat decisions the same as comments
    const decisionComment = exampleComments.find(comment => comment.is_decision)
    if (decisionComment) {
      await handleDeleteComment(decisionComment.id)
    }
  }

  // Edit handlers

  const handleCancelEdit = () => {
    setEditingField(null)
    setEditValues({
      actor: currentExample.actor,
      goal: currentExample.goal,
      entry_point: currentExample.entry_point,
      actions: currentExample.actions,
      error: currentExample.error,
      outcome: currentExample.outcome
    })
  }

  const handleSaveEdit = async (field: string) => {
    if (!editingField) return
    
    setSaving(true)
    try {
      const updates = { [field]: editValues[field as keyof typeof editValues] }
      const updatedExample = await updateExample(currentExample.id, updates)
      setCurrentExample(updatedExample)
      setEditingField(null)
    } catch (error) {
      console.error('Error updating example:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleEditValueChange = (field: string, value: string) => {
    setEditValues(prev => ({
      ...prev,
      [field]: value
    }))
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

  const renderEditableCard = (
    field: string,
    title: string,
    icon: React.ReactNode,
    content: string,
    iconColor: string
  ) => {
    const isEditing = editingField === field
    
    return (
      <div className="bg-white rounded-lg p-6 border">
        <div className="flex items-center mb-4">
          <div className="flex items-center space-x-3">
            <div className={iconColor}>
              {icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
        </div>
        
        {isEditing ? (
          <div className="space-y-4">
            <textarea
              value={editValues[field as keyof typeof editValues]}
              onChange={(e) => handleEditValueChange(field, e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder={`Enter ${title.toLowerCase()}...`}
            />
            <div className="flex space-x-2">
              <Button
                variant="primary"
                size="small"
                icon={Save}
                onClick={() => handleSaveEdit(field)}
                disabled={saving}
              >
                Save
              </Button>
              <Button
                variant="ghost"
                size="small"
                icon={X}
                onClick={handleCancelEdit}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-gray-900 leading-relaxed">
            {formatText(content)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col w-full">
      {/* Full-width page header */}
      <ExampleHeader 
        example={currentExample} 
        onBack={onBack} 
        onEdit={onEdit}
        onDelete={onDelete}
        availableUsers={availableUsers}
      />

      {/* Content with normal padding */}
      <div className="flex-1 w-full flex">
        {/* Main content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Actor Section */}
            {renderEditableCard(
              'actor',
              'Actor',
              <User className="h-6 w-6" />,
              currentExample.actor,
              'text-blue-600'
            )}

            {/* Goal Section */}
            {renderEditableCard(
              'goal',
              'Goal',
              <Target className="h-6 w-6" />,
              currentExample.goal,
              'text-green-600'
            )}

            {/* Entry Point Section */}
            {renderEditableCard(
              'entry_point',
              'Entry Point',
              <ArrowRight className="h-6 w-6" />,
              currentExample.entry_point,
              'text-blue-600'
            )}

            {/* Actions Section */}
            {renderEditableCard(
              'actions',
              'Actions',
              <CheckCircle className="h-6 w-6" />,
              currentExample.actions,
              'text-purple-600'
            )}

            {/* Error Section */}
            {renderEditableCard(
              'error',
              'Error',
              <AlertTriangle className="h-6 w-6" />,
              currentExample.error,
              'text-orange-600'
            )}

            {/* Outcome Section */}
            {renderEditableCard(
              'outcome',
              'Outcome',
              <CheckCircle className="h-6 w-6" />,
              currentExample.outcome,
              'text-emerald-600'
            )}
          </div>
        </div>

        {/* History Column */}
        <HistorySection
          entityId={currentExample.id}
          entityType="example"
          comments={exampleComments
            .filter(comment => !comment.is_decision) // Only show regular comments, not decisions
            .map(comment => ({
              id: comment.id,
              user_id: comment.user_id,
              comment_text: comment.comment_text,
              created_at: comment.created_at,
              updated_at: comment.updated_at
            }))}
          decisions={exampleComments
            .filter(comment => comment.is_decision)
            .map(comment => comment.comment_text)}
          user={user}
          allUsers={availableUsers}
          showHistory={showHistory}
          onAddComment={handleAddComment}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          onAddDecision={handleAddDecision}
          onEditDecision={handleEditDecision}
          onDeleteDecision={handleDeleteDecision}
          saving={saving}
        />
      </div>

      {/* Toggle History Button */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className={`absolute top-1/2 transform -translate-y-1/2 bg-blue-600 text-white z-50 transition-all duration-300 ease-in-out rounded-l-full rounded-r-none pr-1 pl-2 pt-2 pb-2 ${
          showHistory ? 'right-[384px]' : 'right-0'
        }`}
        title={showHistory ? 'Hide history' : 'Show history'}
      >
        {showHistory ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>
    </div>
  )
}
