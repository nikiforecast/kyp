import React, { useState } from 'react'
import { BlockNoteEditor } from './BlockNoteEditor'

export function BlockNoteShowcase() {
  const [content, setContent] = useState<any>(null)
  const [isEditable, setIsEditable] = useState(true)

  const handleContentChange = (newContent: any) => {
    setContent(newContent)
    console.log('Editor content changed:', newContent)
  }

  const toggleEditable = () => {
    setIsEditable(!isEditable)
  }

  const clearContent = () => {
    setContent(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">BlockNote Editor</h2>
        <p className="text-gray-600">
          A powerful block-based rich text editor with real-time collaboration features.
        </p>
      </div>

      

      {/* Editor */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <BlockNoteEditor
          initialContent={content}
          editable={isEditable}
          onChange={handleContentChange}
          placeholder="Start writing your content here... You can use the toolbar above to format text, add headings, lists, and more!"
         
        />
      </div>

      {/* Content Preview */}
      {content && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Content JSON Preview</h3>
          <div className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-64">
            <pre className="text-sm text-gray-700">
              {JSON.stringify(content, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Key Features</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Block-based editing</li>
            <li>• Rich text formatting</li>
            <li>• Headings and lists</li>
            <li>• Code blocks</li>
            <li>• Tables and images</li>
            <li>• Real-time collaboration</li>
          </ul>
        </div>

        <div className="p-4 bg-green-50 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-2">Usage</h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Import from DesignSystem</li>
            <li>• Configure initial content</li>
            <li>• Handle content changes</li>
            <li>• Toggle editability</li>
            <li>• Customize styling</li>
            <li>• Save content as JSON</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
