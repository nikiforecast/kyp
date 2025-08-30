import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { FolderOpen, Plus, Loader2, Edit, Trash2, FileText, BookOpen, GitBranch, Palette, GripVertical } from 'lucide-react'
import { getProjectStakeholders, getProjectStakeholdersBatch } from '../lib/database/services/projectService'
import type { Project, ProjectProgressStatus, UserStory, UserJourney, Design, Stakeholder, ResearchNote, ProblemOverview } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { 
  DndContext, 
  closestCorners, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core'
import { 
  arrayMove, 
  SortableContext, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable'
import { 
  useSortable 
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { 
  getUserProjectPreferences, 
  reorderProjects, 
  initializeProjectPreferences,
  removeProjectPreference,
  type ProjectWithOrder 
} from '../lib/database/services/userProjectPreferenceService'
import { supabase } from '../lib/supabase'

/**
 * ProjectManager Component - Performance Optimized
 * 
 * Key Performance Optimizations:
 * 1. O(1) lookup maps instead of O(n) filtering for project data
 * 2. Virtual scrolling with visibleProjectCount (shows 12 projects initially)
 * 3. Debounced search to prevent excessive filtering
 * 4. React.memo with custom comparison for project cards
 * 5. Performance monitoring for slow renders
 * 6. Batch loading of stakeholder counts
 * 7. Efficient project data processing with Map data structures
 */
interface ProjectManagerProps {
  projects: Project[]
  stakeholders?: Stakeholder[]
  notes?: ResearchNote[]
  problemOverviews?: ProblemOverview[]
  allProjectProgressStatus?: ProjectProgressStatus[]
  allUserStories?: UserStory[]
  allUserJourneys?: UserJourney[]
  allDesigns?: Design[]
  onCreateProject: (name: string, overview?: string) => Promise<void>
  onSelectProject: (project: Project) => void
  onUpdateProject?: (project: Project) => Promise<void>
  onDeleteProject?: (projectId: string) => Promise<void>
}

// Memoized project data interface
interface ProjectData {
  notes: ResearchNote[]
  problemOverview?: ProblemOverview
  progressStatuses: ProjectProgressStatus[]
  userStories: UserStory[]
  userJourneys: UserJourney[]
  designs: Design[]
  stakeholderCount: number
}

// Sortable Project Card Component
interface SortableProjectCardProps {
  project: Project
  projectData: ProjectData
  onProjectClick: (project: Project) => void
  onProjectEdit: (project: Project) => void
  onProjectDelete: (projectId: string, projectName: string) => void
  isDragOverlay?: boolean
}

// Staggered animation wrapper for project cards
const StaggeredProjectCard = React.memo(({ project, projectData, index, ...props }: any) => (
  <div
    className="animate-in fade-in slide-in-from-bottom-4"
    style={{
      animationDelay: `${index * 50}ms`,
      animationDuration: '300ms',
      animationFillMode: 'both'
    }}
  >
    <SortableProjectCard
      project={project}
      projectData={projectData}
      {...props}
    />
  </div>
), (prevProps, nextProps) => {
  // Custom comparison for React.memo to prevent unnecessary re-renders
  return (
    prevProps.project.id === nextProps.project.id &&
    prevProps.project.name === nextProps.project.name &&
    prevProps.project.overview === nextProps.project.overview &&
    prevProps.projectData.notes.length === nextProps.projectData.notes.length &&
    prevProps.projectData.stakeholderCount === nextProps.projectData.stakeholderCount &&
    prevProps.projectData.progressStatuses.length === nextProps.projectData.progressStatuses.length &&
    prevProps.projectData.userStories.length === nextProps.projectData.userStories.length &&
    prevProps.projectData.userJourneys.length === nextProps.projectData.userJourneys.length &&
    prevProps.projectData.designs.length === nextProps.projectData.designs.length
  )
})

// Loading skeleton component
const ProjectCardSkeleton = () => (
  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <div className="h-6 bg-gray-200 rounded mb-2 w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-200 rounded"></div>
        <div className="w-8 h-8 bg-gray-200 rounded"></div>
        <div className="w-8 h-8 bg-gray-200 rounded"></div>
      </div>
    </div>
    
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
        <div className="h-4 bg-gray-200 rounded w-12"></div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2"></div>
    </div>
    
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div className="h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded"></div>
    </div>
    
    <div className="pt-4 border-t border-gray-100">
      <div className="h-4 bg-gray-200 rounded w-32"></div>
    </div>
  </div>
)

// Memoized project card to prevent unnecessary re-renders
const SortableProjectCard = React.memo(function SortableProjectCard({
  project,
  projectData,
  onProjectClick,
  onProjectEdit,
  onProjectDelete,
  isDragOverlay = false
}: SortableProjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Calculate progress percentage
  const totalProgressItems = projectData.progressStatuses.length
  const completedProgressItems = projectData.progressStatuses.filter(ps => ps.is_completed).length
  const progressPercentage = totalProgressItems > 0 ? Math.round((completedProgressItems / totalProgressItems) * 100) : 0

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 ease-in-out cursor-pointer ${
        isDragging ? 'opacity-50 scale-105' : ''
      } ${isDragOverlay ? 'shadow-2xl' : ''}`}
      onClick={() => onProjectClick(project)}
    >
      {/* Drag Handle */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.name}</h3>
          {project.overview && (
            <p className="text-sm text-gray-600 line-clamp-2">{project.overview}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onProjectEdit(project)
            }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            title="Edit Project"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onProjectDelete(project.id, project.name)
            }}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
            title="Delete Project"
          >
            <Trash2 size={16} />
          </button>
          <div
            {...attributes}
            {...listeners}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical size={16} />
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <FileText size={16} />
          <span>{projectData.notes.length} Notes</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <BookOpen size={16} />
          <span>{projectData.userStories.length} Stories</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <GitBranch size={16} />
          <span>{projectData.userJourneys.length} Journeys</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Palette size={16} />
          <span>{projectData.designs.length} Designs</span>
        </div>
      </div>

      {/* Stakeholder Count */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span>{projectData.stakeholderCount} Stakeholders</span>
        </div>
      </div>
    </div>
  )
})

export function ProjectManager({
  projects = [],
  stakeholders = [],
  notes = [], 
  problemOverviews = [],
  allProjectProgressStatus = [],
  allUserStories = [],
  allUserJourneys = [],
  allDesigns = [],
  onCreateProject, 
  onSelectProject,
  onUpdateProject,
  onDeleteProject
}: ProjectManagerProps) {
  const { user } = useAuth()
  
  // Performance monitoring
  useEffect(() => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      if (renderTime > 100) { // Log slow renders
        console.warn(`ProjectManager render took ${renderTime.toFixed(2)}ms - ${projects.length} projects, ${notes.length} notes`)
      }
    }
  }, [projects.length, notes.length, problemOverviews.length, allProjectProgressStatus.length, allUserStories.length, allUserJourneys.length, allDesigns.length])
  
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [newProject, setNewProject] = useState({ name: '', overview: '' })
  const [creatingProject, setCreatingProject] = useState(false)
  const [updatingProject, setUpdatingProject] = useState(false)
  const [orderedProjects, setOrderedProjects] = useState<Project[]>([])
  const [isReordering, setIsReordering] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedProject, setDraggedProject] = useState<Project | null>(null)
  const [hasInitializedPreferences, setHasInitializedPreferences] = useState(false)
  const [isLoadingStakeholders, setIsLoadingStakeholders] = useState(false)
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false)

  // State for stakeholder counts
  const [stakeholderCounts, setStakeholderCounts] = useState<Record<string, number>>({})

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Memoized project data to prevent recalculation on every render
  const projectDataMap = useMemo(() => {
    const dataMap = new Map<string, ProjectData>()
    
    // Create lookup maps for O(1) access instead of O(n) filtering
    const notesByProject = new Map<string, ResearchNote[]>()
    const problemOverviewsByProject = new Map<string, ProblemOverview>()
    const progressStatusesByProject = new Map<string, ProjectProgressStatus[]>()
    const userStoriesByProject = new Map<string, UserStory[]>()
    const userJourneysByProject = new Map<string, UserJourney[]>()
    const designsByProject = new Map<string, Design[]>()
    
    // Pre-process data into lookup maps (O(n) once instead of O(n*m) for each project)
    notes.forEach(note => {
      const existing = notesByProject.get(note.project_id) || []
      existing.push(note)
      notesByProject.set(note.project_id, existing)
    })
    
    problemOverviews.forEach(po => {
      problemOverviewsByProject.set(po.project_id, po)
    })
    
    allProjectProgressStatus.forEach(ps => {
      const existing = progressStatusesByProject.get(ps.project_id) || []
      existing.push(ps)
      progressStatusesByProject.set(ps.project_id, existing)
    })
    
    allUserStories.forEach(us => {
      const existing = userStoriesByProject.get(us.project_id) || []
      existing.push(us)
      userStoriesByProject.set(us.project_id, existing)
    })
    
    allUserJourneys.forEach(uj => {
      const existing = userJourneysByProject.get(uj.project_id) || []
      existing.push(uj)
      userJourneysByProject.set(uj.project_id, existing)
    })
    
    allDesigns.forEach(d => {
      const existing = designsByProject.get(d.project_id) || []
      existing.push(d)
      designsByProject.set(d.project_id, existing)
    })
    
    // Now build project data map with O(1) lookups
    projects.forEach(project => {
      dataMap.set(project.id, {
        notes: notesByProject.get(project.id) || [],
        problemOverview: problemOverviewsByProject.get(project.id),
        progressStatuses: progressStatusesByProject.get(project.id) || [],
        userStories: userStoriesByProject.get(project.id) || [],
        userJourneys: userJourneysByProject.get(project.id) || [],
        designs: designsByProject.get(project.id) || [],
        stakeholderCount: stakeholderCounts[project.id] || 0
      })
    })
    
    return dataMap
  }, [projects, notes, problemOverviews, allProjectProgressStatus, allUserStories, allUserJourneys, allDesigns, stakeholderCounts])

  // Performance optimization: Only render visible projects initially
  const [visibleProjectCount, setVisibleProjectCount] = useState(12) // Show first 12 projects
  
  // Load more projects when user scrolls or explicitly requests
  const loadMoreProjects = useCallback(() => {
    setVisibleProjectCount(prev => Math.min(prev + 12, orderedProjects.length))
  }, [orderedProjects.length])
  
  // Reset visible count when projects change
  useEffect(() => {
    setVisibleProjectCount(12)
  }, [orderedProjects.length])
  
  // Search functionality for better performance with large project lists
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  
  // Debounce search input to prevent excessive filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchTerm])
  
  // Filter projects based on search term
  const filteredProjects = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return orderedProjects
    
    const searchLower = debouncedSearchTerm.toLowerCase()
    return orderedProjects.filter(project => 
      project.name.toLowerCase().includes(searchLower) ||
      (project.overview && project.overview.toLowerCase().includes(searchLower))
    )
  }, [orderedProjects, debouncedSearchTerm])

  // Load stakeholder counts efficiently - batch load all at once
  useEffect(() => {
    const loadStakeholderCounts = async () => {
      if (projects.length === 0) return
      
      setIsLoadingStakeholders(true)
      try {
        // Use batch loading for better performance
        const projectIds = projects.map(p => p.id)
        const stakeholderBatch = await getProjectStakeholdersBatch(projectIds)
        
        // Create counts object
        const counts: Record<string, number> = {}
        projectIds.forEach(projectId => {
          counts[projectId] = stakeholderBatch[projectId]?.length || 0
        })
        
        setStakeholderCounts(counts)
      } catch (error) {
        console.error('Error loading stakeholder counts:', error)
        
        // Fallback to individual loading if batch fails
        try {
          const countPromises = projects.map(async (project) => {
            const stakeholderIds = await getProjectStakeholders(project.id)
            return { projectId: project.id, count: stakeholderIds.length }
          })
          
          const counts = await Promise.all(countPromises)
          
          const countsObj: Record<string, number> = {}
          counts.forEach(({ projectId, count }) => {
            countsObj[projectId] = count
          })
          
          setStakeholderCounts(countsObj)
        } catch (fallbackError) {
          console.error('Fallback stakeholder loading also failed:', fallbackError)
        }
      } finally {
        setIsLoadingStakeholders(false)
      }
    }
    
    loadStakeholderCounts()
  }, [projects])

  // Load and initialize project preferences - only when projects actually change
  useEffect(() => {
    if (!user?.id || projects.length === 0 || hasInitializedPreferences) return

    const loadProjectPreferences = async () => {
      setIsLoadingPreferences(true)
      try {
        // Try to get existing preferences
        const preferences = await getUserProjectPreferences(user.id)
        
        if (preferences.length > 0) {
          // Use existing preferences to order projects
          const ordered = preferences.map(pref => 
            projects.find(p => p.id === pref.project_id)
          ).filter(Boolean) as Project[]
          
          // Add any new projects that don't have preferences yet
          const existingProjectIds = new Set(preferences.map(p => p.project_id))
          const newProjects = projects.filter(p => !existingProjectIds.has(p.id))
          
          setOrderedProjects([...ordered, ...newProjects])
        } else {
          // Initialize preferences with current project order
          await initializeProjectPreferences(user.id, projects.map(p => p.id))
          setOrderedProjects([...projects])
        }
        setHasInitializedPreferences(true)
      } catch (error) {
        console.error('Error loading project preferences:', error)
        // Fallback to original order
        setOrderedProjects([...projects])
        setHasInitializedPreferences(true)
      } finally {
        setIsLoadingPreferences(false)
      }
    }

    loadProjectPreferences()
  }, [user?.id, projects, hasInitializedPreferences])

  // Don't set initial order until preferences are loaded to prevent jittery reordering

  // Function to refresh project preferences (called when projects are added/removed)
  const refreshProjectPreferences = async () => {
    if (!user?.id) return
    
    try {
      setHasInitializedPreferences(false) // Reset flag to reload preferences
    } catch (error) {
      console.error('Error refreshing project preferences:', error)
    }
  }

  // Memoized event handlers to prevent unnecessary re-renders
  const handleCreateProject = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingProject(true)
    
    try {
      await onCreateProject(newProject.name, newProject.overview || undefined)
      setNewProject({ name: '', overview: '' })
      setShowProjectForm(false)
      // Refresh preferences to include the new project
      await refreshProjectPreferences()
    } catch (error) {
      console.error('Error creating project:', error)
    } finally {
      setCreatingProject(false)
    }
  }, [newProject, onCreateProject, refreshProjectPreferences])

  const handleUpdateProject = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject || !onUpdateProject) return
    
    setUpdatingProject(true)
    
    try {
      await onUpdateProject(editingProject)
      setEditingProject(null)
    } catch (error) {
      console.error('Error updating project:', error)
    } finally {
      setUpdatingProject(false)
    }
  }, [editingProject, onUpdateProject])

  const handleDeleteProject = useCallback(async (projectId: string, projectName: string) => {
    if (!onDeleteProject) return
    
    if (window.confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      try {
        // Remove from user preferences first
        if (user?.id) {
          await removeProjectPreference(user.id, projectId)
        }
        
        await onDeleteProject(projectId)
        // Refresh preferences after deletion
        await refreshProjectPreferences()
      } catch (error) {
        console.error('Error deleting project:', error)
      }
    }
  }, [onDeleteProject, user?.id, refreshProjectPreferences])

  const handleProjectClick = useCallback((project: Project) => {
    onSelectProject(project)
  }, [onSelectProject])

  const handleProjectEdit = useCallback((project: Project) => {
    setEditingProject(project)
  }, [])

  const handleProjectDelete = useCallback((projectId: string, projectName: string) => {
    handleDeleteProject(projectId, projectName)
  }, [handleDeleteProject])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    const draggedProject = orderedProjects.find(p => p.id === event.active.id)
    setDraggedProject(draggedProject || null)
  }, [orderedProjects])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) {
      setActiveId(null)
      setDraggedProject(null)
      return
    }

    const oldIndex = orderedProjects.findIndex(p => p.id === active.id)
    const newIndex = orderedProjects.findIndex(p => p.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      setIsReordering(true)
      
      try {
        const newOrder = arrayMove(orderedProjects, oldIndex, newIndex)
        console.log('📋 New order:', newOrder.map(p => ({ id: p.id, name: p.name })))
        
        // Update local state first
        setOrderedProjects(newOrder)
        
        // Save new order to database
        if (user?.id) {
          console.log('💾 Attempting to save order to database for user:', user.id)
          console.log('🔍 User object:', { id: user.id, email: user.email })
          console.log('🔍 Supabase configured:', !!supabase)
          
          await reorderProjects(user.id, newOrder.map(p => p.id))
          console.log('✅ Order saved to database successfully')
        } else {
          console.warn('⚠️ No user ID available, cannot save to database')
          console.log('🔍 User object:', user)
        }
      } catch (error) {
        console.error('❌ Error reordering projects:', error)
        console.error('🔍 Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : 'No stack',
          code: (error as any)?.code || 'No code'
        })
        // Show error to user
        alert(`Failed to save project order: ${error instanceof Error ? error.message : 'Unknown error'}`)
        // Don't revert to projects prop - maintain the user's order
        console.log('Maintaining user order despite database error')
      } finally {
        setIsReordering(false)
      }
    }
    
    setActiveId(null)
    setDraggedProject(null)
  }, [orderedProjects, user])

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Projects</h2>
          <p className="text-gray-600">Manage your design and research projects</p>
          {isReordering && (
            <p className="text-sm text-blue-600">Saving new order...</p>
          )}
          {isLoadingStakeholders && orderedProjects.length > 0 && (
            <p className="text-sm text-gray-500">Loading project details...</p>
          )}
          {isLoadingPreferences && (
            <p className="text-sm text-blue-600">Loading project order...</p>
          )}
          {projects.length > 0 && (
            <p className="text-sm text-gray-500">
              {filteredProjects.length} of {orderedProjects.length} projects • {notes.length} notes • {stakeholders.length} stakeholders
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <button
            onClick={() => setShowProjectForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            <Plus size={20} />
            New Project
          </button>
        </div>
      </div>

      {/* Create Project Form */}
      {showProjectForm && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Project</h3>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
              <input
                type="text"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={creatingProject}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Overview (Optional)</label>
              <textarea
                value={newProject.overview}
                onChange={(e) => setNewProject({ ...newProject, overview: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={creatingProject}
              />
            </div>
            <div className="flex items-center gap-3">
              <button 
                type="submit" 
                disabled={creatingProject}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {creatingProject && <Loader2 size={16} className="animate-spin" />}
                Create Project
              </button>
              <button
                type="button"
                onClick={() => setShowProjectForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                disabled={creatingProject}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Project Form */}
      {editingProject && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Project</h3>
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
              <input
                type="text"
                value={editingProject.name}
                onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={updatingProject}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Overview (Optional)</label>
              <textarea
                value={editingProject.overview || ''}
                onChange={(e) => setEditingProject({ ...editingProject, overview: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={updatingProject}
              />
            </div>
            <div className="flex items-center gap-3">
              <button 
                type="submit" 
                disabled={updatingProject}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {updatingProject && <Loader2 size={16} className="animate-spin" />}
                Update Project
              </button>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                disabled={updatingProject}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects Grid with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedProjects.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-300 ease-in-out">
            {!hasInitializedPreferences || isLoadingPreferences ? (
              // Show skeletons while loading preferences to prevent jittery reordering
              Array.from({ length: Math.max(projects.length, 6) }).map((_, index) => (
                <ProjectCardSkeleton key={`skeleton-${index}`} />
              ))
            ) : orderedProjects.length === 0 ? (
              // Show skeletons only when there are no projects
              Array.from({ length: 6 }).map((_, index) => (
                <ProjectCardSkeleton key={`skeleton-${index}`} />
              ))
            ) : (
              // Only render visible projects for better performance
              filteredProjects.slice(0, visibleProjectCount).map((project, index) => {
                const projectData = projectDataMap.get(project.id)
                if (!projectData) return null

                return (
                  <StaggeredProjectCard
                    key={project.id}
                    project={project}
                    projectData={projectData}
                    index={index}
                    onProjectClick={handleProjectClick}
                    onProjectEdit={handleProjectEdit}
                    onProjectDelete={handleProjectDelete}
                  />
                )
              })
            )}
            {!isLoadingPreferences && orderedProjects.length === 0 && !isLoadingStakeholders && (
              <div className="col-span-full text-center py-12">
                <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No projects yet. Create your first project to get started!</p>
              </div>
            )}
          </div>
        </SortableContext>

        {/* Load More Button for Performance */}
        {filteredProjects.length > visibleProjectCount && (
          <div className="col-span-full flex justify-center mt-8">
            <button
              onClick={loadMoreProjects}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              Load More Projects ({visibleProjectCount} of {filteredProjects.length})
            </button>
          </div>
        )}

        {/* Drag Overlay for better visual feedback */}
        <DragOverlay>
          {draggedProject ? (
            <SortableProjectCard
              project={draggedProject}
              projectData={projectDataMap.get(draggedProject.id) || {
                notes: [],
                progressStatuses: [],
                userStories: [],
                userJourneys: [],
                designs: [],
                stakeholderCount: 0
              }}
              onProjectClick={handleProjectClick}
              onProjectEdit={handleProjectEdit}
              onProjectDelete={handleProjectDelete}
              isDragOverlay={true}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}