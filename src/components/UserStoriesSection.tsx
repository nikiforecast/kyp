import React, { useState, useEffect } from 'react'
import { BookOpen, Plus, Trash2, Users, ArrowRight } from 'lucide-react'
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable'
import { PriorityTag, getPriorityTagStyles } from '../utils/priorityTagStyles.tsx'
import { UserRoleTag } from './common/UserRoleTag'
import { UserStoryCard } from './UserStoryCard'
import { Button } from './DesignSystem/components/Button'
import { 
  getUserStories, 
  createUserStory, 
  updateUserStory, 
  deleteUserStory,
  updateUserStoryOrders,
  getUserStoryRoles
} from '../lib/database'
import { UserStoryDetail } from './UserStoryDetail'
import { UserStoryCreate } from './UserStoryCreate'
import type { UserStory, Stakeholder, UserRole, LawFirm, UserPermission } from '../lib/supabase'
import type { Theme } from '../lib/supabase'
import type { WorkspaceUser } from '../lib/supabase'

// Organization type definitions
type OrganizationType = 'all' | 'status' | 'priority'

// Status column definitions
const STATUS_COLUMNS = [
  {
    id: 'not-started',
    title: 'Not Started / Not Planned',
    statuses: ['Not planned', 'Not started'],
    primaryStatus: 'Not started'
  },
  {
    id: 'design-in-progress',
    title: 'Design in Progress',
    statuses: ['Design in progress'],
    primaryStatus: 'Design in progress'
  },
  {
    id: 'design-complete',
    title: 'Design Complete',
    statuses: ['Design complete'],
    primaryStatus: 'Design complete'
  },
  {
    id: 'build-in-progress',
    title: 'Build in Progress',
    statuses: ['Build in progress'],
    primaryStatus: 'Build in progress'
  },
  {
    id: 'released',
    title: 'Released',
    statuses: ['Released'],
    primaryStatus: 'Released'
  }
]

// Priority column definitions
const PRIORITY_COLUMNS = [
  {
    id: 'would',
    title: 'Would',
    priority: 'would'
  },
  {
    id: 'could',
    title: 'Could',
    priority: 'could'
  },
  {
    id: 'should',
    title: 'Should',
    priority: 'should'
  },
  {
    id: 'must',
    title: 'Must',
    priority: 'must'
  }
]

// Helper function to get status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Not planned':
      return { bg: '#F3F4F6', text: '#6B7280' }
    case 'Not started':
      return { bg: '#FEF3C7', text: '#D97706' }
    case 'Design in progress':
      return { bg: '#DBEAFE', text: '#2563EB' }
    case 'Design complete':
      return { bg: '#D1FAE5', text: '#059669' }
    case 'Build in progress':
      return { bg: '#E0E7FF', text: '#7C3AED' }
    case 'Released':
      return { bg: '#DCFCE7', text: '#16A34A' }
    default:
      return { bg: '#F3F4F6', text: '#6B7280' }
  }
}

// DroppableColumn component for handling column drops
interface DroppableColumnProps {
  id: string
  children: React.ReactNode
  isHovered: boolean
  className?: string
}

function DroppableColumn({ id, children, isHovered, className = '' }: DroppableColumnProps) {
  const { setNodeRef } = useDroppable({
    id: id,
  })

  return (
    <div
      ref={setNodeRef}
      className={`${className} transition-all duration-200 ${
        isHovered 
          ? 'border-blue-400 bg-blue-50 shadow-lg' 
          : 'border-gray-200 bg-gray-50'
      }`}
    >
      {children}
    </div>
  )
}

interface UserStoriesSectionProps {
  projectId: string
  userStories: UserStory[]
  storyRoles: Record<string, string[]>
  assignedStakeholders: Stakeholder[]
  userRoles: UserRole[]
  userPermissions: UserPermission[]
  lawFirms: LawFirm[]
  themes: Theme[]
  availableUsers: WorkspaceUser[]
  onCreateUserStory: (storyData: {
    name: string
    reason?: string
    description: string
    estimatedComplexity: number
    priorityRating: string
    user_permission_id?: string
    assignedToUserId?: string
    roleIds?: string[]
    themeIds?: string[]
    status?: string
  }) => Promise<void>
  onUpdateUserStory: (storyId: string, updates: Partial<UserStory>, updatedRoleIds?: string[]) => Promise<void>
  onDeleteUserStory: (storyId: string) => Promise<void>
  onSelectUserStory?: (userStory: UserStory) => void
  onThemeCreate: (theme: Theme) => void
  onStoriesReordered?: () => Promise<void>
}

