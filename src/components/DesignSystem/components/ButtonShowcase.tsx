import React, { useState } from 'react'
import { 
  Plus, 
  Settings, 
  Heart, 
  Star,
  Edit,
  Trash2
} from 'lucide-react'
import { 
  Button, 
  IconButton
} from './Button'

export function ButtonShowcase() {
  const [loading, setLoading] = useState(false)

  const handleLoadingDemo = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 2000)
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="text-left">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-4">
          Button Component Library
        </h2>
        <p className="text-gray-600">
          A clean, simple collection of essential button components.
        </p>
      </div>

      {/* Variants */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Button Variants</h3>
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-3">Primary Variant</h4>
            <div className="flex items-center gap-6 flex-wrap">
              <Button variant="primary">Primary Button</Button>
              <Button variant="primary" icon={Plus}>Primary with Icon</Button>
              <Button variant="primary" loading={loading} onClick={handleLoadingDemo}>
                {loading ? 'Loading...' : 'Primary Loading'}
              </Button>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-3">Secondary Variant</h4>
            <div className="flex items-center gap-6 flex-wrap">
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="secondary" icon={Edit}>Secondary with Icon</Button>
              <Button variant="secondary" loading={loading} onClick={handleLoadingDemo}>
                {loading ? 'Loading...' : 'Secondary Loading'}
              </Button>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-3">Outline Variant</h4>
            <div className="flex items-center gap-6 flex-wrap">
              <Button variant="outline">Outline Button</Button>
              <Button variant="outline" icon={Trash2}>Outline with Icon</Button>
              <Button variant="outline" disabled>Disabled Outline</Button>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-3">Ghost Variant</h4>
            <div className="flex items-center gap-6 flex-wrap">
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="ghost" icon={Settings}>Ghost with Icon</Button>
              <Button variant="ghost" disabled>Disabled Ghost</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sizes */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Button Sizes</h3>
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-3">Default Size</h4>
            <div className="flex items-center gap-6 flex-wrap">
              <Button variant="primary" size="default">Primary</Button>
              <Button variant="secondary" size="default">Secondary</Button>
              <Button variant="outline" size="default">Outline</Button>
              <Button variant="ghost" size="default">Ghost</Button>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-3">Small Size</h4>
            <div className="flex items-center gap-6 flex-wrap">
              <Button variant="primary" size="small">Primary</Button>
              <Button variant="secondary" size="small">Secondary</Button>
              <Button variant="outline" size="small">Outline</Button>
              <Button variant="ghost" size="small">Ghost</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Icon Buttons */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Icon Buttons</h3>
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-3">Icon Button Variants</h4>
            <div className="flex items-center gap-6 flex-wrap">
              <IconButton icon={Plus} size="small" />
              <IconButton icon={Settings} size="default" />
              <IconButton icon={Heart} size="default" variant="primary" />
              <IconButton icon={Star} size="default" variant="secondary" />
              <IconButton icon={Edit} size="default" variant="outline" />
              <IconButton icon={Trash2} size="default" variant="ghost" />
            </div>
          </div>
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-3">Icon Button Sizes</h4>
            <div className="flex items-center gap-6 flex-wrap">
              <IconButton icon={Plus} size="small" variant="primary" />
              <IconButton icon={Plus} size="default" variant="primary" />
            </div>
          </div>
        </div>
      </div>

      {/* States */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Button States</h3>
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-3">Loading State</h4>
            <div className="flex items-center gap-6 flex-wrap">
              <Button loading={loading} variant="primary" onClick={handleLoadingDemo}>
                {loading ? 'Loading...' : 'Click to Load'}
              </Button>
              <Button loading={loading} variant="secondary" onClick={handleLoadingDemo}>
                {loading ? 'Processing...' : 'Process Data'}
              </Button>
              <Button loading={loading} variant="outline" onClick={handleLoadingDemo}>
                {loading ? 'Loading...' : 'Outline Loading'}
              </Button>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-3">Disabled State</h4>
            <div className="flex items-center gap-6 flex-wrap">
              <Button variant="primary" disabled>Disabled Primary</Button>
              <Button variant="secondary" disabled>Disabled Secondary</Button>
              <Button variant="outline" disabled>Disabled Outline</Button>
              <Button variant="ghost" disabled>Disabled Ghost</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Specialized Buttons */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Specialized Buttons</h3>
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-3">Full Width</h4>
            <div className="space-y-4">
              <Button variant="primary" fullWidth>Full Width Primary Button</Button>
              <Button variant="outline" fullWidth>Full Width Outline Button</Button>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-3">Rounded Variants</h4>
            <div className="flex items-center gap-6 flex-wrap">
              <Button variant="primary" rounded="sm">Small Rounded</Button>
              <Button variant="primary" rounded="md">Medium Rounded</Button>
              <Button variant="primary" rounded="lg">Large Rounded</Button>
              <Button variant="primary" rounded="xl">Extra Large Rounded</Button>
              <Button variant="primary" rounded="full">Full Rounded</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

