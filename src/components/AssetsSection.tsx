import React, { useState, useEffect } from 'react'
import { Palette, Plus, Edit, Trash2, ExternalLink, BookOpen, FileText } from 'lucide-react'
import { 
  getAssets as getDesigns, 
  createAsset as createDesign, 
  deleteAsset as deleteDesign,
  updateAsset as updateDesign,
  getUserStoriesForAsset as getUserStoriesForDesign,
  getResearchNotesForAsset as getResearchNotesForDesign
} from '../lib/database'
import { getUserStories, getResearchNotes } from '../lib/database'
import { AddDesignModal } from './DesignsSection/AddDesignModal'
import { EditDesignModal } from './DesignsSection/EditDesignModal'
import type { Design, UserStory, ResearchNote } from '../lib/supabase'

interface DesignsSectionProps {
  projectId: string
  onSelectDesign?: (design: Design) => void
}

export function DesignsSection({ projectId, onSelectDesign }: DesignsSectionProps) {
  const [designs, setDesigns] = useState<Design[]>([])
  const [userStories, setUserStories] = useState<UserStory[]>([])
  const [researchNotes, setResearchNotes] = useState<ResearchNote[]>([])
  const [designRelationships, setDesignRelationships] = useState<Record<string, { userStoryIds: string[], researchNoteIds: string[] }>>({})
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    loadDesigns()
    loadUserStories()
    loadResearchNotes()
  }, [projectId])

  const loadDesigns = async () => {
    try {
      setLoading(true)
      const designsData = await getDesigns(projectId)
      setDesigns(designsData)
      
      // Load relationships for each asset
      const relationships: Record<string, { userStoryIds: string[], researchNoteIds: string[] }> = {}
      for (const design of designsData) {
        const [userStoryIds, researchNoteIds] = await Promise.all([
          getUserStoriesForDesign(design.id),
          getResearchNotesForDesign(design.id)
        ])
        relationships[design.id] = { userStoryIds, researchNoteIds }
      }
      setDesignRelationships(relationships)
    } catch (error) {
      console.error('Error loading designs:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserStories = async () => {
    try {
      const userStoriesData = await getUserStories(projectId)
      setUserStories(userStoriesData)
    } catch (error) {
      console.error('Error loading user stories:', error)
    }
  }

  const loadResearchNotes = async () => {
    try {
      const researchNotesData = await getResearchNotes()
      // Filter notes for this project
      const projectNotes = researchNotesData.filter(note => note.project_id === projectId)
      setResearchNotes(projectNotes)
    } catch (error) {
      console.error('Error loading research notes:', error)
    }
  }

  const handleCreateDesign = async (designData: {
    name: string
    snapshotImageUrl?: string
    description?: string
    linkUrl?: string
    userStoryIds: string[]
    researchNoteIds: string[]
  }) => {
    try {
      const design = await createDesign(
        projectId,
        designData.name,
        designData.snapshotImageUrl,
        designData.description,
        designData.linkUrl,
        designData.userStoryIds,
        designData.researchNoteIds
      )
      
      if (design) {
        setDesigns([design, ...designs])
        setDesignRelationships(prev => ({
          ...prev,
          [design.id]: {
            userStoryIds: designData.userStoryIds,
            researchNoteIds: designData.researchNoteIds
          }
        }))
        setShowAddModal(false)
      }
    } catch (error) {
      console.error('Error creating design:', error)
    }
  }

  const handleDeleteDesign = async (designId: string) => {
    if (window.confirm('Are you sure you want to delete this design?')) {
      try {
        const success = await deleteDesign(designId)
        if (success) {
          setDesigns(designs.filter(d => d.id !== designId))
        }
      } catch (error) {
        console.error('Error deleting design:', error)
      }
    }
  }

  const getLinkedItemsCount = (designId: string) => {
    const relationships = designRelationships[designId]
    if (!relationships) return { userStories: 0, researchNotes: 0 }
    
    return {
      userStories: relationships.userStoryIds.length,
      researchNotes: relationships.researchNoteIds.length
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Designs</h2>
          <p className="text-gray-600 mt-1">Manage project designs and resources</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
        >
          <Plus size={20} />
          Add Design
        </button>
      </div>

      {/* Designs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {designs.map((design) => (
          <div 
            key={design.id} 
            className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-all cursor-pointer group relative"
            onClick={() => onSelectDesign ? onSelectDesign(design) : window.location.href = `/design/${design.short_id}`}
          >
            {/* Delete Icon (top right, only visible on hover) */}
            <button
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
              title="Delete design"
              onClick={e => {
                e.stopPropagation();
                console.log('Delete button clicked');
                if (window.confirm('Are you sure you want to delete this design?')) {
                  handleDeleteDesign(design.id);
                }
              }}
            >
              <Trash2 size={18} />
            </button>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{design.name}</h3>
              </div>
                
              {/* Thumbnail */}
              {design.snapshot_image_url ? (
                <div className="mb-4">
                  <img 
                    src={design.snapshot_image_url} 
                    alt={design.name}
                    className="w-full h-64 object-cover rounded-lg border border-gray-200"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      target.nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                  <div className="hidden w-full h-32 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                    <div className="text-center">
                      <Palette size={24} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Image not available</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-32 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center mb-4">
                  <div className="text-center">
                    <Palette size={24} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">No image</p>
                  </div>
                </div>
              )}
                
              {/* Linked Items */}
              {(() => {
                const linkedCounts = getLinkedItemsCount(design.id)
                const hasLinkedItems = linkedCounts.userStories > 0 || linkedCounts.researchNotes > 0
                
                return hasLinkedItems ? (
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    {linkedCounts.userStories > 0 && (
                      <div className="flex items-center gap-1">
                        <BookOpen size={12} style={{ color: '#6b42d1' }} />
                        <span>{linkedCounts.userStories} User Stor{linkedCounts.userStories === 1 ? 'y' : 'ies'}</span>
                      </div>
                    )}
                    {linkedCounts.researchNotes > 0 && (
                      <div className="flex items-center gap-1">
                        <FileText size={12} className="text-indigo-600" />
                        <span>{linkedCounts.researchNotes} Note{linkedCounts.researchNotes === 1 ? '' : 's'}</span>
                      </div>
                    )}
                  </div>
                ) : null
              })()}
            
              {/* Description */}
              {design.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">{design.description}</p>
              )}
            </div>
          </div>
        ))}
        
        {designs.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Palette size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No designs yet. Add your first design to get started!</p>
          </div>
        )}
      </div>

      {/* Add Design Modal */}
      {showAddModal && (
        <AddDesignModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateDesign}
          userStories={userStories}
          researchNotes={researchNotes}
        />
      )}

    </div>
  )
}