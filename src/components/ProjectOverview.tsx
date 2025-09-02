import React from 'react'
import { Check, X } from 'lucide-react'
import { FolderOpen, Users, FileText, Edit, AlertTriangle, TrendingUp, CheckSquare, Star, BarChart, Palette, ArrowRight, BookOpen } from 'lucide-react'
import { StakeholderAvatar } from './common/StakeholderAvatar'
import { StructureTag } from '../utils/structureTagStyles'
import { CopyLinkButton } from './common/CopyLinkButton'
import { EditableContentSection } from './common/EditableContentSection'
import { PROGRESS_QUESTIONS } from '../lib/database'
import type { Project, ResearchNote, UserStory, UserJourney, Design, Stakeholder, UserRole, LawFirm, Task, ProblemOverview } from '../lib/supabase'
import type { ProjectProgressStatus } from '../lib/supabase'

interface ProjectOverviewProps {
  project: Project
  assignedStakeholders: Stakeholder[]
  notes: ResearchNote[]
  tasks: Task[]
  problemOverview: ProblemOverview
  userRoles: UserRole[]
  lawFirms: LawFirm[]
  allProjectProgressStatus: ProjectProgressStatus[]
  examplesCount?: number
  onProblemOverviewChange?: (updates: Partial<ProblemOverview>) => void
  onSaveProblemOverview?: (updates?: Partial<ProblemOverview>) => Promise<void>
  projectTasks: Task[]
  onNavigateToStakeholders?: () => void
  onViewNote?: (note: ResearchNote) => void
}

