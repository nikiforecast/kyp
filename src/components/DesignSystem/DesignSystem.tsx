import React, { useState } from 'react'
import { Palette, Square, Type, Layout, Layers, Zap, LucideIcon } from 'lucide-react'
import { Button } from './components/Button'

interface NavigationItem {
  id: string
  label: string
  icon: LucideIcon
  component: React.ReactNode
}

interface DesignSystemProps {
  onSignOut: () => void
}

// Define showcase components first
function ButtonShowcase() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Buttons</h2>
        <p className="text-gray-600">A collection of button components used throughout the platform.</p>
      </div>

      <div className="space-y-6">
        {/* Primary Buttons */}
        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Primary Buttons</h3>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary" size="sm">Small Primary</Button>
            <Button variant="primary" size="md">Medium Primary</Button>
            <Button variant="primary" size="lg">Large Primary</Button>
          </div>
        </section>

        {/* Secondary Buttons */}
        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Secondary Buttons</h3>
          <div className="flex flex-wrap gap-4">
            <Button variant="secondary" size="sm">Small Secondary</Button>
            <Button variant="secondary" size="md">Medium Secondary</Button>
            <Button variant="secondary" size="lg">Large Secondary</Button>
          </div>
        </section>

        {/* Outline Buttons */}
        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Outline Buttons</h3>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" size="sm">Small Outline</Button>
            <Button variant="outline" size="md">Medium Outline</Button>
            <Button variant="outline" size="lg">Large Outline</Button>
          </div>
        </section>

        {/* Ghost Buttons */}
        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Ghost Buttons</h3>
          <div className="flex flex-wrap gap-4">
            <Button variant="ghost" size="sm">Small Ghost</Button>
            <Button variant="ghost" size="md">Medium Ghost</Button>
            <Button variant="ghost" size="lg">Large Ghost</Button>
          </div>
        </section>

        {/* Danger Buttons */}
        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Danger Buttons</h3>
          <div className="flex flex-wrap gap-4">
            <Button variant="danger" size="sm">Small Danger</Button>
            <Button variant="danger" size="md">Medium Danger</Button>
            <Button variant="danger" size="lg">Large Danger</Button>
          </div>
        </section>

        {/* Disabled States */}
        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Disabled States</h3>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary" size="md" disabled>Disabled Primary</Button>
            <Button variant="secondary" size="md" disabled>Disabled Secondary</Button>
            <Button variant="outline" size="md" disabled>Disabled Outline</Button>
          </div>
        </section>

        {/* With Icons */}
        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">With Icons</h3>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary" size="md" icon="plus">Add Item</Button>
            <Button variant="secondary" size="md" icon="edit">Edit</Button>
            <Button variant="outline" size="md" icon="trash">Delete</Button>
          </div>
        </section>
      </div>
    </div>
  )
}

function TypographyShowcase() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Typography</h2>
        <p className="text-gray-600">Typography system and text styles used throughout the platform.</p>
      </div>
      <p className="text-gray-500">Typography showcase coming soon...</p>
    </div>
  )
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
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Left Navigation */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
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
                        ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
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
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {currentComponent}
        </div>
      </main>
    </div>
  )
}
