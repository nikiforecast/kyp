import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { SupabaseAuthError } from '../../lib/supabase'
import { resolveActiveWorkspaceId, setActiveWorkspaceId } from '../../lib/activeWorkspace'
import { MainContentRenderer } from './MainContentRenderer'
import { WorkspaceSwitcher } from '../WorkspaceSwitcher'
import {
  getWorkspaces,
  getProjectByShortId,
  getStakeholders,
  getStakeholderByShortId,
  createStakeholder,
  updateStakeholder,
  deleteStakeholder,
  getWorkspaceUsers,
  createUser,
  updateUserRole,
  removeUser,
  createWorkspace,
  activatePendingWorkspaceInvites,
  getUserRoles,
  createUserRole,
  updateCustomUserRole,
  deleteUserRole,
  getPlatforms,
  createPlatform,
  updatePlatform,
  deletePlatform,
  getLawFirms,
  getLawFirmByShortId,
  createLawFirm,
  updateLawFirm,
  deleteLawFirm,
  importLawFirmsFromCSV,
  deleteAllLawFirms,
  importStakeholdersFromCSV,
} from '../../lib/database'
import type {
  Workspace,
  Project,
  Stakeholder,
  WorkspaceUser,
  UserRole,
  Platform,
  LawFirm,
} from '../../lib/supabase'

interface WorkspaceDataFetcherProps {
  routeParams: Record<string, string | undefined>
  pathname: string
  onViewChange: (view: string) => void
  onSignOut: () => void
}