export function ProjectOverview({ 
  project, 
  assignedStakeholders, 
  notes, 
  tasks,
  problemOverview, 
  userRoles, 
  lawFirms,
  allProjectProgressStatus,
  examplesCount = 0,
  projectTasks,
  onProblemOverviewChange,
  onSaveProblemOverview,
  onNavigateToStakeholders,
  onViewNote
}: ProjectOverviewProps) {
  const [originalUnderstandingRating, setOriginalUnderstandingRating] = React.useState(problemOverview.understanding_rating)
  const [showUnderstandingButtons, setShowUnderstandingButtons] = React.useState(false)
  const [savingUnderstanding, setSavingUnderstanding] = React.useState(false)
  const [originalRiskLevel, setOriginalRiskLevel] = React.useState(problemOverview.risk_level)
  const [showRiskButtons, setShowRiskButtons] = React.useState(false)
  const [savingRisk, setSavingRisk] = React.useState(false)

  // Update original rating when problemOverview changes (e.g., on page load)
  React.useEffect(() => {
    setOriginalUnderstandingRating(problemOverview.understanding_rating)
    setOriginalRiskLevel(problemOverview.risk_level)
  }, [problemOverview.understanding_rating])

  const handleUnderstandingRatingChange = (newRating: number) => {
    if (onProblemOverviewChange) {
      onProblemOverviewChange({ understanding_rating: newRating })
    }
    setShowUnderstandingButtons(newRating !== originalUnderstandingRating)
  }

  const handleSaveUnderstandingRating = async () => {
    setSavingUnderstanding(true)
    try {
      if (onSaveProblemOverview) {
        await onSaveProblemOverview()
      }
      setOriginalUnderstandingRating(problemOverview.understanding_rating)
      setShowUnderstandingButtons(false)
    } catch (error) {
      console.error('Error saving understanding rating:', error)
    } finally {
      setSavingUnderstanding(false)
    }
  }

  const handleCancelUnderstandingRating = () => {
    if (onProblemOverviewChange) {
      onProblemOverviewChange({ understanding_rating: originalUnderstandingRating })
    }
    setShowUnderstandingButtons(false)
  }

  const handleRiskLevelChange = (newRiskLevel: number) => {
    if (onProblemOverviewChange) {
      onProblemOverviewChange({ risk_level: newRiskLevel })
    }
    setShowRiskButtons(newRiskLevel !== originalRiskLevel)
  }

  const handleSaveRiskLevel = async () => {
    setSavingRisk(true)
    try {
      if (onSaveProblemOverview) {
        await onSaveProblemOverview()
      }
      setOriginalRiskLevel(problemOverview.risk_level)
      setShowRiskButtons(false)
    } catch (error) {
      console.error('Error saving risk level:', error)
    } finally {
      setSavingRisk(false)
    }
  }

  const handleCancelRiskLevel = () => {
    if (onProblemOverviewChange) {
      onProblemOverviewChange({ risk_level: originalRiskLevel })
    }
    setShowRiskButtons(false)
  }

  const handleSaveWhatIsTheProblem = async (content: string) => {
    if (onSaveProblemOverview) {
      await onSaveProblemOverview({ what_is_the_problem: content })
    }
  }

  const handleSaveShouldWeSolveIt = async (content: string) => {
    if (onSaveProblemOverview) {
      await onSaveProblemOverview({ should_we_solve_it: content })
    }
  }

  const getProjectProgressPercentage = (): number => {
    const projectProgressStatuses = allProjectProgressStatus.filter(status => status.project_id === project.id)
    const totalQuestions = Object.keys(PROGRESS_QUESTIONS).length
    
    if (totalQuestions === 0) return 0
    
    const completedQuestions = projectProgressStatuses.filter(status => status.is_completed).length
    return Math.round((completedQuestions / totalQuestions) * 100)
  }

  const getCompletedQuestionsCount = (): number => {
    const projectProgressStatuses = allProjectProgressStatus.filter(status => status.project_id === project.id)
    return projectProgressStatuses.filter(status => status.is_completed).length
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Overview</h2>
          {project.overview && (
            <p className="text-gray-600 mb-4">{project.overview}</p>
          )}
      
        </div>
        <CopyLinkButton entityType="project" shortId={project.short_id} />
      </div>

      {/* Assigned Stakeholders Breakdown */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Stakeholders Overview</h3>
              <p className="text-sm text-gray-600">{assignedStakeholders.length} stakeholders assigned to this project</p>
            </div>
            <button
              onClick={onNavigateToStakeholders}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              View stakeholders
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* User Roles Section */}
          <div className="w-full">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">User Roles</h4>
            <div className="space-y-2">
              {(() => {
                const roleBreakdown = new Map<string, { count: number, userRole: UserRole }>()
                
                // First, add all internal user roles with count 0
                userRoles.forEach(userRole => {
                  if (userRole.internal) {
                    roleBreakdown.set(userRole.name, { count: 0, userRole: userRole })
                  }
                })
                
                assignedStakeholders.forEach(stakeholder => {
                  if (stakeholder.user_role_id) {
                    const userRole = userRoles.find(role => role.id === stakeholder.user_role_id)
                    if (userRole) {
                      const roleName = userRole.name
                      
                      if (roleBreakdown.has(roleName)) {
                        roleBreakdown.set(roleName, {
                          count: roleBreakdown.get(roleName)!.count + 1,
                          userRole: userRole
                        })
                      } else {
                        roleBreakdown.set(roleName, { count: 1, userRole: userRole })
                      }
                    } else {
                      // Create a placeholder role for unknown roles
                      const unknownRole: UserRole = {
                        id: 'unknown',
                        workspace_id: '',
                        name: 'Unknown Role',
                        colour: '#9CA3AF',
                        icon: 'Person',
                        created_at: '',
                        updated_at: ''
                      }
                      
                      if (roleBreakdown.has('Unknown Role')) {
                        roleBreakdown.set('Unknown Role', {
                          count: roleBreakdown.get('Unknown Role')!.count + 1,
                          userRole: unknownRole
                        })
                      } else {
                        roleBreakdown.set('Unknown Role', { count: 1, userRole: unknownRole })
                      }
                    }
                  } else {
                    // Create a placeholder role for no role assigned
                    const noRole: UserRole = {
                      id: 'no-role',
                      workspace_id: '',
                      name: 'No Role Assigned',
                      colour: '#9CA3AF',
                      icon: 'Person',
                      created_at: '',
                      updated_at: ''
                    }
                    
                    if (roleBreakdown.has('No Role Assigned')) {
                      roleBreakdown.set('No Role Assigned', {
                        count: roleBreakdown.get('No Role Assigned')!.count + 1,
                        userRole: noRole
                      })
                    } else {
                      roleBreakdown.set('No Role Assigned', { count: 1, userRole: noRole })
                    }
                  }
                })
                
                if (roleBreakdown.size === 0) {
                  return (
                    <p className="text-sm text-gray-500">No stakeholders assigned</p>
                  )
                }
                
                return (
                  <div className="space-y-3 w-full">
                    {(() => {
                      // Calculate max count for scaling bars
                      const maxCount = Math.max(...Array.from(roleBreakdown.values()).map(data => data.count))
                      
                      return Array.from(roleBreakdown.entries())
                        .sort(([, dataA], [, dataB]) => {
                          // Sort non-internal roles first, then internal roles
                          const aIsInternal = dataA.userRole.internal || false
                          const bIsInternal = dataB.userRole.internal || false
                          
                          if (aIsInternal === bIsInternal) {
                            // If both are internal or both are non-internal, sort by name
                            return dataA.userRole.name.localeCompare(dataB.userRole.name)
                          }
                          
                          // Non-internal roles (false) come before internal roles (true)
                          return aIsInternal ? 1 : -1
                        })
                        .map(([roleName, data]) => {
                        const percentage = maxCount > 0 ? (data.count / maxCount) * 100 : 0
                        
                        return (
                          <div key={roleName} className="flex items-center gap-3">
                            {/* Icon and Role Name - Fixed width */}
                            <div className="flex items-center gap-2 w-48 flex-shrink-0">
                              <StakeholderAvatar userRole={data.userRole} size="sm" />
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {data.userRole.name}
                              </span>
                            </div>
                            
                            {/* Horizontal Bar Container */}
                            <div className="flex-1 flex items-center gap-3">
                              <div className="flex-1 bg-gray-200 rounded-full h-3 relative overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all duration-300 ease-out"
                                  style={{ 
                                    width: `${percentage}%`,
                                    backgroundColor: data.userRole.colour
                                  }}
                                />
                              </div>
                              
                              {/* Count */}
                              <span className="text-sm font-bold text-gray-900 w-8 text-right">
                                {data.count}
                              </span>
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                )
              })()}
            </div>
          </div>
          
          {/* Law Firm Types Section */}
          <div className="w-full">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Law Firm Types</h4>
            <div className="space-y-3 w-full">
              {(() => {
                // Calculate law firm structure breakdown
                const centralisedCount = assignedStakeholders.filter(stakeholder => {
                  const lawFirm = lawFirms.find(firm => firm.id === stakeholder.law_firm_id)
                  return lawFirm?.structure === 'centralised'
                }).length
                
                const decentralisedCount = assignedStakeholders.filter(stakeholder => {
                  const lawFirm = lawFirms.find(firm => firm.id === stakeholder.law_firm_id)
                  return lawFirm?.structure === 'decentralised'
                }).length
                
                const maxLawFirmCount = Math.max(centralisedCount, decentralisedCount)
                
                if (centralisedCount === 0 && decentralisedCount === 0) {
                  return (
                    <p className="text-sm text-gray-500">No stakeholders assigned</p>
                  )
                }
                
                const lawFirmTypes = []
                
                if (decentralisedCount > 0) {
                  lawFirmTypes.push({
                    type: 'Decentralised',
                    count: decentralisedCount,
                    percentage: maxLawFirmCount > 0 ? (decentralisedCount / maxLawFirmCount) * 100 : 0
                  })
                }
                
                if (centralisedCount > 0) {
                  lawFirmTypes.push({
                    type: 'Centralised',
                    count: centralisedCount,
                    percentage: maxLawFirmCount > 0 ? (centralisedCount / maxLawFirmCount) * 100 : 0
                  })
                }
                
                return lawFirmTypes.map(({ type, count, percentage }) => (
                  <div key={type} className="flex items-center gap-3">
                    {/* Icon and Type Name - Fixed width */}
                    <div className="flex items-center gap-2 w-48 flex-shrink-0">
                      {/* Custom Icon */}
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center relative">
                        {type === 'Centralised' ? (
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: '#253658' }}
                          />
                        ) : (
                          <div 
                            className="w-3 h-3 rounded-full border-2 border-dashed"
                            style={{ borderColor: '#253658', borderWidth:'1px' }}
                          />
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {type}
                      </span>
                    </div>
                    
                    {/* Horizontal Bar Container */}
                    <div className="flex-1 flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-3 relative overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-300 ease-out"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: '#C5CAD3'
                          }}
                        />
                      </div>
                      
                      {/* Count */}
                      <span className="text-sm font-bold text-gray-900 w-8 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                ))
              })()}
            </div>
          </div>
          
          
        </div>
      </div>

            {/* Problem Definition Section - HIDDEN (can be restored later)
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Problem Definition</h3>
          <p className="text-sm text-gray-600">Define and assess the problem for {project.name}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EditableContentSection
            title="What is the problem?"
            initialContent={problemOverview.what_is_the_problem || ''}
            placeholder="Describe the problem you're trying to solve..."
            onSave={handleSaveWhatIsTheProblem}
          />

          <EditableContentSection
            title="Should we solve it?"
            initialContent={problemOverview.should_we_solve_it || ''}
            placeholder="Explain why this problem is worth solving..."
            onSave={handleSaveShouldWeSolveIt}
          />
        </div>
      </div>
      */}     

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Notes & Calls</h3>
        <div className="space-y-3">
          {notes.slice(0, 3).map((note) => (
            <div 
              key={note.id} 
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              onClick={() => onViewNote?.(note)}
            >
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FileText size={16} className="text-indigo-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900">{note.name}</p>
                  {(() => {
                    const displayDate = note.note_date ? new Date(note.note_date) : new Date(note.created_at)
                    const isFutureDate = displayDate > new Date()
                    return isFutureDate ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        Upcoming
                      </span>
                    ) : null
                  })()}
                </div>
                <p className="text-sm text-gray-500">
                  {note.note_date 
                    ? new Date(note.note_date).toLocaleDateString()
                    : `Created ${new Date(note.created_at).toLocaleDateString()}`
                  }
                </p>
              </div>
            </div>
          ))}
          {notes.length === 0 && (
            <p className="text-gray-500 text-center py-4">No notes & calls yet</p>
          )}
        </div>
      </div>
    </div>
  )
}