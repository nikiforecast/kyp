import React from 'react'
import { Users, FolderOpen, FileText, Calendar, Building2, Palette } from 'lucide-react'
import type { Project, Stakeholder, ResearchNote, WorkspaceUser, LawFirm } from '../lib/supabase'

interface WorkspaceOverviewProps {
  projects: Project[]
  stakeholders: Stakeholder[]
  notes: ResearchNote[]
  workspaceUsers: WorkspaceUser[]
  lawFirms: LawFirm[]
}

export function WorkspaceOverview({ 
  projects, 
  stakeholders, 
  notes, 
  workspaceUsers,
  lawFirms 
}: WorkspaceOverviewProps) {
  const stats = [
    { label: 'Projects', value: projects.length.toString(), icon: FolderOpen, color: 'bg-blue-500' },
    { label: 'Stakeholders', value: stakeholders.length.toString(), icon: Users, color: '#6b42d1' },
    { label: 'Notes & Calls', value: notes.length.toString(), icon: FileText, color: 'bg-indigo-500' },
    { label: 'Team Members', value: workspaceUsers.filter(u => u.status === 'active').length.toString(), icon: Users, color: 'bg-emerald-500' },
    { label: 'Law Firms', value: lawFirms.length.toString(), icon: Building2, color: 'bg-orange-500' }
  ]

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Workspace Overview</h2>
        <p className="text-gray-600">Welcome to your Know Your Project collaborative workspace</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: stat.color.startsWith('#') ? stat.color : undefined }}
                >
                  <Icon size={24} className="text-white" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Projects</h3>
          <div className="space-y-3">
            {projects.slice(0, 3).map((project) => (
              <div key={project.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FolderOpen size={16} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{project.name}</p>
                  <p className="text-sm text-gray-500">Created {new Date(project.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <p className="text-gray-500 text-center py-4">No projects yet</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Notes & Calls</h3>
          <div className="space-y-3">
            {notes.slice(0, 3).map((note) => (
              <div key={note.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <FileText size={16} className="text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{note.name}</p>
                  <p className="text-sm text-gray-500">Created {new Date(note.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {notes.length === 0 && (
              <p className="text-gray-500 text-center py-4">No notes & calls yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}