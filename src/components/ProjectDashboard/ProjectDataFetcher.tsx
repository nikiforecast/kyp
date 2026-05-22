import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { SupabaseAuthError } from '../../lib/supabase'
import {
  getStakeholders,
  getUserRoles,
  getLawFirms,
  getProblemOverview,
  saveProblemOverview,
  getProjectStakeholders,
  assignStakeholderToProject,
  removeStakeholderFromProject,
  getAllProjectProgressStatus,
  getTasks,
  getExamplesCount,
} from '../../lib/database'
import { ProjectViewRenderer } from './ProjectViewRenderer'
import type {
  Project,
  Stakeholder,
  ProblemOverview,
  UserRole,
  LawFirm,
  WorkspaceUser,
  ProjectProgressStatus,
  Task,
} from '../../lib/supabase'

interface ProjectDataFetcherProps {
  project: Project
  workspaceUsers: WorkspaceUser[]
  onBack: () => void
  onNavigateToWorkspace?: (view: string) => void
  onSignOut?: () => void
}

export function ProjectDataFetcher({
  project,
  workspaceUsers,
  onBack,
  onNavigateToWorkspace,
  onSignOut,
}: ProjectDataFetcherProps) {
  useAuth()

  const [allStakeholders, setAllStakeholders] = useState<Stakeholder[]>([])
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [lawFirms, setLawFirms] = useState<LawFirm[]>([])
  const [assignedStakeholders, setAssignedStakeholders] = useState<string[]>([])
  const [examplesCount, setExamplesCount] = useState(0)
  const [problemOverview, setProblemOverview] = useState<ProblemOverview>({
    id: '',
    project_id: project.id,
    what_is_the_problem: '',
    should_we_solve_it: '',
    understanding_rating: 5,
    risk_level: 5,
    created_at: '',
    updated_at: '',
  })
  const [projectTasks, setProjectTasks] = useState<Task[]>([])
  const [allProjectProgressStatus, setAllProjectProgressStatus] = useState<ProjectProgressStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    loadProblemOverviewData()
    loadProjectStakeholders()
    loadProjectTasks()
    loadProjectProgressStatus()
  }, [project.id])

  const fetchData = async () => {
    try {
      setLoading(true)

      const [stakeholdersData, userRolesData, lawFirmsData, examplesCountData] = await Promise.all([
        getStakeholders(),
        getUserRoles(),
        getLawFirms(),
        getExamplesCount(project.id),
      ])

      setAllStakeholders(stakeholdersData)
      setUserRoles(userRolesData)
      setLawFirms(lawFirmsData)
      setExamplesCount(examplesCountData)
    } catch (error) {
      if (error instanceof SupabaseAuthError) {
        onSignOut?.()
      } else {
        console.error('Error fetching project data:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadProjectStakeholders = async () => {
    try {
      setAssignedStakeholders(await getProjectStakeholders(project.id))
    } catch (error) {
      console.error('Error loading project stakeholders:', error)
    }
  }

  const loadProjectTasks = async () => {
    try {
      setProjectTasks(await getTasks(project.id))
    } catch (error) {
      console.error('Error loading project tasks:', error)
    }
  }

  const loadProjectProgressStatus = async () => {
    try {
      setAllProjectProgressStatus(await getAllProjectProgressStatus())
    } catch (error) {
      console.error('Error loading project progress status:', error)
    }
  }

  const loadProblemOverviewData = async () => {
    try {
      const data = await getProblemOverview(project.id)
      if (data) setProblemOverview(data)
    } catch (error) {
      console.error('Error loading problem overview:', error)
    }
  }

  const handleProblemOverviewChange = (updates: Partial<ProblemOverview>) => {
    setProblemOverview(prev => ({ ...prev, ...updates }))
  }

  const handleSaveProblemOverview = async (updates?: Partial<ProblemOverview>) => {
    try {
      const saved = await saveProblemOverview({ ...problemOverview, ...updates })
      if (saved) setProblemOverview(saved)
    } catch (error) {
      console.error('Error saving problem overview:', error)
    }
  }

  const handleAssignStakeholder = async (stakeholderId: string) => {
    try {
      const success = await assignStakeholderToProject(project.id, stakeholderId)
      if (success) {
        setAssignedStakeholders([...assignedStakeholders, stakeholderId])
      }
    } catch (error) {
      console.error('Error assigning stakeholder:', error)
    }
  }

  const handleRemoveStakeholder = async (stakeholderId: string) => {
    try {
      const success = await removeStakeholderFromProject(project.id, stakeholderId)
      if (success) {
        setAssignedStakeholders(assignedStakeholders.filter(id => id !== stakeholderId))
      }
    } catch (error) {
      console.error('Error removing stakeholder:', error)
    }
  }

  const memoizedAssignedStakeholders = React.useMemo(
    () => allStakeholders.filter(stakeholder => assignedStakeholders.includes(stakeholder.id)),
    [allStakeholders, assignedStakeholders]
  )

  const getUnassignedStakeholders = () =>
    allStakeholders.filter(stakeholder => !assignedStakeholders.includes(stakeholder.id))

  return (
    <ProjectViewRenderer
      project={project}
      workspaceUsers={workspaceUsers}
      onBack={onBack}
      onNavigateToWorkspace={onNavigateToWorkspace}
      onSignOut={onSignOut}
      loading={loading}
      allStakeholders={allStakeholders}
      userRoles={userRoles}
      lawFirms={lawFirms}
      assignedStakeholders={assignedStakeholders}
      memoizedAssignedStakeholders={memoizedAssignedStakeholders}
      getUnassignedStakeholders={getUnassignedStakeholders}
      problemOverview={problemOverview}
      projectTasks={projectTasks}
      allProjectProgressStatus={allProjectProgressStatus}
      examplesCount={examplesCount}
      onProblemOverviewChange={handleProblemOverviewChange}
      onSaveProblemOverview={handleSaveProblemOverview}
      onAssignStakeholder={handleAssignStakeholder}
      onRemoveStakeholder={handleRemoveStakeholder}
    />
  )
}
