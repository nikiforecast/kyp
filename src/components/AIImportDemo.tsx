import React, { useState } from 'react'
import { Upload, Eye, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from './DesignSystem/components/Button'
import { Card } from './DesignSystem/components/Card'

export const AIImportDemo: React.FC = () => {
  const [showDemo, setShowDemo] = useState(false)

  if (!showDemo) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              🚀 New: AI-Powered Screenshot Import
            </h3>
            <p className="text-blue-700 mb-4">
              Upload a screenshot of your Miro board and let AI extract Examples automatically. 
              Perfect for quickly importing user journey examples from your team sessions.
            </p>
            <div className="flex items-center space-x-4 text-sm text-blue-600">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Drag & drop upload
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                AI text extraction
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Bulk import
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={() => setShowDemo(true)}
              variant="outline"
              icon={Eye}
            >
              See Demo
            </Button>
            <Button
              onClick={() => setShowDemo(false)}
              variant="ghost"
              size="small"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          AI Screenshot Import Demo
        </h3>
        <Button
          onClick={() => setShowDemo(false)}
          variant="ghost"
          size="small"
        >
          Close
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Before */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Before: Manual Entry</h4>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm">
              <div className="font-medium text-gray-700">Actor:</div>
              <div className="text-gray-600">New User</div>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm">
              <div className="font-medium text-gray-700">Goal:</div>
              <div className="text-gray-600">Sign up for service</div>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm">
              <div className="font-medium text-gray-700">Actions:</div>
              <div className="text-gray-600">Click sign up, fill form, verify email</div>
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-500">
            ⏱️ Time: 5-10 minutes per example
          </div>
        </div>

        {/* After */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">After: AI Import</h4>
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
              <div className="font-medium text-green-700">Actor:</div>
              <div className="text-green-600">New User</div>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
              <div className="font-medium text-green-700">Goal:</div>
              <div className="text-green-600">Sign up for service</div>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
              <div className="font-medium text-green-700">Actions:</div>
              <div className="text-green-600">Click sign up, fill form, verify email</div>
            </div>
          </div>
          <div className="mt-3 text-sm text-green-600">
            ⚡ Time: 30 seconds for multiple examples
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h5 className="font-medium text-blue-900 mb-1">How it works</h5>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Upload a screenshot of your Miro board with post-it notes</li>
              <li>2. AI analyzes the image and extracts text from each post-it</li>
              <li>3. Smart mapping assigns text to Example fields (Actor, Goal, etc.)</li>
              <li>4. Review and import multiple Examples at once</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          onClick={() => setShowDemo(false)}
          variant="primary"
        >
          Got it!
        </Button>
      </div>
    </div>
  )
}