export function WorkspaceDataFetcher({
  routeParams,
  pathname,
  onViewChange,
  onSignOut,
}: WorkspaceDataFetcherProps) {
  const navigate = useNavigate()
  const { user, isPlatformAdmin } = useAuth()

  const [currentView, setCurrentView] = useState('user-journeys')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedStakeholder, setSelectedStakeholder] = useState<Stakeholder | null>(null)
  const [stakeholderDetailOrigin, setStakeholderDetailOrigin] = useState<'project' | 'manager' | 'law-firm'>('manager')
  const [originLawFirm, setOriginLawFirm] = useState<LawFirm | null>(null)
  const [isNavigatingBack, setIsNavigatingBack] = useState(false)
  const [selectedLawFirm, setSelectedLawFirm] = useState<LawFirm | null>(null)

  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState('')
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUser[]>([])
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [lawFirms, setLawFirms] = useState<LawFirm[]>([])

  const [loading, setLoading] = useState(true)
  const [loadingBackgroundData, setLoadingBackgroundData] = useState(true)

  useEffect(() => {
    if (user) {
      fetchAllData()
    }
  }, [user?.id])

  useEffect(() => {
    const handleRouteNavigation = async () => {
      if (isNavigatingBack) {
        setIsNavigatingBack(false)
        return
      }

      const clearSelections = () => {
        setSelectedProject(null)
        setSelectedStakeholder(null)
        setSelectedLawFirm(null)
      }

      if (pathname === '/') {
        setCurrentView('user-journeys')
        onViewChange('user-journeys')
        clearSelections()
        return
      }

      if (pathname === '/law-firms') {
        setCurrentView('law-firms')
        onViewChange('law-firms')
        clearSelections()
        return
      }

      if (pathname === '/stakeholders') {
        setCurrentView('stakeholders')
        onViewChange('stakeholders')
        clearSelections()
        return
      }

      if (pathname === '/settings') {
        setCurrentView('settings')
        onViewChange('settings')
        clearSelections()
        return
      }

      if (pathname === '/design-system') {
        setCurrentView('design-system')
        onViewChange('design-system')
        clearSelections()
        return
      }

      if (pathname === '/user-journeys' || pathname.startsWith('/user-journeys/')) {
        setCurrentView('user-journeys')
        onViewChange('user-journeys')
        clearSelections()
        return
      }

      if (pathname === '/user-journey-creator') {
        setCurrentView('user-journey-creator')
        onViewChange('user-journey-creator')
        clearSelections()
        return
      }

      const shortId = routeParams.shortId ? parseInt(routeParams.shortId) : null
      if (!shortId) return

      if (pathname.startsWith('/project/')) {
        const project = await getProjectByShortId(shortId)
        if (project) {
          setSelectedProject(project)
          setCurrentView('project-dashboard')
        } else {
          navigate('/')
        }
      } else if (pathname.startsWith('/stakeholder/')) {
        const stakeholder = await getStakeholderByShortId(shortId)
        if (stakeholder) {
          setSelectedStakeholder(stakeholder)
          setCurrentView('stakeholder-detail')
        } else {
          navigate('/')
        }
      } else if (pathname.startsWith('/law-firm/')) {
        const lawFirm = await getLawFirmByShortId(shortId)
        if (lawFirm) {
          setSelectedLawFirm(lawFirm)
          setCurrentView('law-firm-detail')
        } else {
          navigate('/')
        }
      } else if (pathname.startsWith('/user-journey/')) {
        setCurrentView('user-journey-creator')
        onViewChange('user-journey-creator')
        clearSelections()
      }
    }

    handleRouteNavigation()
  }, [pathname, routeParams])

  const fetchAllData = async () => {
    try {
      setLoading(true)

      await activatePendingWorkspaceInvites()

      const [workspacesData, workspaceUsersData] = await Promise.all([
        getWorkspaces(),
        getWorkspaceUsers(),
      ])

      setWorkspaces(workspacesData)
      setWorkspaceUsers(workspaceUsersData)

      const resolvedId = resolveActiveWorkspaceId(workspacesData, workspaceUsersData, user?.id)
      setActiveWorkspaceIdState(resolvedId)
      setLoading(false)

      setLoadingBackgroundData(true)

      const [stakeholdersData, userRolesData, platformsData, lawFirmsData] = await Promise.all([
        getStakeholders(),
        getUserRoles(),
        getPlatforms(),
        getLawFirms(),
      ])

      setStakeholders(stakeholdersData)
      setUserRoles(userRolesData)
      setPlatforms(platformsData)
      setLawFirms(lawFirmsData)
      setLoadingBackgroundData(false)
    } catch (error) {
      if (error instanceof SupabaseAuthError) {
        await onSignOut()
      } else {
        console.error('Error fetching data:', error)
      }
      setLoadingBackgroundData(false)
    } finally {
      setLoading(false)
    }
  }

  const handleBackFromLawFirm = () => {
    setSelectedLawFirm(null)
    setCurrentView('law-firms')
    setIsNavigatingBack(true)
    navigate('/law-firms')
  }

  const handleBackToWorkspace = () => {
    navigate('/')
  }

  const handleCreateStakeholder = async (
    name: string,
    userRoleId?: string,
    lawFirmId?: string,
    visitorId?: string,
    department?: string,
    pendoRole?: string
  ) => {
    const stakeholder = await createStakeholder(name, visitorId, userRoleId, lawFirmId, undefined, department, pendoRole)
    if (stakeholder) {
      setStakeholders([stakeholder, ...stakeholders])
    }
  }

  const handleUpdateStakeholder = async (
    stakeholderId: string,
    updates: { name?: string; user_role_id?: string; law_firm_id?: string; notes?: string; visitor_id?: string; department?: string; pendo_role?: string }
  ) => {
    const updatedStakeholder = await updateStakeholder(stakeholderId, updates)
    if (updatedStakeholder) {
      setStakeholders(stakeholders.map(s => s.id === stakeholderId ? updatedStakeholder : s))
      if (selectedStakeholder?.id === stakeholderId) {
        setSelectedStakeholder(updatedStakeholder)
      }
    }
  }

  const handleDeleteStakeholder = async (stakeholderId: string) => {
    const success = await deleteStakeholder(stakeholderId)
    if (success) {
      setStakeholders(stakeholders.filter(s => s.id !== stakeholderId))
    }
  }

  const handleSelectStakeholder = (stakeholder: Stakeholder) => {
    setStakeholderDetailOrigin(currentView === 'stakeholders' ? 'manager' : 'project')
    setOriginLawFirm(null)
    navigate(`/stakeholder/${stakeholder.short_id}`)
  }

  const handleSelectStakeholderFromLawFirm = (stakeholder: Stakeholder, lawFirm: LawFirm) => {
    setStakeholderDetailOrigin('law-firm')
    setOriginLawFirm(lawFirm)
    navigate(`/stakeholder/${stakeholder.short_id}`)
  }

  const handleStakeholderBack = () => {
    if (stakeholderDetailOrigin === 'manager') {
      setSelectedStakeholder(null)
      onViewChange('stakeholders')
      setIsNavigatingBack(true)
      navigate('/stakeholders')
    } else if (stakeholderDetailOrigin === 'law-firm' && originLawFirm) {
      setSelectedStakeholder(null)
      navigate(`/law-firm/${originLawFirm.short_id}`)
    } else if (stakeholderDetailOrigin === 'project' && selectedProject) {
      setSelectedStakeholder(null)
      navigate(`/project/${selectedProject.short_id}`)
    } else {
      setSelectedStakeholder(null)
      onViewChange('user-journeys')
      navigate('/')
    }
  }

  const handleSelectWorkspace = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId)
    setActiveWorkspaceIdState(workspaceId)
  }

  const handleCreateWorkspace = async (name: string) => {
    const result = await createWorkspace(name)
    if (result.workspace) {
      setWorkspaces(prev => [result.workspace!, ...prev])
      const users = await getWorkspaceUsers()
      setWorkspaceUsers(users)
      handleSelectWorkspace(result.workspace.id)
    }
    return result
  }

  const accessibleWorkspaces = useMemo(() => {
    const memberWorkspaceIds = new Set(
      workspaceUsers
        .filter(wu => wu.status === 'active' && wu.user_id === user?.id)
        .map(wu => wu.workspace_id)
    )
    return workspaces.filter(w => memberWorkspaceIds.has(w.id))
  }, [workspaces, workspaceUsers, user?.id])

  const filteredWorkspaceUsers = useMemo(
    () => workspaceUsers.filter(wu => wu.workspace_id === activeWorkspaceId),
    [workspaceUsers, activeWorkspaceId]
  )

  const filteredStakeholders = useMemo(
    () => stakeholders.filter(s => s.workspace_id === activeWorkspaceId),
    [stakeholders, activeWorkspaceId]
  )

  const filteredUserRoles = useMemo(
    () => userRoles.filter(r => r.workspace_id === activeWorkspaceId),
    [userRoles, activeWorkspaceId]
  )

  const filteredPlatforms = useMemo(
    () => platforms.filter(p => p.workspace_id === activeWorkspaceId),
    [platforms, activeWorkspaceId]
  )

  const filteredLawFirms = useMemo(
    () => lawFirms.filter(f => f.workspace_id === activeWorkspaceId),
    [lawFirms, activeWorkspaceId]
  )

  const handleCreateUser = async (
    email: string,
    role: 'admin' | 'member',
    fullName?: string,
    team?: 'Design' | 'Product' | 'Engineering' | 'Other'
  ) => {
    const result = await createUser(email, role, fullName, team, activeWorkspaceId)
    if (result.user) {
      setWorkspaceUsers([result.user, ...workspaceUsers])
    }
    return result
  }

  const handleUpdateWorkspaceUser = async (
    userId: string,
    updates: { full_name?: string; team?: 'Design' | 'Product' | 'Engineering' | 'Other' | null }
  ) => {
    const { updateWorkspaceUser } = await import('../../lib/database')
    const success = await updateWorkspaceUser(userId, updates)
    if (success) {
      setWorkspaceUsers(workspaceUsers.map(u => u.id === userId ? { ...u, ...updates } : u))
    }
  }

  const handleUpdateWorkspaceUserRole = async (userId: string, newRole: 'admin' | 'member') => {
    const success = await updateUserRole(userId, newRole)
    if (success) {
      setWorkspaceUsers(workspaceUsers.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
  }

  const handleRemoveUser = async (userId: string) => {
    const success = await removeUser(userId)
    if (success) {
      setWorkspaceUsers(workspaceUsers.filter(u => u.id !== userId))
    }
  }

  const handleCreateUserRole = async (name: string, colour: string, icon?: string) => {
    const userRole = await createUserRole(name, colour, icon)
    if (userRole) {
      setUserRoles([userRole, ...userRoles])
    }
  }

  const handleUpdateUserRoleDefinition = async (roleId: string, updates: { name?: string; colour?: string; icon?: string }) => {
    const updatedRole = await updateCustomUserRole(roleId, updates)
    if (updatedRole) {
      setUserRoles(userRoles.map(role => role.id === roleId ? updatedRole : role))
      return true
    }
    return false
  }

  const handleDeleteUserRole = async (roleId: string) => {
    const success = await deleteUserRole(roleId)
    if (success) {
      setUserRoles(userRoles.filter(role => role.id !== roleId))
    }
  }

  const handleCreatePlatform = async (name: string, colour: string, logo?: string) => {
    const existingPlatform = platforms.find(p => p.name.toLowerCase() === name.toLowerCase())
    if (existingPlatform) {
      const refreshedPlatforms = await getPlatforms()
      setPlatforms(refreshedPlatforms)
      return
    }

    const platform = await createPlatform(name, colour, logo)
    if (platform) {
      setPlatforms([platform, ...platforms])
    }
  }

  const handleUpdatePlatform = async (platformId: string, updates: { name?: string; colour?: string; logo?: string }) => {
    const updatedPlatform = await updatePlatform(platformId, updates)
    if (updatedPlatform) {
      setPlatforms(platforms.map(platform => platform.id === platformId ? updatedPlatform : platform))
      return true
    }
    return false
  }

  const handleDeletePlatform = async (platformId: string) => {
    const success = await deletePlatform(platformId)
    if (success) {
      setPlatforms(platforms.filter(platform => platform.id !== platformId))
    }
  }

  const handleNavigateToStakeholdersWithFilter = (userRoleId: string) => {
    onViewChange('stakeholders')
    localStorage.setItem('stakeholder_filter_user_role', userRoleId)
    navigate('/stakeholders')
  }

  const handleCreateLawFirm = async (name: string, structure: 'centralised' | 'decentralised', status: 'active' | 'inactive') => {
    const lawFirm = await createLawFirm(name, structure, status)
    if (lawFirm) {
      setLawFirms([lawFirm, ...lawFirms])
    }
    return lawFirm
  }

  const handleUpdateLawFirm = async (id: string, updates: Partial<Omit<LawFirm, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>>) => {
    const updatedFirm = await updateLawFirm(id, updates)
    if (updatedFirm) {
      setLawFirms(lawFirms.map(firm => firm.id === id ? updatedFirm : firm))
    }
    return updatedFirm
  }

  const handleDeleteLawFirm = async (id: string) => {
    const success = await deleteLawFirm(id)
    if (success) {
      setLawFirms(lawFirms.filter(firm => firm.id !== id))
    }
  }

  const handleImportLawFirmsCSV = async (csvData: string) => {
    const results = await importLawFirmsFromCSV(csvData)
    if (results.success > 0) {
      setLawFirms(await getLawFirms())
    }
    return results
  }

  const handleDeleteAllLawFirms = async () => {
    const success = await deleteAllLawFirms()
    if (success) {
      setLawFirms([])
    }
  }

  const handleImportStakeholdersCSV = async (csvData: string) => {
    const results = await importStakeholdersFromCSV(csvData)
    if (results.success > 0) {
      setStakeholders(await getStakeholders())
    }
    return results
  }

  const workspaceId = activeWorkspaceId

  return (
    <>
      <WorkspaceSwitcher
        workspaces={accessibleWorkspaces}
        activeWorkspaceId={workspaceId}
        onSelectWorkspace={handleSelectWorkspace}
      />
      <MainContentRenderer
        currentView={currentView}
        loading={loading}
        loadingBackgroundData={loadingBackgroundData}
        workspaceId={workspaceId}
        workspaces={accessibleWorkspaces}
        isPlatformAdmin={isPlatformAdmin}
        stakeholders={filteredStakeholders}
        workspaceUsers={filteredWorkspaceUsers}
        userRoles={filteredUserRoles}
        platforms={filteredPlatforms}
        lawFirms={filteredLawFirms}
        selectedProject={selectedProject}
        selectedStakeholder={selectedStakeholder}
        stakeholderDetailOrigin={stakeholderDetailOrigin}
        originLawFirm={originLawFirm}
        selectedLawFirm={selectedLawFirm}
        user={user}
        onBackToWorkspace={handleBackToWorkspace}
        onCreateStakeholder={handleCreateStakeholder}
        onUpdateStakeholder={handleUpdateStakeholder}
        onDeleteStakeholder={handleDeleteStakeholder}
        onSelectStakeholder={handleSelectStakeholder}
        onSelectStakeholderFromLawFirm={handleSelectStakeholderFromLawFirm}
        onStakeholderBack={handleStakeholderBack}
        onCreateUser={handleCreateUser}
        onUpdateWorkspaceUser={handleUpdateWorkspaceUser}
        onUpdateWorkspaceUserRole={handleUpdateWorkspaceUserRole}
        onRemoveUser={handleRemoveUser}
        onCreateUserRole={handleCreateUserRole}
        onUpdateUserRoleDefinition={handleUpdateUserRoleDefinition}
        onDeleteUserRole={handleDeleteUserRole}
        onNavigateToStakeholdersWithFilter={handleNavigateToStakeholdersWithFilter}
        onCreatePlatform={handleCreatePlatform}
        onUpdatePlatform={handleUpdatePlatform}
        onDeletePlatform={handleDeletePlatform}
        onCreateLawFirm={handleCreateLawFirm}
        onUpdateLawFirm={handleUpdateLawFirm}
        onDeleteLawFirm={handleDeleteLawFirm}
        onImportLawFirmsCSV={handleImportLawFirmsCSV}
        onDeleteAllLawFirms={handleDeleteAllLawFirms}
        onImportStakeholdersCSV={handleImportStakeholdersCSV}
        onBackFromLawFirm={handleBackFromLawFirm}
        onCreateWorkspace={handleCreateWorkspace}
        onSelectWorkspace={handleSelectWorkspace}
        onSignOut={onSignOut}
      />
    </>
  )
}
