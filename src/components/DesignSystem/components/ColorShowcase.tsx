import React from 'react'

export function ColorShowcase() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="text-left">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-4">
          Colour System
        </h2>
        <p className="text-gray-600">
          A comprehensive color palette used throughout the platform for consistent design.
        </p>
      </div>

      {/* Primary Colors */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Primary Colors</h3>
        <div className="space-y-6">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="space-y-3">
              <div className="h-20 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold">Blue 600</span>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">Primary Blue</p>
                <p className="text-sm text-gray-600">bg-blue-600</p>
                <p className="text-xs text-gray-500">Main brand color, buttons, links</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-20 bg-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold">Blue 700</span>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">Primary Blue Hover</p>
                <p className="text-sm text-gray-600">bg-blue-700</p>
                <p className="text-xs text-gray-500">Hover states, active elements</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-20 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold">Indigo 600</span>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">Primary Indigo</p>
                <p className="text-sm text-gray-600">bg-indigo-600</p>
                <p className="text-xs text-gray-500">Secondary brand color, accents</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Colors */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Secondary Colors</h3>
        <div className="space-y-6">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="space-y-3">
              <div className="h-20 bg-teal-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold">Teal 500</span>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">Secondary Teal</p>
                <p className="text-sm text-gray-600">bg-teal-500</p>
                <p className="text-xs text-gray-500">Secondary buttons, highlights</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-20 bg-cyan-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold">Cyan 600</span>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">Secondary Cyan</p>
                <p className="text-sm text-gray-600">bg-cyan-600</p>
                <p className="text-xs text-gray-500">Accent elements, tertiary actions</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-20 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#6b42d1' }}>
                <span className="text-white font-semibold">Primary Purple</span>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">Primary Purple</p>
                <p className="text-sm text-gray-600">#6b42d1</p>
                <p className="text-xs text-gray-500">Special elements, premium features</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gray Scale */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Gray Scale</h3>
        <div className="space-y-6">
          <div className="flex items-center gap-6 flex-wrap">
          <div className="space-y-3">
            <div className="h-20 bg-gray-50 rounded-lg flex items-center justify-center">
              <span className="text-gray-900 font-semibold">Gray 50</span>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">Light Gray</p>
              <p className="text-sm text-gray-600">bg-gray-50</p>
              <p className="text-xs text-gray-500">Backgrounds, subtle borders</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-900 font-semibold">Gray 100</span>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">Light Gray</p>
              <p className="text-sm text-gray-600">bg-gray-100</p>
              <p className="text-xs text-gray-500">Card backgrounds, hover states</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-gray-900 font-semibold">Gray 200</span>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">Medium Gray</p>
              <p className="text-sm text-gray-600">bg-gray-200</p>
              <p className="text-xs text-gray-500">Borders, dividers</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-300 rounded-lg flex items-center justify-center">
              <span className="text-gray-900 font-semibold">Gray 300</span>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">Medium Gray</p>
              <p className="text-sm text-gray-600">bg-gray-300</p>
              <p className="text-xs text-gray-500">Input borders, disabled states</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-400 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold">Gray 400</span>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">Medium Gray</p>
              <p className="text-sm text-gray-600">bg-gray-400</p>
              <p className="text-xs text-gray-500">Placeholder text, icons</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold">Gray 500</span>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">Medium Gray</p>
              <p className="text-sm text-gray-600">bg-gray-500</p>
              <p className="text-xs text-gray-500">Muted text, captions</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold">Gray 600</span>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">Medium Gray</p>
              <p className="text-sm text-gray-600">bg-gray-600</p>
              <p className="text-xs text-gray-500">Secondary text, descriptions</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold">Gray 700</span>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">Dark Gray</p>
              <p className="text-sm text-gray-600">bg-gray-700</p>
              <p className="text-xs text-gray-500">Body text, main content</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold">Gray 800</span>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">Dark Gray</p>
              <p className="text-sm text-gray-600">bg-gray-800</p>
              <p className="text-xs text-gray-500">Strong text, emphasis</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold">Gray 900</span>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">Darkest Gray</p>
              <p className="text-sm text-gray-600">bg-gray-900</p>
              <p className="text-xs text-gray-500">Headings, primary text</p>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Semantic Colors */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Semantic Colors</h3>
        <div className="space-y-6">
          <div className="flex items-center gap-6 flex-wrap">
          <div className="space-y-3">
            <div className="h-20 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold">Green 500</span>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">Success</p>
              <p className="text-sm text-gray-600">bg-green-500</p>
              <p className="text-xs text-gray-500">Success messages, confirmations</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-20 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold">Red 500</span>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">Error</p>
              <p className="text-sm text-gray-600">bg-red-500</p>
              <p className="text-xs text-gray-500">Error messages, warnings</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-20 bg-yellow-500 rounded-lg flex items-center justify-center">
              <span className="text-gray-900 font-semibold">Yellow 500</span>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">Warning</p>
              <p className="text-sm text-gray-600">bg-yellow-500</p>
              <p className="text-xs text-gray-500">Warning messages, alerts</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-20 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold">Blue 500</span>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">Info</p>
              <p className="text-sm text-gray-600">bg-blue-500</p>
              <p className="text-xs text-gray-500">Information messages, tips</p>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Text Colors */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Text Colors</h3>
        <div className="space-y-6">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="space-y-3">
              <div className="h-20 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-900 font-semibold">Text Gray 900</span>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">Primary Text</p>
                <p className="text-sm text-gray-600">text-gray-900</p>
                <p className="text-xs text-gray-500">Headings, important content</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-20 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-700 font-semibold">Text Gray 700</span>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">Body Text</p>
                <p className="text-sm text-gray-600">text-gray-700</p>
                <p className="text-xs text-gray-500">Main content, body text</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-20 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-600 font-semibold">Text Gray 600</span>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">Secondary Text</p>
                <p className="text-sm text-gray-600">text-gray-600</p>
                <p className="text-xs text-gray-500">Secondary content, descriptions</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-20 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500 font-semibold">Text Gray 500</span>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">Muted Text</p>
                <p className="text-sm text-gray-600">text-gray-500</p>
                <p className="text-xs text-gray-500">Captions, metadata</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-20 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-semibold">Text Blue 600</span>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">Link Text</p>
                <p className="text-sm text-gray-600">text-blue-600</p>
                <p className="text-xs text-gray-500">Links, interactive elements</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-20 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold bg-gray-900 rounded px-2 py-1">Text White</span>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">White Text</p>
                <p className="text-sm text-gray-600">text-white</p>
                <p className="text-xs text-gray-500">Text on dark backgrounds</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
