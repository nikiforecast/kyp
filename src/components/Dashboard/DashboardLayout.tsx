import React from 'react'
import { LogOut, Home, FolderOpen, Users, UserPlus, Building2, Tag, Settings, LayoutDashboard, Palette } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface MenuItem {
  id: string
  label: string
  icon: React.ComponentType<{ size?: number }>
}

interface DashboardLayoutProps {
  currentView: string
  onViewChange: (view: string) => void
  user: User | null
  onSignOut: () => void
  children: React.ReactNode
}

export function DashboardLayout({ 
  currentView, 
  onViewChange, 
  user, 
  onSignOut, 
  children 
}: DashboardLayoutProps) {
  const menuItems: MenuItem[] = [
    { id: 'projects', label: 'Projects', icon: FolderOpen },
    { id: 'workspace-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'law-firms', label: 'Law Firms', icon: Building2 },
    { id: 'themes', label: 'Themes', icon: Tag },
    { id: 'stakeholders', label: 'Stakeholders', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'design-system', label: 'Design System', icon: Palette },
  ]

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Compact Workspace Navigation */}
      <div className="w-16 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-3 border-b border-gray-200">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">KYP</span>
          </div>
        </div>

        {/* Navigation Icons */}
        <nav className="flex-1 p-2">
          <ul className="space-y-2">
            {menuItems.map(item => {
              const Icon = item.icon
              const isActive = currentView === item.id
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onViewChange(item.id)}
                    className={`group relative w-12 h-12 flex items-center justify-center rounded-lg transition-all ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    title={item.label}
                  >
                    <Icon size={20} />
                    {/* Tooltip */}
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-2 border-t border-gray-200">
          <button
            onClick={() => {
              console.log('🔵 DashboardLayout: Logout button clicked')
              onSignOut()
            }}
            className="group relative w-12 h-12 flex items-center justify-center rounded-lg transition-all text-gray-700 hover:bg-red-50 hover:text-red-600"
            title={user?.email ? `Logout of ${user.email}` : "Logout"}
          >
            <LogOut size={20} />
            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {user?.email ? `Logout of ${user.email}` : "Logout"}
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 flex overflow-hidden">
        {children}
      </main>
    </div>
  )
}