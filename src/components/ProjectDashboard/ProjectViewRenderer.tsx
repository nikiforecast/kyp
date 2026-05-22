import React, { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft,
  FolderOpen,
  BookOpen,
  Zap,
  Clipboard,
  CheckSquare,
  Clock,
  Route,
} from 'lucide-react'
import { ProjectOverview } from '../ProjectOverview'
import { AssignedStakeholders } from '../AssignedStakeholders'
import { PromptBuilderSection } from '../PromptBuilderSection'
import { ExamplesSection } from '../ExamplesSection'
import { ExampleDetailPage } from '../ExampleDetail/ExampleDetailPage'
import { StakeholderDetail } from '../StakeholderDetail'
import { ProjectTaskManager } from '../ProjectTaskManager'
import { ProjectProgressSection } from '../ProjectProgressSection'
import { DecisionHistory } from '../DecisionHistory'
import { ExampleForm } from '../ExampleForm'
import { UserJourneysManager } from '../UserJourneysManager'
import { createExample, updateExample, deleteExample } from '../../lib/database'
import type {
  Project,
  Stakeholder,
  ProblemOverview,
  UserRole,
  LawFirm,
  WorkspaceUser,
  ProjectProgressStatus,
  Task,
  Example,
} from '../../lib/supabase'
import type { User } from '@supabase/supabase-js'
import { useAuth } from '../../hooks/useAuth'

interface ProjectViewRendererProps {
  project: Project
  workspaceUsers: WorkspaceUser[]
  onBack: () => void
  onNavigateToWorkspace?: (view: string) => void
  onSignOut?: () => void
  loading: boolean
  allStakeholders: Stakeholder[]
  userRoles: UserRole[]
  lawFirms: LawFirm[]
  assignedStakeholders: string[]
  memoizedAssignedStakeholders: Stakeholder[]
  getUnassignedStakeholders: () => Stakeholder[]
  problemOverview: ProblemOverview
  projectTasks: Task[]
  allProjectProgressStatus: ProjectProgressStatus[]
  examplesCount: number
  onProblemOverviewChange: (updates: Partial<ProblemOverview>) => void
  onSaveProblemOverview: (updates?: Partial<ProblemOverview>) => Promise<void>
  onAssignStakeholder: (stakeholderId: string) => Promise<void>
  onRemoveStakeholder: (stakeholderId: string) => Promise<void>
}

