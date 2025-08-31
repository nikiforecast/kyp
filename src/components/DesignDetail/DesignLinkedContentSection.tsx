import React from 'react'
import { BookOpen, FileText } from 'lucide-react'
import type { UserStory, ResearchNote } from '../../lib/supabase'

interface DesignLinkedContentSectionProps {
  linkedUserStories: UserStory[]
  linkedResearchNotes: ResearchNote[]
}

export function DesignLinkedContentSection({
  linkedUserStories,
  linkedResearchNotes
}: DesignLinkedContentSectionProps) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Linked Content
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Stories */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">User Stories ({linkedUserStories.length})</h4>
          {linkedUserStories.length > 0 ? (
            <div className="space-y-2">
              {linkedUserStories.map((story) => (
                <div key={story.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen size={14} style={{ color: '#6b42d1' }} />
                    <p className="font-medium text-gray-900">{story.name}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Created {new Date(story.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No linked user stories</p>
          )}
        </div>

        {/* Research Notes */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Notes & Calls ({linkedResearchNotes.length})</h4>
          {linkedResearchNotes.length > 0 ? (
            <div className="space-y-2">
              {linkedResearchNotes.map((note) => (
                <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText size={14} className="text-indigo-600" />
                    <p className="font-medium text-gray-900">{note.name}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {note.note_date 
                      ? new Date(note.note_date).toLocaleDateString()
                      : `Created ${new Date(note.created_at).toLocaleDateString()}`
                    }
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No linked notes & calls</p>
          )}
        </div>
      </div>
    </div>
  )
}