export function UserStoriesSection({ 
  projectId, 
  userStories,
  storyRoles,
  assignedStakeholders, 
  userRoles, 
  userPermissions,
  lawFirms,
  themes,
  availableUsers,
  onCreateUserStory,
  onUpdateUserStory,
  onDeleteUserStory,
  onSelectUserStory,
  onThemeCreate,
  onStoriesReordered
}: UserStoriesSectionProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isCreatingStory, setIsCreatingStory] = useState(false)
  const [newStory, setNewStory] = useState({ 
    name: '', 
    description: '', 
    estimatedComplexity: 5,
    userRoleIds: [] as string[] 
  })
  const [localUserStories, setLocalUserStories] = useState(userStories)
  const [organizationType, setOrganizationType] = useState<OrganizationType>('status')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedStory, setDraggedStory] = useState<UserStory | null>(null)
  const [hoveredColumnId, setHoveredColumnId] = useState<string | null>(null)

  // Track if we're currently performing a drag operation to prevent conflicts
  const [isDragging, setIsDragging] = useState(false)

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Update local state when userStories prop changes
  useEffect(() => {
    setLocalUserStories(userStories)
  }, [userStories])

  // Helper function to group stories by status
  const groupStoriesByStatus = (stories: UserStory[]) => {
    const grouped: Record<string, UserStory[]> = {}
    
    STATUS_COLUMNS.forEach(column => {
      grouped[column.id] = stories.filter(story => 
        column.statuses.includes(story.status || 'Not planned')
      )
    })
    
    return grouped
  }

  // Helper function to group stories by priority
  const groupStoriesByPriority = (stories: UserStory[]) => {
    const grouped: Record<string, UserStory[]> = {}
    
    PRIORITY_COLUMNS.forEach(column => {
      grouped[column.id] = stories.filter(story => 
        (story.priority_rating || 'should') === column.priority
      )
    })
    
    return grouped
  }

  const handleCreateStory = async (storyData: {
    name: string
    reason?: string
    description: string
    estimatedComplexity: number
    priorityRating: 'must' | 'should' | 'could' | 'would'
    userRoleIds: string[]
    userPermissionId?: string
    themeIds: string[]
  }) => {
    await onCreateUserStory({
      name: storyData.name,
      reason: storyData.reason,
      description: storyData.description,
      estimatedComplexity: storyData.estimatedComplexity,
      priorityRating: storyData.priorityRating,
      user_permission_id: storyData.userPermissionId,
      assignedToUserId: undefined,
      roleIds: storyData.userRoleIds,
      themeIds: storyData.themeIds,
      status: undefined
    })
    setIsCreatingStory(false)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
    setIsDragging(true)
    
    const story = localUserStories.find(s => s.id === active.id)
    setDraggedStory(story || null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    
    if (over) {
      const overId = over.id as string
      const isStatusColumn = STATUS_COLUMNS.some(col => col.id === overId)
      const isPriorityColumn = PRIORITY_COLUMNS.some(col => col.id === overId)
      
      if (isStatusColumn || isPriorityColumn) {
        setHoveredColumnId(overId)
      } else {
        setHoveredColumnId(null)
      }
    } else {
      setHoveredColumnId(null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    setActiveId(null)
    setDraggedStory(null)
    setIsDragging(false)
    setHoveredColumnId(null)
    
    if (!over) return
    
    const activeId = active.id as string
    const overId = over.id as string
    
    if (activeId === overId) return
    
    const activeStory = localUserStories.find(s => s.id === activeId)
    if (!activeStory) return
    
    // Store original state for potential revert
    const originalStories = [...localUserStories]
    
    // Determine what type of drop this is
    const isStatusColumnDrop = organizationType === 'status' && STATUS_COLUMNS.some(col => col.id === overId)
    const isPriorityColumnDrop = organizationType === 'priority' && PRIORITY_COLUMNS.some(col => col.id === overId)
    const isStoryDrop = localUserStories.some(s => s.id === overId)
    
    let updatedStory = { ...activeStory }
    let needsPropertyUpdate = false
    let propertyUpdates: Partial<UserStory> = {}
    
    // Handle column drops (status or priority changes)
    if (isStatusColumnDrop) {
      const targetColumn = STATUS_COLUMNS.find(col => col.id === overId)
      if (targetColumn && targetColumn.primaryStatus !== activeStory.status) {
        const newStatus = targetColumn.primaryStatus as 'Not planned' | 'Not started' | 'Design in progress' | 'Design complete' | 'Build in progress' | 'Released'
        updatedStory.status = newStatus
        propertyUpdates.status = newStatus
        needsPropertyUpdate = true
      }
    } else if (isPriorityColumnDrop) {
      const targetColumn = PRIORITY_COLUMNS.find(col => col.id === overId)
      if (targetColumn && targetColumn.priority !== activeStory.priority_rating) {
        updatedStory.priority_rating = targetColumn.priority as 'must' | 'should' | 'could' | 'would'
        propertyUpdates.priority_rating = targetColumn.priority as 'must' | 'should' | 'could' | 'would'
        needsPropertyUpdate = true
      }
    }
    
    // Create the new array with optimistic updates
    let newLocalStories = localUserStories.map(story => 
      story.id === activeId ? updatedStory : story
    )
    
    // Handle reordering
    if (isStoryDrop) {
      // Reordering within the same group or across groups
      const oldIndex = newLocalStories.findIndex(s => s.id === activeId)
      const newIndex = newLocalStories.findIndex(s => s.id === overId)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        newLocalStories = arrayMove(newLocalStories, oldIndex, newIndex)
      }
    } else if (needsPropertyUpdate) {
      // For column drops, sort the array to group properly
      if (organizationType === 'status') {
        newLocalStories.sort((a, b) => {
          const aColumnIndex = STATUS_COLUMNS.findIndex(col => col.statuses.includes(a.status || 'Not planned'))
          const bColumnIndex = STATUS_COLUMNS.findIndex(col => col.statuses.includes(b.status || 'Not planned'))
          
          if (aColumnIndex !== bColumnIndex) {
            return aColumnIndex - bColumnIndex
          }
          
          return (a.weighting || 0) - (b.weighting || 0)
        })
      } else if (organizationType === 'priority') {
        newLocalStories.sort((a, b) => {
          const aPriorityOrder = getPriorityOrder(a.priority_rating)
          const bPriorityOrder = getPriorityOrder(b.priority_rating)
          
          if (aPriorityOrder !== bPriorityOrder) {
            return aPriorityOrder - bPriorityOrder
          }
          
          return (a.weighting || 0) - (b.weighting || 0)
        })
      }
    }
    
    // Apply optimistic update immediately
    setLocalUserStories(newLocalStories)
    
    // Calculate new weightings based on the visual order
    const orderedStories = newLocalStories.map((story, index) => ({
      id: story.id,
      weighting: index + 1
    }))
    
    // Perform database updates asynchronously
    try {
      // Update story properties if needed
      if (needsPropertyUpdate) {
        await onUpdateUserStory(activeStory.id, propertyUpdates, [])
      }
      
      // Update weighting for all stories
      const { updateUserStoryOrders } = await import('../lib/database')
      await updateUserStoryOrders(orderedStories)
      
    } catch (error) {
      console.error('Error updating story order:', error)
      // Revert to original state on error
      setLocalUserStories(originalStories)
    }
  }

  const handleReorderWithinColumn = async (activeId: string, overId: string) => {
    const oldIndex = localUserStories.findIndex(s => s.id === activeId)
    const newIndex = localUserStories.findIndex(s => s.id === overId)
    
    if (oldIndex === newIndex) return
    
    const reorderedStories = arrayMove(localUserStories, oldIndex, newIndex)
    
    try {
      // Update weightings in database
      const orderedStories = reorderedStories.map((story, index) => ({
        id: story.id,
        weighting: index + 1
      }))
      
      const { updateUserStoryOrders } = await import('../lib/database')
      await updateUserStoryOrders(orderedStories)
      
      // Re-fetch all stories to ensure UI reflects database state
      if (onStoriesReordered) {
        await onStoriesReordered()
      }
    } catch (error) {
      console.error('Error updating story order:', error)
    }
  }

  const getAssignedRolesList = (storyId: string) => {
    const roleIds = storyRoles[storyId] || []
    return userRoles.filter(role => roleIds.includes(role.id))
  }

  const getUserRoleById = (roleId?: string) => {
    if (!roleId) return null
    return userRoles.find(role => role.id === roleId)
  }

  const getUserPermissionById = (permissionId?: string) => {
    if (!permissionId) return null
    return userPermissions.find(permission => permission.id === permissionId)
  }

  // Priority order: must (1), should (2), could (3), would (4)
  const getPriorityOrder = (priority: string | null | undefined): number => {
    switch (priority) {
      case 'must': return 1
      case 'should': return 2
      case 'could': return 3
      case 'would': return 4
      default: return 5 // fallback for any undefined priorities
    }
  }

  // Wrapper function to match UserStoryCard interface
  const handleUpdateUserStory = async (story: UserStory, updates: Partial<UserStory>, updatedRoleIds?: string[]) => {
    await onUpdateUserStory(story.id, updates, updatedRoleIds || [])
  }

  // Use local state for rendering (already sorted by weighting from database)
  const sortedUserStories = localUserStories

  // If creating a new story, show the create form
  if (isCreatingStory) {
    return (
      <UserStoryCreate
        projectId={projectId}
        userRoles={userRoles}
        userPermissions={userPermissions}
        themes={themes}
        availableUsers={availableUsers}
        onBack={() => setIsCreatingStory(false)}
        onThemeCreate={onThemeCreate}
        onCreate={handleCreateStory}
      />
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Stories</h2>
        
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Organize by:</label>
            <select
              value={organizationType}
              onChange={(e) => setOrganizationType(e.target.value as OrganizationType)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Stories</option>
              <option value="status">Status</option>
              <option value="priority">Priority</option>
            </select>
          </div>
          <Button
            onClick={() => setIsCreatingStory(true)}
            variant="primary"
            icon={Plus}
          >
            Create Story
          </Button>
        </div>
      </div>

      {/* User Stories Display */}
      {organizationType === 'all' ? (
        /* All Stories - Original Grid Layout */
        <SortableContext items={sortedUserStories.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedUserStories.map((story) => (
              <UserStoryCard
                key={story.id}
                story={story}
                storyRoles={storyRoles}
                userRoles={userRoles}
                userPermissions={userPermissions}
                availableUsers={availableUsers}
                onUpdate={handleUpdateUserStory}
                onDelete={onDeleteUserStory}
                onSelect={onSelectUserStory}
                showDeleteButton={true}
              />
            ))}
          </div>
        </SortableContext>
      ) : organizationType === 'status' ? (
        /* Status Columns Layout */
        <div className="flex gap-6 overflow-x-auto pb-4">
          {STATUS_COLUMNS.map((column) => {
            const groupedStories = groupStoriesByStatus(sortedUserStories)
            const columnStories = groupedStories[column.id] || []
            const isHovered = hoveredColumnId === column.id
            
            return (
              <div key={column.id} className="flex-shrink-0 w-80">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">{column.title} ({columnStories.length})</h3>
                  
                  <SortableContext items={[column.id, ...columnStories.map(s => s.id)]} strategy={verticalListSortingStrategy}>
                    <DroppableColumn 
                      id={column.id}
                      isHovered={isHovered}
                      className="space-y-4 min-h-[200px] rounded-lg border-2 border-dashed p-4"
                    >
                      {columnStories.map((story) => (
                        <UserStoryCard
                          key={story.id}
                          story={story}
                          storyRoles={storyRoles}
                          userRoles={userRoles}
                          userPermissions={userPermissions}
                          availableUsers={availableUsers}
                          onUpdate={handleUpdateUserStory}
                          onDelete={onDeleteUserStory}
                          onSelect={onSelectUserStory}
                          showDeleteButton={true}
                        />
                      ))}
                    {columnStories.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <BookOpen size={32} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No stories</p>
                      </div>
                    )}
                    </DroppableColumn>
                  </SortableContext>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Priority Columns Layout */
        <div className="flex gap-6 overflow-x-auto pb-4">
          {PRIORITY_COLUMNS.map((column) => {
            const groupedStories = groupStoriesByPriority(sortedUserStories)
            const columnStories = groupedStories[column.id] || []
            const priorityStyles = getPriorityTagStyles(column.priority as 'must' | 'should' | 'could' | 'would')
            const isHovered = hoveredColumnId === column.id
            
            return (
              <div key={column.id} className="flex-shrink-0 w-80">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: priorityStyles.dotColor }}
                    />
                    <h3 className="font-semibold text-gray-900">{column.title} ({columnStories.length})</h3>
                  </div>
                  
                  <SortableContext items={[column.id, ...columnStories.map(s => s.id)]} strategy={verticalListSortingStrategy}>
                    <DroppableColumn 
                      id={column.id}
                      isHovered={isHovered}
                      className="space-y-4 min-h-[200px] rounded-lg border-2 border-dashed p-4"
                    >
                      {columnStories.map((story) => (
                        <UserStoryCard
                          key={story.id}
                          story={story}
                          storyRoles={storyRoles}
                          userRoles={userRoles}
                          userPermissions={userPermissions}
                          availableUsers={availableUsers}
                          onUpdate={handleUpdateUserStory}
                          onDelete={onDeleteUserStory}
                          onSelect={onSelectUserStory}
                          showDeleteButton={true}
                        />
                      ))}
                    {columnStories.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <BookOpen size={32} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No stories</p>
                      </div>
                    )}
                    </DroppableColumn>
                  </SortableContext>
                </div>
              </div>
            )
          })}
        </div>
      )}
      
      {/* Empty State for All View */}
      {organizationType === 'all' && sortedUserStories.length === 0 && (
        <div className="text-center py-12">
          <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No user stories yet. Create your first user story to get started!</p>
        </div>
      )}
    </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && draggedStory ? (
          <UserStoryCard
            story={draggedStory}
            storyRoles={storyRoles}
            userRoles={userRoles}
            userPermissions={userPermissions}
            availableUsers={availableUsers}
            showDeleteButton={false}
            isDragOverlay={true}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}