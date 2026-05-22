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
  const [currentDashboardView, setCurrentDashboardView] = useState('user-journeys')

  // Update currentDashboardView based on pathname
  useEffect(() => {
    if (pathname === '/') {
      setCurrentDashboardView('user-journeys')
    } else if (pathname === '/user-journeys') {
      setCurrentDashboardView('user-journeys')
    } else if (pathname === '/user-journey-creator') {
      setCurrentDashboardView('user-journey-creator')
    } else if (pathname === '/law-firms') {
      setCurrentDashboardView('law-firms')
    } else if (pathname === '/stakeholders') {
      setCurrentDashboardView('stakeholders')
    } else if (pathname === '/settings') {
      setCurrentDashboardView('settings')
    } else if (pathname === '/design-system') {
      setCurrentDashboardView('design-system')
    }
  }, [pathname])

  const handleSignOut = async () => {
    await signOut()
    // Force a page reload to ensure the user is properly logged out
    window.location.reload()
  }

  const handleTopLevelNavigation = (viewId: string) => {
    switch (viewId) {
      case 'user-journeys':
        navigate('/')
        break
      case 'law-firms':
        navigate('/law-firms')
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