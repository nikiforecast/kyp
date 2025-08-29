import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { DashboardLayout } from './Dashboard/DashboardLayout'
import { WorkspaceDataFetcher } from './Dashboard/WorkspaceDataFetcher'

interface DashboardProps {
  routeParams: Record<string, string | undefined>
  pathname: string
}

export function Dashboard({ routeParams, pathname }: DashboardProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [currentDashboardView, setCurrentDashboardView] = useState('projects')

  // Update currentDashboardView based on pathname
  useEffect(() => {
    console.log('🔵 Dashboard: pathname changed to:', pathname)
    
    if (pathname === '/') {
      setCurrentDashboardView('projects')
    } else if (pathname === '/workspace-dashboard') {
      setCurrentDashboardView('workspace-dashboard')
    } else if (pathname === '/law-firms') {
      setCurrentDashboardView('law-firms')
    } else if (pathname === '/themes') {
      setCurrentDashboardView('themes')
    } else if (pathname === '/stakeholders') {
      setCurrentDashboardView('stakeholders')
    } else if (pathname === '/settings') {
      setCurrentDashboardView('settings')
    } else if (pathname === '/design-system') {
      setCurrentDashboardView('design-system')
    } else if (pathname.startsWith('/project/') || 
               pathname.startsWith('/note/') || 
               pathname.startsWith('/user-story/') || 
               pathname.startsWith('/user-journey/') || 
               pathname.startsWith('/design/') || 
               pathname.startsWith('/stakeholder/') || 
               pathname.startsWith('/law-firm/') || 
               pathname.startsWith('/theme/')) {
      // For entity detail pages, we don't need to set a specific view
      // The WorkspaceDataFetcher will handle the routing
      console.log('🔵 Dashboard: Entity detail route detected')
    }
  }, [pathname])

  const handleSignOut = async () => {
    console.log('🔵 Dashboard: handleSignOut called')
    await signOut()
    console.log('🔵 Dashboard: signOut completed, reloading page')
    // Force a page reload to ensure the user is properly logged out
    window.location.reload()
  }

  const handleTopLevelNavigation = (viewId: string) => {
    switch (viewId) {
      case 'projects':
        navigate('/')
        break
      case 'workspace-dashboard':
        navigate('/workspace-dashboard')
        break
      case 'law-firms':
        navigate('/law-firms')
        break
      case 'themes':
        navigate('/themes')
        break
      case 'stakeholders':
        navigate('/stakeholders')
        break
      case 'settings':
        navigate('/settings')
        break
      case 'design-system':
        navigate('/design-system')
        break
      default:
        navigate('/')
        break
    }
  }

  return (
    <DashboardLayout
      currentView={currentDashboardView}
      onViewChange={handleTopLevelNavigation}
      user={user}
      onSignOut={handleSignOut}
    >
      <WorkspaceDataFetcher
        routeParams={routeParams}
        pathname={pathname}
        onViewChange={setCurrentDashboardView}
        onSignOut={handleSignOut}
      />
    </DashboardLayout>
  )
}