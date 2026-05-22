import React, { useState, useEffect } from 'react'
import { CheckSquare, MessageSquare, Plus, Edit, Trash2, Save, X, Users, Building2, FileText, GitBranch, Image } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import {
  getProjectProgressStatus,
  updateProjectProgressStatus,
  getProjectProgressComments,
  createProjectProgressComment,
  updateProjectProgressComment,
  deleteProjectProgressComment,
  PROGRESS_QUESTIONS,
  type ProgressQuestionKey
} from '../lib/database'
import type { Project, ProjectProgressStatus, ProjectProgressComment, ProblemOverview, Stakeholder, UserRole, LawFirm, Task } from '../lib/supabase'

interface ProjectProgressSectionProps {
  project: Project
  problemOverview: ProblemOverview
  assignedStakeholders: Stakeholder[]
  userRoles: UserRole[]
  lawFirms: LawFirm[]
  projectTasks: Task[]
}

interface QuestionConfig {
  key: ProgressQuestionKey
  title: string
  description?: string
  isDynamic?: boolean
  dynamicInfo?: string
}

export function ProjectProgressSection({
  project,
  problemOverview,
  assignedStakeholders,
  userRoles,
  lawFirms,
  projectTasks
}: ProjectProgressSectionProps) {
  const { user } = useAuth()
  const [progressStatus, setProgressStatus] = useState<Record<string, boolean>>({})
  const [comments, setComments] = useState<Record<string, ProjectProgressComment[]>>({})
  const [newComments, setNewComments] = useState<Record<string, string>>({})
  const [showCommentForm, setShowCommentForm] = useState<Record<string, boolean>>({})
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pendingCompletion, setPendingCompletion] = useState<Record<string, boolean>>({})

  const questions: QuestionConfig[] = [

    {
      key: PROGRESS_QUESTIONS.CENTRALISED_DECENTRALISED,
      title: 'Have both centralised and decentralised accounts been included in discovery?',
      isDynamic: true,
      dynamicInfo: 'Shows current totals based on assigned stakeholders'
    },
    {
      key: PROGRESS_QUESTIONS.USER_ROLES,
      title: 'Have different user roles been included in discovery?',
      isDynamic: true,
      dynamicInfo: 'Shows current total of unique user roles'
    },
    {
      key: PROGRESS_QUESTIONS.CORE_JOURNEYS,
      title: 'Have all core user journeys been created?',
      isDynamic: true,
      dynamicInfo: 'Shows current number of user journeys created'
    },
    {
      key: PROGRESS_QUESTIONS.PENDO_TRACKING,
      title: 'Has benchmark feature tracking been setup in Pendo?'
    },
    {
      key: PROGRESS_QUESTIONS.INTERNAL_STAKEHOLDERS,
      title: 'Have all required internal stakeholders been involved?',
      isDynamic: true,
      dynamicInfo: 'Shows current total of Legl - Internal stakeholders'
    },
    {
      key: PROGRESS_QUESTIONS.FIGMA_LIBRARY,
      title: 'Has Figma Design library been updated?'
    },
    {
      key: PROGRESS_QUESTIONS.OUTSTANDING_TASKS,
      title: 'Outstanding tasks:',
      isDynamic: true,
      dynamicInfo: 'Shows current outstanding tasks'
    }
  ]

  useEffect(() => {
    loadProgressData()
  }, [project.id])
  const loadProgressData = async () => {
    try {
      setLoading(true)
      
      // Load progress status
      const statusData = await getProjectProgressStatus(project.id)
      const statusMap: Record<string, boolean> = {}
      statusData.forEach(status => {
        statusMap[status.question_key] = status.is_completed
      })
      setProgressStatus(statusMap)
      
      // Load comments for all questions
      const commentsMap: Record<string, ProjectProgressComment[]> = {}
      for (const question of questions) {
        const questionComments = await getProjectProgressComments(project.id, question.key)
        commentsMap[question.key] = questionComments
      }
      setComments(commentsMap)
      
      // Auto-complete dynamic questions
      updateDynamicQuestions(statusMap)
    } catch (error) {
      console.error('Error loading progress data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateDynamicQuestions = async (currentStatus: Record<string, boolean>) => {
    // Problem Definition - check if all fields are completed
    const isProblemDefinitionComplete = !!(
      problemOverview.what_is_the_problem?.trim() &&
      problemOverview.should_we_solve_it?.trim()
    )
    
    // Update dynamic status in local state (but don't auto-save to database)
    if (isProblemDefinitionComplete !== currentStatus[PROGRESS_QUESTIONS.PROBLEM_DEFINITION]) {
      setProgressStatus(prev => ({
        ...prev,
        [PROGRESS_QUESTIONS.PROBLEM_DEFINITION]: isProblemDefinitionComplete
      }))
    }
  }

  const handleStatusChange = async (questionKey: ProgressQuestionKey, isCompleted: boolean) => {
    if (!user) return
    
    if (isCompleted) {
      // Show comment form and mark as pending completion
      setShowCommentForm(prev => ({
        ...prev,
        [questionKey]: true
      }))
      setPendingCompletion(prev => ({
        ...prev,
        [questionKey]: true
      }))
    } else {
      // Allow unchecking immediately
      setSaving(true)
      try {
        const updatedStatus = await updateProjectProgressStatus(project.id, questionKey, isCompleted)
        if (updatedStatus) {
          setProgressStatus(prev => ({
            ...prev,
            [questionKey]: isCompleted
          }))
          setShowCommentForm(prev => ({
            ...prev,
            [questionKey]: false
          }))
          setPendingCompletion(prev => ({
            ...prev,
            [questionKey]: false
          }))
        }
      } catch (error) {
        console.error('Error updating progress status:', error)
      } finally {
        setSaving(false)
      }
    }
  }

  const handleToggleCommentForm = (questionKey: ProgressQuestionKey) => {
    setShowCommentForm(prev => ({
      ...prev,
      [questionKey]: !prev[questionKey]
    }))
    
    // If closing the form and there was a pending completion, cancel it
    if (showCommentForm[questionKey] && pendingCompletion[questionKey]) {
      setPendingCompletion(prev => ({
        ...prev,
        [questionKey]: false
      }))
    }
  }

  const handleAddComment = async (questionKey: ProgressQuestionKey) => {
    if (!user || !newComments[questionKey]?.trim()) return
    
    setSaving(true)
    try {
      const comment = await createProjectProgressComment(
        project.id,
        questionKey,
        newComments[questionKey].trim(),
        user.id
      )
      
      if (comment) {
        setComments(prev => ({
          ...prev,
          [questionKey]: [...(prev[questionKey] || []), comment]
        }))
        setNewComments(prev => ({
          ...prev,
          [questionKey]: ''
        }))
        setShowCommentForm(prev => ({
          ...prev,
          [questionKey]: false
        }))
        
        // If this was a pending completion, now mark as complete
        if (pendingCompletion[questionKey]) {
          const updatedStatus = await updateProjectProgressStatus(project.id, questionKey, true)
          if (updatedStatus) {
            setProgressStatus(prev => ({
              ...prev,
              [questionKey]: true
            }))
            setPendingCompletion(prev => ({
              ...prev,
              [questionKey]: false
            }))
          }
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleEditComment = (comment: ProjectProgressComment) => {
    setEditingComment(comment.id)
    setEditingText(comment.comment_text)
  }

  const handleSaveEdit = async () => {
    if (!editingComment || !editingText.trim()) return
    
    setSaving(true)
    try {
      const updatedComment = await updateProjectProgressComment(editingComment, editingText.trim())
      if (updatedComment) {
        setComments(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(questionKey => {
            updated[questionKey] = updated[questionKey].map(comment =>
              comment.id === editingComment ? updatedComment : comment
            )
          })
          return updated
        })
        setEditingComment(null)
        setEditingText('')
      }
    } catch (error) {
      console.error('Error updating comment:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteComment = async (commentId: string, questionKey: ProgressQuestionKey) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return
    
    setSaving(true)
    try {
      const success = await deleteProjectProgressComment(commentId)
      if (success) {
        setComments(prev => ({
          ...prev,
          [questionKey]: prev[questionKey].filter(comment => comment.id !== commentId)
        }))
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
    } finally {
      setSaving(false)
    }
  }

  const getDynamicInfo = (questionKey: ProgressQuestionKey): { info: string | null; highlight: boolean } => {
    switch (questionKey) {
      case PROGRESS_QUESTIONS.CENTRALISED_DECENTRALISED:
        const centralisedCount = assignedStakeholders.filter(s => {
          const lawFirm = lawFirms.find(f => f.id === s.law_firm_id)
          return lawFirm?.structure === 'centralised'
        }).length
        
        const decentralisedCount = assignedStakeholders.filter(s => {
          const lawFirm = lawFirms.find(f => f.id === s.law_firm_id)
          return lawFirm?.structure === 'decentralised'
        }).length
        
        return {
          info: `Current: ${centralisedCount} centralised, ${decentralisedCount} decentralised accounts`,
          highlight: centralisedCount === 0 || decentralisedCount === 0
        }
      
      case PROGRESS_QUESTIONS.USER_ROLES:
        const roleBreakdown = new Map<string, number>()
        
        assignedStakeholders.forEach(stakeholder => {
          if (stakeholder.user_role_id) {
            const userRole = userRoles.find(role => role.id === stakeholder.user_role_id)
            if (userRole) {
              const roleName = userRole.name
              roleBreakdown.set(roleName, (roleBreakdown.get(roleName) || 0) + 1)
            }
          }
        })
        
        if (roleBreakdown.size === 0) {
          return {
            info: 'Current: No user roles assigned',
            highlight: true
          }
        }
        
        const roleDetails = Array.from(roleBreakdown.entries())
          .map(([roleName, count]) => `${roleName} (${count})`)
          .join(', ')
        
        return {
          info: `Current: ${roleDetails}`,
          highlight: roleBreakdown.size === 1
        }
      
      case PROGRESS_QUESTIONS.INTERNAL_STAKEHOLDERS:
        const internalStakeholders = assignedStakeholders.filter(s => {
          const userRole = userRoles.find(role => role.id === s.user_role_id)
          return userRole?.name === 'Legl - Internal'
        })
        return {
          info: `Current: ${internalStakeholders.length} Legl - Internal stakeholders`,
          highlight: internalStakeholders.length < 2
        }
      
      case PROGRESS_QUESTIONS.CORE_JOURNEYS:
        return {
          info: `Current: 0 user journeys created`,
          highlight: true
        }
      
      case PROGRESS_QUESTIONS.OUTSTANDING_TASKS:
        const outstandingTasks = projectTasks.filter(task => task.status === 'not_complete')
        if (outstandingTasks.length === 0) {
          return { info: null, highlight: false } // This will hide the question
        }
        return {
          info: outstandingTasks.map(task => task.name).join(', '),
          highlight: false
        }
      
      default:
        return { info: null, highlight: false }
    }
  }

  const getOutstandingTasksCount = (): number => {
    return projectTasks.filter(task => task.status === 'not_complete').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Progress</h2>
        <p className="text-gray-600">Track completion status and add comments for key project milestones</p>
      </div>

      <div className="space-y-6">
        {questions.filter((question) => {
          // Hide outstanding tasks question if there are no outstanding tasks
          if (question.key === PROGRESS_QUESTIONS.OUTSTANDING_TASKS) {
            const outstandingTasksCount = getOutstandingTasksCount()
            return outstandingTasksCount > 0
          }
          return true
        }).map((question) => {
          const isCompleted = progressStatus[question.key] || false
          const questionComments = comments[question.key] || []
          const dynamicResult = getDynamicInfo(question.key)
          const dynamicInfo = dynamicResult.info
          const shouldHighlight = dynamicResult.highlight
          const outstandingTasksCount = question.key === PROGRESS_QUESTIONS.OUTSTANDING_TASKS ? getOutstandingTasksCount() : null
          const showForm = showCommentForm[question.key] || false
          
          return (
            <div key={question.key} className="bg-white rounded-xl p-6 border border-gray-200">
              {/* Question Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={(e) => handleStatusChange(question.key, e.target.checked)}
                        disabled={saving}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <h3 className="text-lg font-semibold text-gray-900">{question.title}</h3>
                    </label>
                    {isCompleted && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        Completed
                      </span>
                    )}
                  </div>
                  
                  {question.description && (
                    <p className="text-sm text-gray-600 mb-2">{question.description}</p>
                  )}
                  
                  {dynamicInfo && (
                    <div className={`flex items-center gap-2 text-sm mb-2 ${
                      shouldHighlight 
                        ? 'bg-orange-100 text-orange-700 p-2 rounded-lg border border-orange-200' 
                        : 'text-gray-700'
                    }`}>
                      {question.key === PROGRESS_QUESTIONS.CENTRALISED_DECENTRALISED && <Building2 size={16} />}
                      {question.key === PROGRESS_QUESTIONS.USER_ROLES && <Users size={16} />}
                      {question.key === PROGRESS_QUESTIONS.INTERNAL_STAKEHOLDERS && <Users size={16} />}
                      {question.key === PROGRESS_QUESTIONS.CORE_JOURNEYS && <GitBranch size={16} />}
                      {question.key === PROGRESS_QUESTIONS.OUTSTANDING_TASKS && <FileText size={16} />}
                      <span>{dynamicInfo}</span>
                    </div>
                  )}
                  
                </div>
              </div>

              {/* Comments Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-gray-600" />
                    <h4 className="text-sm font-medium text-gray-700">
                      Comments ({questionComments.length})
                    </h4>
                  </div>
                  
                  {!showForm && (
                    <button
                      onClick={() => handleToggleCommentForm(question.key)}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Plus size={14} />
                      Add comment
                    </button>
                  )}
                </div>

                {/* Existing Comments */}
                {questionComments.length > 0 && (
                  <div className="space-y-3">
                    {questionComments.map((comment) => (
                      <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                        {editingComment === comment.id ? (
                          <div className="space-y-3">
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                              disabled={saving}
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleSaveEdit}
                                disabled={saving || !editingText.trim()}
                                className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                              >
                                <Save size={14} />
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingComment(null)
                                  setEditingText('')
                                }}
                                disabled={saving}
                                className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <X size={14} />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-gray-900 mb-2">{comment.comment_text}</p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-500">
                                {new Date(comment.created_at).toLocaleDateString()} at{' '}
                                {new Date(comment.created_at).toLocaleTimeString()}
                              </p>
                              {user && comment.user_id === user.id && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleEditComment(comment)}
                                    className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                    title="Edit comment"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteComment(comment.id, question.key)}
                                    className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                    title="Delete comment"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Comment Form */}
                {showForm && (
                  <div className="space-y-3">
                    <textarea
                      value={newComments[question.key] || ''}
                      onChange={(e) => setNewComments(prev => ({
                        ...prev,
                        [question.key]: e.target.value
                      }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Add a comment..."
                      disabled={saving}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddComment(question.key)}
                        disabled={saving || !newComments[question.key]?.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        <Save size={16} />
                        {pendingCompletion[question.key] ? 'Save & Complete' : 'Save Comment'}
                      </button>
                      <button
                        onClick={() => handleToggleCommentForm(question.key)}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X size={16} />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}