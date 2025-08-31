import React, { useState, useEffect } from 'react'
import { ArrowLeft, Tag, BookOpen, FileText, GitBranch, FolderOpen, Palette } from 'lucide-react'
import { CopyLinkButton } from './common/CopyLinkButton'
import { 
  getThemeByShortId, 
  getUserStoriesByThemeId, 
  getUserJourneysByThemeId, 
  getResearchNotesByThemeId,
  getAssetsByThemeId as getDesignsByThemeId,
  getProjects
} from '../lib/database'
import type { Theme, UserStory, UserJourney, ResearchNote, Project, Design } from '../lib/supabase'

interface ThemeDetailProps {
  themeShortId: number
  onBack: () => void
}

export function ThemeDetail({ themeShortId, onBack }: ThemeDetailProps) {
  const [theme, setTheme] = useState<Theme | null>(null)
  const [userStories, setUserStories] = useState<UserStory[]>([])
  const [userJourneys, setUserJourneys] = useState<UserJourney[]>([])
  const [researchNotes, setResearchNotes] = useState<ResearchNote[]>([])
  const [designs, setDesigns] = useState<Design[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadThemeData()
  }, [themeShortId])

  const loadThemeData = async () => {
    try {
      setLoading(true)
      
      const [themeData, projectsData] = await Promise.all([
        getThemeByShortId(themeShortId),
        getProjects()
      ])
      
      if (!themeData) {
        console.error('Theme not found')
        return
      }
      
      setTheme(themeData)
      setProjects(projectsData)
      
      // Load associated content
      const [userStoriesData, userJourneysData, researchNotesData, designsData] = await Promise.all([
        getUserStoriesByThemeId(themeData.id),
        getUserJourneysByThemeId(themeData.id),
        getResearchNotesByThemeId(themeData.id),
        getDesignsByThemeId(themeData.id)
      ])
      
      setUserStories(userStoriesData)
      setUserJourneys(userJourneysData)
      setResearchNotes(researchNotesData)
      setDesigns(designsData)
    } catch (error) {
      console.error('Error loading theme data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getProjectById = (projectId: string) => {
    return projects.find(p => p.id === projectId)
  }

  const handleUserStoryClick = (userStory: UserStory) => {
    window.location.href = `/user-story/${userStory.short_id}`
  }

  const handleUserJourneyClick = (userJourney: UserJourney) => {
    window.location.href = `/user-journey/${userJourney.short_id}`
  }

  const handleResearchNoteClick = (researchNote: ResearchNote) => {
    window.location.href = `/note/${researchNote.short_id}`
  }

  const handleAssetClick = (asset: Asset) => {
    window.location.href = `/design/${asset.short_id}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!theme) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Tag size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Theme not found</p>
        </div>
      </div>
    )
  }

  const totalContent = userStories.length + userJourneys.length + researchNotes.length + designs.length

  return (
    <div className="h-full flex flex-col w-full">
      {/* Full-width page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 w-full">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-3"
            >
              <ArrowLeft size={20} />
              Back to Themes
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="w-8 h-8 rounded-full border border-gray-300"
                style={{ backgroundColor: theme.color || '#3B82F6' }}
              />
              <h2 className="text-2xl font-bold text-gray-900">{theme.name}</h2>
            </div>
            
            {theme.description && (
              <p className="text-gray-600 mb-2">{theme.description}</p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{totalContent} total items</span>
              <span>•</span>
              <span>Created {new Date(theme.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <CopyLinkButton entityType="theme" shortId={theme.short_id || 0} />
        </div>
      </div>

      {/* Content with normal padding */}
      <div className="flex-1 overflow-y-auto w-full">
        <div className="w-full space-y-6 p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(107, 66, 209, 0.1)' }}>
                  <BookOpen size={20} style={{ color: '#6b42d1' }} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{userStories.length}</p>
                  <p className="text-sm text-gray-600">User Stories</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <GitBranch size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{userJourneys.length}</p>
                  <p className="text-sm text-gray-600">User Journeys</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <FileText size={20} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{researchNotes.length}</p>
                  <p className="text-sm text-gray-600">Notes & Calls</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Palette size={20} className="text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{designs.length}</p>
                  <p className="text-sm text-gray-600">Designs</p>
                </div>
              </div>
            </div>
          </div>

          {/* User Stories */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              User Stories ({userStories.length})
            </h3>
            
            {userStories.length > 0 ? (
              <div className="space-y-3">
                {userStories.map((story) => {
                  const project = getProjectById(story.project_id)
                  return (
                    <div 
                      key={story.id} 
                      className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => handleUserStoryClick(story)}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(107, 66, 209, 0.1)' }}>
                        <BookOpen size={20} style={{ color: '#6b42d1' }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{story.name}</p>
                        {project && (
                          <div className="flex items-center gap-2 mt-1">
                            <FolderOpen size={14} className="text-blue-600" />
                            <span className="text-sm text-gray-600">{project.name}</span>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Created {new Date(story.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No user stories tagged with this theme yet.</p>
              </div>
            )}
          </div>

          {/* User Journeys */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              User Journeys ({userJourneys.length})
            </h3>
            
            {userJourneys.length > 0 ? (
              <div className="space-y-3">
                {userJourneys.map((journey) => {
                  const project = getProjectById(journey.project_id)
                  return (
                    <div 
                      key={journey.id} 
                      className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => handleUserJourneyClick(journey)}
                    >
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <GitBranch size={20} className="text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{journey.name}</p>
                        {project && (
                          <div className="flex items-center gap-2 mt-1">
                            <FolderOpen size={14} className="text-blue-600" />
                            <span className="text-sm text-gray-600">{project.name}</span>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Created {new Date(journey.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <GitBranch size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No user journeys tagged with this theme yet.</p>
              </div>
            )}
          </div>

          {/* Research Notes */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Notes & Calls ({researchNotes.length})
            </h3>
            
            {researchNotes.length > 0 ? (
              <div className="space-y-3">
                {researchNotes.map((note) => {
                  const project = getProjectById(note.project_id)
                  return (
                    <div 
                      key={note.id} 
                      className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => handleResearchNoteClick(note)}
                    >
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{note.name}</p>
                        {project && (
                          <div className="flex items-center gap-2 mt-1">
                            <FolderOpen size={14} className="text-blue-600" />
                            <span className="text-sm text-gray-600">{project.name}</span>
                          </div>
                        )}
                        {note.summary && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{note.summary}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {note.note_date 
                            ? new Date(note.note_date).toLocaleDateString()
                            : `Created ${new Date(note.created_at).toLocaleDateString()}`
                          }
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No notes & calls tagged with this theme yet.</p>
              </div>
            )}
          </div>

          {/* Designs */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Designs ({designs.length})
            </h3>
            
            {designs.length > 0 ? (
              <div className="space-y-3">
                {designs.map((design) => {
                  const project = getProjectById(design.project_id)
                  return (
                    <div 
                      key={design.id} 
                      className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => handleAssetClick(design)}
                    >
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Palette size={20} className="text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{design.name}</p>
                        {project && (
                          <div className="flex items-center gap-2 mt-1">
                            <FolderOpen size={14} className="text-blue-600" />
                            <span className="text-sm text-gray-600">{project.name}</span>
                          </div>
                        )}
                        {design.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{design.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Created {new Date(design.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Palette size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No designs tagged with this theme yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}