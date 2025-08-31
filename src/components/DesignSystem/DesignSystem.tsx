import React, { useState } from 'react'
import { Palette, Square, Type, Layout, Layers, Zap, LucideIcon, Maximize2, Table } from 'lucide-react'
import { ButtonShowcase } from './components/ButtonShowcase'
import { TypographyShowcase } from './components/TypographyShowcase'
import { ColorShowcase } from './components/ColorShowcase'
import { ModalShowcase } from './components/ModalShowcase'
import { DataTableShowcase } from './components/DataTableShowcase'
import { CardShowcase } from './components/CardShowcase'

interface NavigationItem {
  id: string
  label: string
  icon: LucideIcon
  component: React.ReactNode
}

interface DesignSystemProps {
  onSignOut: () => void
}



function LayoutShowcase() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Layout</h2>
        <p className="text-gray-600">Layout components and grid system.</p>
      </div>
      <p className="text-gray-500">Layout showcase coming soon...</p>
    </div>
  )
}

function ComponentsShowcase() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Components</h2>
        <p className="text-gray-600">Reusable UI components.</p>
      </div>
      <p className="text-gray-500">Components showcase coming soon...</p>
    </div>
  )
}

function UtilitiesShowcase() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Utilities</h2>
        <p className="text-gray-600">Utility classes and helper functions.</p>
      </div>
      <p className="text-gray-500">Utilities showcase coming soon...</p>
    </div>
  )
}

export function DesignSystem({ onSignOut }: DesignSystemProps) {
  const [selectedComponent, setSelectedComponent] = useState('buttons')

  const navigationItems: NavigationItem[] = [
    {
      id: 'buttons',
      label: 'Buttons',
      icon: Square,
      component: <ButtonShowcase />
    },
    {
      id: 'typography',
      label: 'Typography',
      icon: Type,
      component: <TypographyShowcase />
    },
    {
      id: 'colors',
      label: 'Colors',
      icon: Palette,
      component: <ColorShowcase />
    },
    {
      id: 'modals',
      label: 'Modals',
      icon: Maximize2,
      component: <ModalShowcase />
    },
    {
      id: 'tables',
      label: 'Data Tables',
      icon: Layout,
      component: <DataTableShowcase />
    },
    {
      id: 'cards',
      label: 'Cards',
      icon: Square,
      component: <CardShowcase />
    },
    {
      id: 'layout',
      label: 'Layout',
      icon: Layout,
      component: <LayoutShowcase />
    },
    {
      id: 'components',
      label: 'Components',
      icon: Layers,
      component: <ComponentsShowcase />
    },
    {
      id: 'utilities',
      label: 'Utilities',
      icon: Zap,
      component: <UtilitiesShowcase />
    }
  ]

  const currentComponent = navigationItems.find(item => item.id === selectedComponent)?.component

  return (
    <div className="h-screen flex overflow-hidden w-full min-w-full" style={{
      backgroundImage: `
        linear-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 0, 0, 0.04) 1px, transparent 1px)
      `,
      backgroundSize: '20px 20px',
      backgroundColor: '#f9fafb'
    }}>
      {/* Left Navigation */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#6b42d1' }}>
              <Palette size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Design System</h1>
              <p className="text-sm text-gray-500">Component Library</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigationItems.map(item => {
              const Icon = item.icon
              const isActive = selectedComponent === item.id
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setSelectedComponent(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                      isActive 
                        ? 'text-gray-700 hover:bg-gray-50' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    style={isActive ? {
                      backgroundColor: '#f3f0ff',
                      color: '#6b42d1',
                      border: '1px solid #ddd6fe'
                    } : {}}
                  >
                    <Icon size={18} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      {/* Content Area */}
      <main className="flex-1 overflow-auto w-full">
        <div className="p-8 w-full max-w-none !max-w-none">
          {currentComponent}
        </div>
      </main>
    </div>
  )
}
