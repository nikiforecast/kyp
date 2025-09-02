import React, { useState } from 'react'
import { BlockNoteEditor } from './BlockNoteEditor'

export function BlockNoteUsageExample() {
  const [noteContent, setNoteContent] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(true)

  const handleSave = () => {
    // Here you would typically save to your database
    console.log('Saving note content:', noteContent)
    alert('Note saved! Check console for content.')
  }

  const handleToggleEdit = () => {
    setIsEditing(!isEditing)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">BlockNote Integration Example</h1>
        <p className="text-gray-600">
          This shows how to integrate BlockNote editor in a real application context
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={handleToggleEdit}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isEditing 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isEditing ? 'Preview Mode' : 'Edit Mode'}
          </button>
          
          <span className="text-sm text-gray-600">
            Mode: {isEditing ? 'Editing' : 'Preview'}
          </span>
        </div>

        <button
          onClick={handleSave}
          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
        >
          Save Note
        </button>
      </div>

      {/* Editor */}
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Note Editor</h2>
        </div>
        <BlockNoteEditor
          initialContent={noteContent}
          editable={isEditing}
          onChange={setNoteContent}
          placeholder="Start writing your note here... Use the toolbar to format text, add headings, lists, and more!"
          className="min-h-[500px] p-4"
        />
      </div>

      {/* Content Summary */}
      {noteContent && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Content Summary</h3>
          <div className="text-sm text-blue-800">
            <p>Blocks: {noteContent.length}</p>
            <p>Last updated: {new Date().toLocaleString()}</p>
            <p>Status: {isEditing ? 'Editing' : 'Preview'}</p>
          </div>
        </div>
      )}

      {/* Integration Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-yellow-50 rounded-lg">
          <h4 className="font-semibold text-yellow-900 mb-2">Integration Tips</h4>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Use in forms for rich text input</li>
            <li>• Integrate with note-taking features</li>
            <li>• Save content as JSON to database</li>
            <li>• Load existing content on edit</li>
            <li>• Handle content validation</li>
            <li>• Implement auto-save functionality</li>
          </ul>
        </div>

        <div className="p-4 bg-indigo-50 rounded-lg">
          <h4 className="font-semibold text-indigo-900 mb-2">Use Cases</h4>
          <ul className="text-sm text-indigo-800 space-y-1">
            <li>• Project descriptions</li>
            <li>• Meeting notes</li>
            <li>• Documentation</li>
            <li>• Rich text comments</li>
            <li>• Content management</li>
            <li>• Collaborative editing</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
