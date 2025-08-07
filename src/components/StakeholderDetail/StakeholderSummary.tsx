import React from 'react'
import { FolderOpen, FileText, GitBranch } from 'lucide-react'
import type { Project, ResearchNote, UserJourney } from '../../lib/supabase'

interface StakeholderSummaryProps {
  projects: Project[]
  researchNotes: ResearchNote[]
  userJourneys: UserJourney[]
}

export function StakeholderSummary({ projects, researchNotes, userJourneys }: StakeholderSummaryProps) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <FolderOpen size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
            <p className="text-sm text-gray-600">Projects</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <FileText size={20} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{researchNotes.length}</p>
            <p className="text-sm text-gray-600">Notes & Calls</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <GitBranch size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{userJourneys.length}</p>
            <p className="text-sm text-gray-600">User Journeys</p>
          </div>
        </div>
      </div>
    </div>
  )
}