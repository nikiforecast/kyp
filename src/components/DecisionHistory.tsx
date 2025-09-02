import React, { useState, useEffect } from 'react'
import { FileText, BookOpen, Palette, Calendar, User, ExternalLink, Target } from 'lucide-react'
import { getProjectDecisions, type ProjectDecision } from '../lib/database/services/decisionService'
import type { Project } from '../lib/supabase'

interface DecisionHistoryProps {
  project: Project
  onNavigateToSource?: (sourceType: string, sourceId: string) => void
}

export const DecisionHistory: React.FC<DecisionHistoryProps> = ({
  project,
  onNavigateToSource
}) => {
  const [decisions, setDecisions] = useState<ProjectDecision[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'note' | 'user_story' | 'design' | 'example'>('all')

  useEffect(() => {
    const fetchDecisions = async () => {
      setLoading(true)
      try {
        const projectDecisions = await getProjectDecisions(project.id)
        setDecisions(projectDecisions)
      } catch (error) {
        console.error('Error fetching decisions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDecisions()
  }, [project.id])

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'note':
        return <FileText size={16} className="text-blue-600" />
      case 'user_story':
        return <BookOpen size={16} className="text-green-600" />
      case 'design':
        return <Palette size={16} style={{ color: '#6b42d1' }} />
      case 'example':
        return <Target size={16} className="text-orange-600" />
      default:
        return <FileText size={16} className="text-gray-600" />
    }
  }

  const getSourceLabel = (sourceType: string) => {
    switch (sourceType) {
      case 'note':
        return 'Note'
      case 'user_story':
        return 'User Story'
      case 'design':
        return 'Design'
      case 'example':
        return 'Example'
      default:
        return 'Unknown'
    }
  }

  const getSourceColor = (sourceType: string) => {
    switch (sourceType) {
      case 'note':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'user_story':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'design':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'example':
        return 'bg-orange-50 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const filteredDecisions = filter === 'all' 
    ? decisions 
    : decisions.filter(decision => decision.source_type === filter)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleSourceClick = (decision: ProjectDecision) => {
    if (onNavigateToSource) {
      onNavigateToSource(decision.source_type, decision.source_id)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Decision History</h2>
        <p className="text-gray-600 mt-2">All decisions made for {project.name}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 border-b border-gray-200 pb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-100 text-blue-700 border border-blue-200'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          All ({decisions.length})
        </button>
        <button
          onClick={() => setFilter('note')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'note'
              ? 'bg-blue-100 text-blue-700 border border-blue-200'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          Notes ({decisions.filter(d => d.source_type === 'note').length})
        </button>
        <button
          onClick={() => setFilter('user_story')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'user_story'
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          User Stories ({decisions.filter(d => d.source_type === 'user_story').length})
        </button>
        <button
          onClick={() => setFilter('design')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'design'
              ? 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
          style={filter === 'design' ? {
            backgroundColor: '#f3f0ff',
            color: '#6b42d1',
            border: '1px solid #ddd6fe'
          } : {}}
        >
          Designs ({decisions.filter(d => d.source_type === 'design').length})
        </button>
        <button
          onClick={() => setFilter('example')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'example'
              ? 'bg-orange-100 text-orange-700 border border-orange-200'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          Examples ({decisions.filter(d => d.source_type === 'example').length})
        </button>
      </div>

      {/* Decisions List */}
      {filteredDecisions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No decisions found</h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? 'No decisions have been made for this project yet.'
              : `No decisions found for ${getSourceLabel(filter).toLowerCase()}s.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDecisions.map((decision) => (
            <div
              key={decision.id}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              {/* Decision Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                <div className="mt-1.5">
                  {getSourceIcon(decision.source_type)}
                  </div>
                  <div>
                    <button
                      onClick={() => handleSourceClick(decision)}
                      className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors group"
                    >
                      {decision.source_name}
                      {decision.source_short_id && (
                        <span className="text-sm text-gray-500">#{decision.source_short_id}</span>
                      )}
                      <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSourceColor(decision.source_type)}`}>
                        {getSourceLabel(decision.source_type)}
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

              {/* Decision Content */}
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
