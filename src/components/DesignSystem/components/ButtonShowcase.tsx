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
    <div className="space-y-12 w-full min-w-full">
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
          <div className="flex items-center gap-6 flex-wrap">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
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

      {/* With Icons */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">With Icons</h3>
        <div className="space-y-6">
          <div className="flex items-center gap-6 flex-wrap">
            <Button variant="primary" icon={Plus}>Add Item</Button>
            <Button variant="secondary" icon={Edit}>Edit</Button>
            <Button variant="outline" icon={Trash2}>Delete</Button>
            <Button variant="ghost" icon={Settings}>Settings</Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Loading State</h3>
        <div className="space-y-6">
          <div className="flex items-center gap-6 flex-wrap">
            <Button loading={loading} variant="primary" onClick={handleLoadingDemo}>
              {loading ? 'Loading...' : 'Click to Load'}
            </Button>
            <Button loading={loading} variant="secondary" onClick={handleLoadingDemo}>
              {loading ? 'Processing...' : 'Process Data'}
            </Button>
          </div>
        </div>
      </div>

      {/* Icon Buttons */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Icon Buttons</h3>
        <div className="space-y-6">
          <div className="flex items-center gap-6 flex-wrap">
            <IconButton icon={Plus} size="small" />
            <IconButton icon={Settings} size="default" />
            <IconButton icon={Heart} size="default" variant="primary" />
            <IconButton icon={Star} size="default" variant="secondary" />
          </div>
        </div>
      </div>
    </div>
  )
}

