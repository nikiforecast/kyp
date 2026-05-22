import React, { useState, useEffect } from 'react'
import { Target, Calendar, User, ExternalLink } from 'lucide-react'
import { getProjectDecisions, type ProjectDecision } from '../lib/database/services/decisionService'
import type { Project } from '../lib/supabase'

interface DecisionHistoryProps {
  project: Project
  onNavigateToSource?: (sourceType: string, sourceId: string) => void
}

export const DecisionHistory: React.FC<DecisionHistoryProps> = ({
  project,
  onNavigateToSource,
}) => {
  const [decisions, setDecisions] = useState<ProjectDecision[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDecisions = async () => {
      setLoading(true)
      try {
        const projectDecisions = await getProjectDecisions(project.id)
        setDecisions(projectDecisions.filter(d => d.source_type === 'example'))
      } catch (error) {
        console.error('Error fetching decisions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDecisions()
  }, [project.id])

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Decision History</h2>
        <p className="text-gray-600 mt-2">Decisions from examples in {project.name}</p>
      </div>

      {decisions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Target size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No decisions found</h3>
          <p className="text-gray-600">No example decisions have been recorded for this project yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {decisions.map((decision) => (
            <div key={decision.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1.5">
                    <Target size={16} className="text-orange-600" />
                  </div>
                  <div>
                    <button
                      onClick={() => onNavigateToSource?.(decision.source_type, decision.source_id)}
                      className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors group"
                    >
                      {decision.source_name}
                      {decision.source_short_id && (
                        <span className="text-sm text-gray-500">#{decision.source_short_id}</span>
                      )}
                      <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-1 rounded-full text-xs font-medium border bg-orange-50 text-orange-700 border-orange-200">
                        Example
                      </span>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar size={14} />
                        {formatDate(decision.created_at)}
                      </div>
                      {decision.user_id && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <User size={14} />
                          User
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pl-7">
                <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                  <p className="text-green-800 font-medium whitespace-pre-wrap">{decision.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