export function ProjectViewRenderer({
  project,
  workspaceUsers,
  onBack,
  onSignOut,
  loading,
  allStakeholders,
  userRoles,
  lawFirms,
  memoizedAssignedStakeholders,
  getUnassignedStakeholders,
  problemOverview,
  projectTasks,
  allProjectProgressStatus,
  examplesCount,
  onProblemOverviewChange,
  onSaveProblemOverview,
  onAssignStakeholder,
  onRemoveStakeholder,
}: ProjectViewRendererProps) {
  const { user } = useAuth()
  const mainContentRef = useRef<HTMLElement>(null)

  const [currentView, setCurrentView] = useState('dashboard')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedStakeholder, setSelectedStakeholder] = useState<Stakeholder | null>(null)
  const [selectedExample, setSelectedExample] = useState<Example | null>(null)
  const [editingExample, setEditingExample] = useState<Example | null>(null)
  const [refreshingStakeholders, setRefreshingStakeholders] = useState(false)

  useEffect(() => {
    mainContentRef.current?.scrollTo(0, 0)
  }, [currentView])

  const handleProjectNavigation = (viewId: string) => {
    setSelectedStakeholder(null)
    setCurrentView(viewId)
  }

  const handleRefreshProjectStakeholders = async () => {
    setRefreshingStakeholders(true)
    try {
      const { getProjectStakeholders } = await import('../../lib/database')
      await getProjectStakeholders(project.id)
    } catch (error) {
      console.error('Error refreshing project stakeholders:', error)
    } finally {
      setRefreshingStakeholders(false)
    }
  }

  const handleViewExample = (example: Example) => {
    setSelectedExample(example)
    setCurrentView('example-detail')
  }

  const handleBackFromExample = () => {
    setSelectedExample(null)
    setCurrentView('examples')
  }

  const handleEditExample = (example: Example) => {
    setEditingExample(example)
  }

  const handleCreateExample = async (exampleData: Omit<Example, 'id' | 'created_at' | 'updated_at'>) => {
    await createExample(exampleData)
    setCurrentView('examples')
  }

  const handleUpdateExample = async (exampleData: Omit<Example, 'id' | 'created_at' | 'updated_at'>) => {
    if (!editingExample) throw new Error('No example being edited')
    const updatedExample = await updateExample(editingExample.id, exampleData)
    setSelectedExample(updatedExample)
    setEditingExample(null)
  }

  const handleDeleteExample = async (example: Example) => {
    await deleteExample(example.id)
    handleBackFromExample()
  }

  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: FolderOpen },
    { id: 'user-journeys', label: 'User Journeys', icon: Route },
    { id: 'examples', label: 'Examples', icon: BookOpen },
    { id: 'decision-history', label: 'Decision History', icon: Clock },
    { id: 'project-tasks', label: 'Project Tasks', icon: CheckSquare },
    { id: 'project-progress', label: 'Project Progress', icon: Clipboard },
    { id: 'prompt-builder', label: 'Prompt Builder', icon: Zap },
  ]

  const renderContent = () => {
    if (selectedStakeholder) {
      return (
        <StakeholderDetail
          stakeholder={selectedStakeholder}
          userRoles={userRoles}
          lawFirms={lawFirms}
          origin="project"
          backButtonText="All Project Stakeholders"
          onBack={() => {
            setSelectedStakeholder(null)
            setCurrentView('stakeholders')
          }}
          onUpdate={(updates) => {
            setSelectedStakeholder({ ...selectedStakeholder, ...updates })
          }}
        />
      )
    }

    if (currentView === 'example-detail' && selectedExample) {
      return (
        <ExampleDetailPage
          example={selectedExample}
          onBack={handleBackFromExample}
          onEdit={() => handleEditExample(selectedExample)}
          onDelete={() => handleDeleteExample(selectedExample)}
          user={user as User}
          availableUsers={workspaceUsers}
        />
      )
    }

    switch (currentView) {
      case 'dashboard':
        return (
          <ProjectOverview
            project={project}
            assignedStakeholders={memoizedAssignedStakeholders}
            tasks={projectTasks}
            problemOverview={problemOverview}
            userRoles={userRoles}
            lawFirms={lawFirms}
            allProjectProgressStatus={allProjectProgressStatus}
            examplesCount={examplesCount}
            projectTasks={projectTasks}
            onProblemOverviewChange={onProblemOverviewChange}
            onSaveProblemOverview={onSaveProblemOverview}
            onNavigateToStakeholders={() => setCurrentView('stakeholders')}
          />
        )
      case 'project-progress':
        return (
          <ProjectProgressSection
            project={project}
            problemOverview={problemOverview}
            assignedStakeholders={memoizedAssignedStakeholders}
            userRoles={userRoles}
            lawFirms={lawFirms}
            projectTasks={projectTasks}
          />
        )
      case 'stakeholders':
        return (
          <AssignedStakeholders
            assignedStakeholders={memoizedAssignedStakeholders}
            unassignedStakeholders={getUnassignedStakeholders()}
            userRoles={userRoles}
            lawFirms={lawFirms}
            showAssignModal={showAssignModal}
            onShowAssignModal={setShowAssignModal}
            onAssignStakeholder={onAssignStakeholder}
            onRemoveStakeholder={onRemoveStakeholder}
            onRefreshStakeholders={handleRefreshProjectStakeholders}
            refreshing={refreshingStakeholders}
            onViewStakeholder={(stakeholder) => {
              setCurrentView('stakeholder-detail')
              setSelectedStakeholder(stakeholder)
            }}
            onBack={() => setCurrentView('dashboard')}
          />
        )
      case 'user-journeys':
        return <UserJourneysManager projectId={project.id} workspaceId={project.workspace_id} />
      case 'examples':
        return <ExamplesSection projectId={project.id} onViewExample={handleViewExample} />
      case 'project-tasks':
        return <ProjectTaskManager projectId={project.id} workspaceUsers={workspaceUsers} />
      case 'decision-history':
        return (
          <DecisionHistory
            project={project}
            onNavigateToSource={(sourceType) => {
              if (sourceType === 'example') {
                setCurrentView('examples')
              }
            }}
          />
        )
      case 'prompt-builder':
        return <PromptBuilderSection />
      default:
        return (
          <ProjectOverview
            project={project}
            assignedStakeholders={memoizedAssignedStakeholders}
            tasks={projectTasks}
            problemOverview={problemOverview}
            userRoles={userRoles}
            lawFirms={lawFirms}
            allProjectProgressStatus={allProjectProgressStatus}
            examplesCount={examplesCount}
            projectTasks={projectTasks}
            onProblemOverviewChange={onProblemOverviewChange}
            onSaveProblemOverview={onSaveProblemOverview}
            onNavigateToStakeholders={() => setCurrentView('stakeholders')}
          />
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden w-full">
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-3"
          >
            <ArrowLeft size={20} />
            Back to Home
          </button>
          <h1 className="text-lg font-semibold text-gray-900 truncate">{project.name}</h1>
          <p className="text-sm text-gray-500">Project Dashboard</p>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map(item => {
              const Icon = item.icon
              const isActive =
                currentView === item.id ||
                (item.id === 'stakeholders' && currentView === 'stakeholder-detail') ||
                (item.id === 'examples' && (currentView === 'examples' || currentView === 'example-detail'))

              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleProjectNavigation(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      <main className="flex-1 overflow-y-auto" ref={mainContentRef}>
        <div className={
          (currentView === 'stakeholder-detail' && selectedStakeholder) || currentView === 'example-detail'
            ? ''
            : 'p-6'
        }>
          {renderContent()}
        </div>
      </main>

      {editingExample && (
        <ExampleForm
          projectId={project.id}
          example={editingExample}
          onSubmit={handleUpdateExample}
          onClose={() => setEditingExample(null)}
        />
      )}
    </div>
  )
}
