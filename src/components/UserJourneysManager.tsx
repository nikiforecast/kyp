import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Copy, FolderOpen, ChevronRight, Link as LinkIcon, Move, Users } from 'lucide-react'
import { Button } from './DesignSystem/components/Button'
import { Modal } from './DesignSystem/components/Modal'
import { DataTable, Column } from './DesignSystem/components/DataTable'
import { LoadingState } from './DesignSystem/components/LoadingSpinner'
import { LawFirmForm } from './LawFirmManager/LawFirmForm'
import { EditJourneyModal } from './EditJourneyModal'
import { getUserJourneys, deleteUserJourney, updateUserJourney, createUserJourney, type UserJourney } from '../lib/database'
import { getLawFirms, createLawFirm } from '../lib/database/services/lawFirmService'
import { getUserJourneyLawFirms, setUserJourneyLawFirms, setUserJourneyPublicSharing } from '../lib/database/services/userJourneyService'
import { getUserJourneyFolders, assignUserJourneysToFolder, moveFolderToParent, updateUserJourneyFolder, deleteUserJourneyFolder, createUserJourneyFolder, type UserJourneyFolder } from '../lib/database/services/userJourneyFolderService'
import type { Project, LawFirm } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { convertEmojis } from '../utils/emojiConverter'
import * as emoji from 'node-emoji'
import { EmojiAutocomplete } from './EmojiAutocomplete'
import { nameToSlug, findFolderBySlug } from '../utils/slugUtils'

interface WorkspaceUserInfo {
  id: string
  email: string
  full_name?: string
}

interface UserJourneyWithProject extends UserJourney {
  project?: Project
  folder?: UserJourneyFolder
  createdByUser?: WorkspaceUserInfo
  updatedByUser?: WorkspaceUserInfo
  nodes_count?: number // Computed property for sorting
}

// Combined type for table rows (folders + journeys)
type FolderWithUserInfo = UserJourneyFolder & { 
  journey_count: number
  createdByUser?: WorkspaceUserInfo
}

type TableItem = 
  | { type: 'folder', data: FolderWithUserInfo }
  | { type: 'journey', data: UserJourneyWithProject }

interface UserJourneysManagerProps {
  projectId?: string // Optional - if provided, filters journeys to this project
  /** When set (e.g. from Dashboard), folder queries skip workspace_users lookup */
  workspaceId?: string
}

export function UserJourneysManager({ projectId, workspaceId }: UserJourneysManagerProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams<{ folderSlug?: string }>()
  const [userJourneys, setUserJourneys] = useState<UserJourneyWithProject[]>([])
  const [folders, setFolders] = useState<UserJourneyFolder[]>([])
  const [lawFirms, setLawFirms] = useState<LawFirm[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [createdByFilter, setCreatedByFilter] = useState<string>('all')
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folderPath, setFolderPath] = useState<UserJourneyFolder[]>([])
  const [draggedItem, setDraggedItem] = useState<{ type: 'journey' | 'folder', id: string } | null>(null)
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)
  const [folderJourneyCounts, setFolderJourneyCounts] = useState<Record<string, number>>({})
  const [usersMap, setUsersMap] = useState<Map<string, WorkspaceUserInfo>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showAddToFolderModal, setShowAddToFolderModal] = useState(false)
  const [selectedFolderForAssignment, setSelectedFolderForAssignment] = useState<string>('')
  const [assigningToFolder, setAssigningToFolder] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [journeyToDelete, setJourneyToDelete] = useState<UserJourneyWithProject | null>(null)
  const [showDeleteFolderConfirm, setShowDeleteFolderConfirm] = useState(false)
  const [folderToDelete, setFolderToDelete] = useState<UserJourneyFolder | null>(null)
  const [showEditFolderModal, setShowEditFolderModal] = useState(false)
  const [folderToEdit, setFolderToEdit] = useState<UserJourneyFolder | null>(null)
  const [editFolderName, setEditFolderName] = useState('')
  const [editFolderStatus, setEditFolderStatus] = useState<'personal' | 'shared'>('personal')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false)
  const [journeyToDuplicate, setJourneyToDuplicate] = useState<UserJourneyWithProject | null>(null)
  const [duplicating, setDuplicating] = useState(false)
  const [selectedJourneys, setSelectedJourneys] = useState<string[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [journeyToEdit, setJourneyToEdit] = useState<UserJourneyWithProject | null>(null)
  const [contextMenu, setContextMenu] = useState<{ 
    x: number
    y: number
    journey?: UserJourneyWithProject
    folder?: FolderWithUserInfo
  } | null>(null)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [journeyToMove, setJourneyToMove] = useState<UserJourneyWithProject | null>(null)
  const [folderToMove, setFolderToMove] = useState<FolderWithUserInfo | null>(null)
  const [selectedMoveFolder, setSelectedMoveFolder] = useState<string>('')
  const [movingJourney, setMovingJourney] = useState(false)
  const [movingFolder, setMovingFolder] = useState(false)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    layout: 'vertical' as 'vertical' | 'horizontal',
  })
  const [selectedLawFirmIds, setSelectedLawFirmIds] = useState<string[]>([])
  const [lawFirmSearchQuery, setLawFirmSearchQuery] = useState('')
  const [showAddLawFirmModal, setShowAddLawFirmModal] = useState(false)
  const [newLawFirm, setNewLawFirm] = useState({ 
    name: '', 
    structure: 'decentralised' as 'centralised' | 'decentralised',
    status: 'active' as 'active' | 'inactive',
    top_4: false
  })
  const [creatingLawFirm, setCreatingLawFirm] = useState(false)

  // Load projects and journeys on mount and when workspace context is available
  useEffect(() => {
    loadData()
  }, [workspaceId, projectId])

  // Update current folder when URL slug changes
  useEffect(() => {
    // Wait for folders to load before processing URL slug
    if (folders.length === 0) return

    if (params.folderSlug) {
      const folder = findFolderBySlug(folders, params.folderSlug)
      if (folder) {
        setCurrentFolderId(folder.id)
        setFolderPath(buildFolderPath(folder.id))
      } else {
        // Folder not found, navigate to root
        setCurrentFolderId(null)
        setFolderPath([])
        navigate('/user-journeys', { replace: true })
      }
    } else {
      // No folder slug in URL, show root
      setCurrentFolderId(null)
      setFolderPath([])
    }
  }, [params.folderSlug, location.pathname, folders, navigate])

  // Handle creating a new law firm from the Edit Journey Details modal
  const handleCreateLawFirmFromModal = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingLawFirm(true)
    
    try {
      // Get current user's workspace
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: workspaceUser } = await supabase
            .from('workspace_users')
            .select('workspace_id')
            .eq('user_id', user.id)
            .single()
          
          if (workspaceUser) {
            await createLawFirm(
              newLawFirm.name,
              newLawFirm.structure,
              newLawFirm.status
            )
            
            // Reload law firms
            const lawFirmsData = await getLawFirms({ workspaceId: workspaceUser.workspace_id })
            setLawFirms(lawFirmsData)
            
            // Reset form and close modal
            setNewLawFirm({ name: '', structure: 'decentralised', status: 'active', top_4: false })
            setShowAddLawFirmModal(false)
          }
        }
      }
    } catch (error) {
      console.error('Error creating law firm:', error)
    } finally {
      setCreatingLawFirm(false)
    }
  }

  // Get current user ID on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)
        }
      }
    }
    getCurrentUser()
  }, [workspaceId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Parallelize independent operations
      const [foldersData, lawFirmsData, allJourneys] = await Promise.all([
        getUserJourneyFolders(workspaceId),
        getLawFirms(),
        getUserJourneys(projectId ?? null, workspaceId)
      ])
      
      setFolders(foldersData)
      setLawFirms(lawFirmsData)

      // Batch fetch folder counts - get all journeys and subfolders with folder_id/parent_folder_id in one query
      const counts: Record<string, number> = {}
      if (foldersData.length > 0 && supabase) {
        const folderIds = foldersData.map(f => f.id)
        // Initialize all folders with 0 count
        folderIds.forEach(id => {
          counts[id] = 0
        })
        
        // Fetch all journeys with folder_id in one query
        const { data: journeysWithFolders, error: journeysError } = await supabase
          .from('user_journeys')
          .select('folder_id')
          .in('folder_id', folderIds)
        
        if (!journeysError && journeysWithFolders) {
          // Count journeys per folder
          journeysWithFolders.forEach(journey => {
            if (journey.folder_id) {
              counts[journey.folder_id] = (counts[journey.folder_id] || 0) + 1
            }
          })
        }
        
        // Count subfolders per folder (folders with parent_folder_id matching folder id)
        foldersData.forEach(folder => {
          if (folder.parent_folder_id && folderIds.includes(folder.parent_folder_id)) {
            counts[folder.parent_folder_id] = (counts[folder.parent_folder_id] || 0) + 1
          }
        })
      }
      setFolderJourneyCounts(counts)
      
      // Get unique user IDs from created_by and updated_by (journeys and folders)
      const userIds = new Set<string>()
      allJourneys.forEach(journey => {
        if (journey.created_by) userIds.add(journey.created_by)
        if (journey.updated_by) userIds.add(journey.updated_by)
      })
      foldersData.forEach(folder => {
        if (folder.created_by) userIds.add(folder.created_by)
      })
      
      console.log('📊 User Journey Tracking Debug:')
      console.log('- Total journeys:', allJourneys.length)
      console.log('- Journeys with created_by:', allJourneys.filter(j => j.created_by).length)
      console.log('- Journeys with updated_by:', allJourneys.filter(j => j.updated_by).length)
      console.log('- Unique user IDs:', Array.from(userIds))
      
      // Fetch user information if we have Supabase configured
      const usersMap = new Map<string, WorkspaceUserInfo>()
      if (supabase && userIds.size > 0) {
        const { data: users, error: usersError } = await supabase
          .from('workspace_users')
          .select('user_id, full_name, user_email')
          .in('user_id', Array.from(userIds))
        
        console.log('- Fetched users:', users?.length || 0)
        if (usersError) console.error('- Error fetching users:', usersError)
        
        if (users) {
          users.forEach(user => {
            usersMap.set(user.user_id, {
              id: user.user_id,
              full_name: user.full_name,
              email: user.user_email
            })
          })
          console.log('- Users map size:', usersMap.size)
        }
      }
      
      // Store users map in state for use in table
      setUsersMap(usersMap)
      
      // Enrich with project data, folder data, and user information
      const journeysWithData: UserJourneyWithProject[] = allJourneys.map(journey => {
        const folder = journey.folder_id 
          ? foldersData.find(f => f.id === journey.folder_id)
          : undefined
        
        return {
          ...journey,
          folder,
          createdByUser: journey.created_by ? usersMap.get(journey.created_by) : undefined,
          updatedByUser: journey.updated_by ? usersMap.get(journey.updated_by) : undefined,
          nodes_count: journey.flow_data?.nodes?.length || 0 // Computed property for sorting
        }
      })
      
      setUserJourneys(journeysWithData)
    } catch (error) {
      console.error('Error loading user journeys:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get folders at current level (for navigation)
  const currentLevelFolders = folders.filter(folder => 
    folder.parent_folder_id === currentFolderId
  )

  // Get journeys at current level (for navigation)
  const currentLevelJourneys = userJourneys.filter(journey =>
    journey.folder_id === currentFolderId
  )

  // Build path from root to current folder
  const buildFolderPath = (folderId: string | null): UserJourneyFolder[] => {
    if (!folderId) return []
    const folder = folders.find(f => f.id === folderId)
    if (!folder) return []
    return [...buildFolderPath(folder.parent_folder_id), folder]
  }

  // Check if a folder is a descendant of another folder (to prevent circular moves)
  const isDescendantOf = (folderId: string, ancestorId: string): boolean => {
    const folder = folders.find(f => f.id === folderId)
    if (!folder || !folder.parent_folder_id) return false
    if (folder.parent_folder_id === ancestorId) return true
    return isDescendantOf(folder.parent_folder_id, ancestorId)
  }

  // Filter and combine folders + journeys for table display
  const filteredTableItems: TableItem[] = (() => {
    // If searching or filtering by created by, show only journeys (ignore folders)
    if (searchTerm || createdByFilter !== 'all') {
      const searchWithEmojis = searchTerm ? emoji.emojify(searchTerm) : ''
      const searchLower = searchWithEmojis.toLowerCase()
      
      const matchingJourneys = userJourneys.filter(journey => {
        // Apply search filter
        const matchesSearch = !searchTerm || 
                             journey.name.toLowerCase().includes(searchLower) ||
                             (journey.description && journey.description.toLowerCase().includes(searchLower))
        
        // Apply project filter (if projectId is provided)
        let matchesProject = true
        if (projectId) {
          matchesProject = journey.project_id === projectId
        }
        
        // Apply created by filter
        const matchesCreatedBy = createdByFilter === 'all' || 
                                journey.created_by === createdByFilter
        
        return matchesSearch && matchesProject && matchesCreatedBy
      }).map(journey => ({ type: 'journey' as const, data: journey }))

      return matchingJourneys
    }

    // Normal navigation mode - show current level only
    // If filtering by created by, only show journeys (hide folders)
    if (createdByFilter !== 'all') {
      const journeyItems: TableItem[] = currentLevelJourneys.filter(journey => {
        // Apply project filter (if projectId is provided)
        let matchesProject = true
        if (projectId) {
          matchesProject = journey.project_id === projectId
        }
        
        // Apply created by filter
        const matchesCreatedBy = journey.created_by === createdByFilter
        
        return matchesProject && matchesCreatedBy
      }).map(journey => ({ type: 'journey', data: journey }))
      
      return journeyItems
    }
    
    // Normal mode - show folders and journeys
    const folderItems: TableItem[] = currentLevelFolders.map(folder => ({
      type: 'folder',
      data: { 
        ...folder, 
        journey_count: folderJourneyCounts[folder.id] || 0,
        createdByUser: folder.created_by ? usersMap.get(folder.created_by) : undefined
      }
    }))

    const journeyItems: TableItem[] = currentLevelJourneys.filter(journey => {
      // Apply project filter (if projectId is provided)
      let matchesProject = true
      if (projectId) {
        matchesProject = journey.project_id === projectId
      }
      
      return matchesProject
    }).map(journey => ({ type: 'journey', data: journey }))

    // Folders first, then journeys
    return [...folderItems, ...journeyItems]
  })()

  // Handle edit
  const handleEditClick = async (journey: UserJourneyWithProject) => {
    setJourneyToEdit(journey)
    setEditForm({
      name: journey.name,
      description: journey.description || '',
      layout: journey.layout || 'vertical',
    })
    
    // Fetch law firm associations lazily when opening edit modal
    try {
      const lawFirmIds = await getUserJourneyLawFirms(journey.id)
      setSelectedLawFirmIds(lawFirmIds)
    } catch (error) {
      console.error('Error fetching law firm associations:', error)
      setSelectedLawFirmIds([])
    }
    
    setLawFirmSearchQuery('')
    setShowEditModal(true)
  }

  const saveEdit = async () => {
    if (!journeyToEdit || !editForm.name.trim()) return
    
    try {
      await updateUserJourney(journeyToEdit.id, {
        name: editForm.name,
        description: editForm.description,
        layout: editForm.layout,
      })
      
      // Save law firm associations
      await setUserJourneyLawFirms(journeyToEdit.id, selectedLawFirmIds)
      
      // Update local state
      setUserJourneys(prev => prev.map(j => 
        j.id === journeyToEdit.id 
          ? { 
              ...j, 
              name: editForm.name, 
              description: editForm.description,
              layout: editForm.layout,
            }
          : j
      ))
      
      setShowEditModal(false)
      setJourneyToEdit(null)
      setSelectedLawFirmIds([])
      setLawFirmSearchQuery('')
    } catch (error) {
      console.error('Error updating journey:', error)
      alert('Failed to update journey')
    }
  }

  // Handle delete
  const handleDeleteClick = (journey: UserJourneyWithProject) => {
    setJourneyToDelete(journey)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!journeyToDelete) return
    
    const success = await deleteUserJourney(journeyToDelete.id)
    if (success) {
      setUserJourneys(prev => prev.filter(j => j.id !== journeyToDelete.id))
      setShowDeleteConfirm(false)
      setJourneyToDelete(null)
    } else {
      alert('Failed to delete journey')
    }
  }

  // Handle duplicate
  const handleDuplicateClick = (journey: UserJourneyWithProject) => {
    setJourneyToDuplicate(journey)
    setShowDuplicateConfirm(true)
  }

  const confirmDuplicate = async () => {
    if (!journeyToDuplicate) return
    
    try {
      setDuplicating(true)
      
      // Create a copy with a new name
      const duplicateName = `${journeyToDuplicate.name} (Copy)`
      
      const duplicated = await createUserJourney(
        duplicateName,
        journeyToDuplicate.description || '',
        journeyToDuplicate.flow_data || { nodes: [], edges: [] },
        journeyToDuplicate.project_id || null,
        journeyToDuplicate.layout || 'vertical',
        journeyToDuplicate.status || 'personal'
      )
      
      if (duplicated) {
        // Copy law firm associations - fetch them first
        const lawFirmIds = await getUserJourneyLawFirms(journeyToDuplicate.id)
        await setUserJourneyLawFirms(duplicated.id, lawFirmIds)
        
        // Assign to the same folder as the original journey
        if (journeyToDuplicate.folder_id) {
          await assignUserJourneysToFolder([duplicated.id], journeyToDuplicate.folder_id)
        }
        
        // Reload data to show the new journey
        await loadData()
        
        setShowDuplicateConfirm(false)
        setJourneyToDuplicate(null)
      } else {
        alert('Failed to duplicate journey')
      }
    } catch (error) {
      console.error('Error duplicating journey:', error)
      alert('Failed to duplicate journey')
    } finally {
      setDuplicating(false)
    }
  }

  // Navigate to user journey creator
  const handleCreateUserJourney = () => {
    const params = new URLSearchParams()
    if (currentFolderId) {
      params.set('folderId', currentFolderId)
    }
    const queryString = params.toString()
    navigate(`/user-journey-creator${queryString ? `?${queryString}` : ''}`)
  }

  // Navigate into a folder
  const handleFolderClick = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId)
    if (folder) {
      const slug = nameToSlug(folder.name)
      navigate(`/user-journeys/${slug}`)
      setCurrentFolderId(folderId)
      setFolderPath(buildFolderPath(folderId))
      setSelectedJourneys([])
    }
  }

  // Navigate to root
  const handleNavigateToRoot = () => {
    navigate('/user-journeys')
    setCurrentFolderId(null)
    setFolderPath([])
    setSelectedJourneys([])
  }

  // Navigate to specific folder in breadcrumb
  const handleNavigateToFolder = (folderId: string | null) => {
    if (!folderId) {
      navigate('/user-journeys')
      setCurrentFolderId(null)
      setFolderPath([])
      setSelectedJourneys([])
      return
    }
    
    const folder = folders.find(f => f.id === folderId)
    if (folder) {
      const slug = nameToSlug(folder.name)
      navigate(`/user-journeys/${slug}`)
      setCurrentFolderId(folderId)
      setFolderPath(buildFolderPath(folderId))
      setSelectedJourneys([])
    }
  }

  // Drag and drop handlers
  const handleDragStart = (type: 'journey' | 'folder', id: string) => {
    setDraggedItem({ type, id })
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverFolder(null)
  }

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault()
    setDragOverFolder(folderId)
  }

  const handleDragLeave = () => {
    setDragOverFolder(null)
  }

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault()
    if (!draggedItem) return

    try {
      if (draggedItem.type === 'journey') {
        await assignUserJourneysToFolder([draggedItem.id], targetFolderId)
      } else if (draggedItem.type === 'folder') {
        // Prevent dropping folder into itself or its descendants
        if (targetFolderId === draggedItem.id) return
        await moveFolderToParent(draggedItem.id, targetFolderId)
      }
      await loadData()
    } catch (error) {
      console.error('Error moving item:', error)
      alert('Failed to move item. Please try again.')
    } finally {
      setDraggedItem(null)
      setDragOverFolder(null)
    }
  }

  // Drag handlers for DataTable
  const getItemDragType = (item: TableItem): 'journey' | 'folder' | null => {
    return item.type
  }

  const handleTableDragStart = (item: TableItem) => {
    if (item.type === 'folder') {
      handleDragStart('folder', item.data.id)
    } else {
      handleDragStart('journey', item.data.id)
    }
  }

  const handleTableDragOver = (e: React.DragEvent, item: TableItem) => {
    // Only folders can receive drops
    if (item.type === 'folder') {
      handleDragOver(e, item.data.id)
    }
  }

  const handleTableDrop = (e: React.DragEvent, item: TableItem) => {
    // Only folders can receive drops
    if (item.type === 'folder') {
      handleDrop(e, item.data.id)
    }
  }

  // Context menu handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null)
      }
    }

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenu])

  const handleContextMenu = (e: React.MouseEvent, item: UserJourneyWithProject | FolderWithUserInfo, type: 'journey' | 'folder') => {
    e.preventDefault()
    e.stopPropagation()
    if (type === 'journey') {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        journey: item as UserJourneyWithProject
      })
    } else {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        folder: item as FolderWithUserInfo
      })
    }
  }

  const handleCopyLink = async (journey: UserJourneyWithProject) => {
    if (!journey.public_id) {
      alert('This journey does not have a public ID. Please save the journey first.')
      return
    }
    
    // Enable public sharing when copying the link
    if (!journey.is_publicly_shared) {
      await setUserJourneyPublicSharing(journey.id, true)
    }
    
    const url = `${window.location.origin}/public/user-journey/${journey.public_id}`
    try {
      await navigator.clipboard.writeText(url)
      setContextMenu(null)
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy link:', error)
      alert('Failed to copy link. Please try again.')
    }
  }

  const handleMoveClick = (journey: UserJourneyWithProject) => {
    setJourneyToMove(journey)
    setFolderToMove(null)
    setSelectedMoveFolder(journey.folder_id || '')
    setShowMoveModal(true)
    setContextMenu(null)
  }

  const handleMoveFolderClick = (folder: FolderWithUserInfo) => {
    setFolderToMove(folder)
    setJourneyToMove(null)
    setSelectedMoveFolder(folder.parent_folder_id || '')
    setShowMoveModal(true)
    setContextMenu(null)
  }

  const handleMoveConfirm = async () => {
    if (journeyToMove) {
      try {
        setMovingJourney(true)
        await assignUserJourneysToFolder(
          [journeyToMove.id],
          selectedMoveFolder || null
        )
        await loadData()
        setShowMoveModal(false)
        setJourneyToMove(null)
        setSelectedMoveFolder('')
      } catch (error) {
        console.error('Error moving journey:', error)
        alert('Failed to move journey. Please try again.')
      } finally {
        setMovingJourney(false)
      }
    } else if (folderToMove) {
      try {
        setMovingFolder(true)
        await moveFolderToParent(
          folderToMove.id,
          selectedMoveFolder || null
        )
        await loadData()
        setShowMoveModal(false)
        setFolderToMove(null)
        setSelectedMoveFolder('')
      } catch (error) {
        console.error('Error moving folder:', error)
        alert('Failed to move folder. Please try again.')
      } finally {
        setMovingFolder(false)
      }
    }
  }

  // Handle adding selected journeys to a folder
  const handleAddToFolderClick = () => {
    if (selectedJourneys.length === 0) return
    setSelectedFolderForAssignment('')
    setShowAddToFolderModal(true)
  }

  const handleAssignToFolder = async () => {
    if (selectedJourneys.length === 0) return

    setAssigningToFolder(true)
    try {
      // Allow assigning to null to remove from folder
      const folderId = selectedFolderForAssignment === 'none' ? null : selectedFolderForAssignment
      await assignUserJourneysToFolder(selectedJourneys, folderId)
      await loadData()
      setSelectedJourneys([])
      setShowAddToFolderModal(false)
      setSelectedFolderForAssignment('')
    } catch (error) {
      console.error('Error assigning journeys to folder:', error)
      alert('Failed to assign journeys to folder. Please try again.')
    } finally {
      setAssigningToFolder(false)
    }
  }

  // Handle folder deletion
  const handleDeleteFolderClick = (folder: UserJourneyFolder) => {
    setFolderToDelete(folder)
    setShowDeleteFolderConfirm(true)
  }

  const handleDeleteFolderConfirm = async () => {
    if (!folderToDelete) return

    try {
      await deleteUserJourneyFolder(folderToDelete.id)
      await loadData()
      setShowDeleteFolderConfirm(false)
      setFolderToDelete(null)
      
      // If we're inside the deleted folder, navigate to parent
      if (currentFolderId === folderToDelete.id) {
        setCurrentFolderId(folderToDelete.parent_folder_id)
        setFolderPath(buildFolderPath(folderToDelete.parent_folder_id))
      }
    } catch (error) {
      console.error('Error deleting folder:', error)
      alert('Failed to delete folder. Please try again.')
    }
  }

  const handleAddFolderClick = () => {
    setFolderToEdit(null)
    setEditFolderName('')
    setEditFolderStatus('personal')
    setShowEditFolderModal(true)
  }

  const handleEditFolderClick = (folder: UserJourneyFolder) => {
    setFolderToEdit(folder)
    setEditFolderName(folder.name)
    setEditFolderStatus(folder.status || 'personal')
    setShowEditFolderModal(true)
  }

  const handleEditFolderSave = async () => {
    if (!editFolderName.trim()) return

    try {
      // Color is determined by status: blue for shared, yellow for personal
      const folderColor = editFolderStatus === 'shared' ? '#3B82F6' : '#F59E0B'
      
      if (folderToEdit) {
        // Update existing folder
        await updateUserJourneyFolder(folderToEdit.id, {
          name: editFolderName.trim(),
          color: folderColor,
          status: editFolderStatus
        })
      } else {
        // Create new folder - nest it in current folder if we're inside one
        await createUserJourneyFolder(editFolderName.trim(), folderColor, currentFolderId, workspaceId)
      }
      
      await loadData()
      setShowEditFolderModal(false)
      setFolderToEdit(null)
      setEditFolderName('')
      setEditFolderStatus('personal')
    } catch (error) {
      console.error(`Error ${folderToEdit ? 'updating' : 'creating'} folder:`, error)
      alert(`Failed to ${folderToEdit ? 'update' : 'create'} folder. Please try again.`)
    }
  }

  // Table columns configuration
  // Only show status column at top level (when currentFolderId is null)
  const baseColumns: Column<TableItem>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      width: '400px',
      render: (item) => {
        if (item.type === 'folder') {
          const folder = item.data
          const status = folder.status || 'personal'
          // Blue for shared folders, yellow for personal folders
          const folderColor = status === 'shared' ? '#3B82F6' : '#F59E0B'
          return (
            <div className="break-words whitespace-normal flex items-center gap-3">
              <div
                className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: folderColor }}
              >
                <FolderOpen size={14} className="text-white" />
              </div>
              <div>
                <div className="font-medium text-gray-900">{convertEmojis(folder.name)}</div>
                <div className="text-xs text-gray-500">{folder.journey_count} item{folder.journey_count !== 1 ? 's' : ''}</div>
              </div>
            </div>
          )
        } else {
          const journey = item.data
          return (
            <div className="break-words whitespace-normal">
              <div className="font-medium text-gray-900">{convertEmojis(journey.name)}</div>
            </div>
          )
        }
      }
    },
    {
      key: 'updated_at',
      header: 'Modified',
      sortable: true,
      width: '180px',
      render: (item) => {
        const data = item.data
        const updatedDate = new Date(data.updated_at)
        const formattedDate = updatedDate.toLocaleDateString('en-GB', { 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric' 
        })
        
        return (
          <div className="text-sm text-gray-600">
            {formattedDate}
          </div>
        )
      }
    },
    {
      key: 'created_by',
      header: 'Created by',
      sortable: false,
      width: '180px',
      render: (item) => {
        const createdByUser = item.data.createdByUser
        if (!createdByUser) {
          return (
            <div className="text-sm text-gray-400">
              Unknown User
            </div>
          )
        }
        
        return (
          <div className="text-sm text-gray-600">
            {createdByUser.full_name || createdByUser.email || 'Unknown User'}
          </div>
        )
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      width: '150px',
      render: (item) => {
        if (item.type === 'folder') {
          const folder = item.data
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleEditFolderClick(folder)
                }}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title="Edit folder"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteFolderClick(folder)
                }}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                title="Delete folder"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )
        } else {
          const journey = item.data
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleEditClick(journey)
                }}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title="Edit journey details"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDuplicateClick(journey)
                }}
                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                title="Duplicate journey"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteClick(journey)
                }}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                title="Delete journey"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )
        }
      }
    }
  ]

  // Status column - only show at top level
  const statusColumn: Column<TableItem> = {
    key: 'status',
    header: 'Status',
    sortable: true,
    width: '120px',
    render: (item) => {
      if (item.type === 'folder') {
        const status = item.data.status || 'personal'
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
            status === 'shared' 
              ? 'bg-green-100 text-green-800 border-green-400' 
              : 'bg-yellow-100 text-yellow-800 border-yellow-400'
          }`}>
            {status === 'shared' ? (
              <>
                <Users size={14} className="flex-shrink-0" />
                <span>Shared folder</span>
              </>
            ) : (
              'Personal'
            )}
          </span>
        )
      } else {
        // Compute status from folder - journeys inherit status from their parent folder
        const journey = item.data
        const folder = journey.folder_id ? folders.find(f => f.id === journey.folder_id) : null
        const status = folder?.status || 'personal'
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
            status === 'shared' 
              ? 'bg-green-100 text-green-800 border-green-400' 
              : 'bg-yellow-100 text-yellow-800 border-yellow-400'
          }`}>
            {status === 'shared' ? 'Shared' : 'Personal'}
          </span>
        )
      }
    }
  }

  // Build columns array - include status only at top level
  const columns: Column<TableItem>[] = currentFolderId === null
    ? [...baseColumns.slice(0, 1), statusColumn, ...baseColumns.slice(1)]
    : baseColumns

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <LoadingState message="Loading user journeys..." size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className={projectId ? "flex-1 flex flex-col overflow-auto" : "flex-1 flex flex-col p-6 overflow-auto"}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">User Journeys</h2>
          <p className="text-gray-600">Visual flow diagrams showing user interactions and processes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleAddFolderClick}
            className="flex items-center gap-2"
          >
            <Plus size={20} />
            Add Folder
          </Button>
          <Button
            onClick={handleCreateUserJourney}
            className="flex items-center gap-2"
          >
            <Plus size={20} />
            Create User Journey
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search user journeys (supports emojis: :gear:)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {/* Created by filter */}
        <select
          value={createdByFilter}
          onChange={(e) => setCreatedByFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Users</option>
          {Array.from(usersMap.values()).map(user => (
            <option key={user.id} value={user.id}>
              {user.full_name || user.email || 'Unknown User'}
            </option>
          ))}
        </select>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 mb-6 text-sm flex-shrink-0">
        <button
          onClick={handleNavigateToRoot}
          className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
            currentFolderId === null ? 'text-gray-900 font-medium' : 'text-gray-600'
          }`}
        >
          <FolderOpen size={16} />
          <span>All User Journeys</span>
        </button>
        
        {folderPath.map((folder, index) => (
          <div key={folder.id} className="flex items-center gap-2">
            <ChevronRight size={16} className="text-gray-400" />
            <button
              onClick={() => handleNavigateToFolder(folder.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
                index === folderPath.length - 1 ? 'text-gray-900 font-medium' : 'text-gray-600'
              }`}
            >
              <span>{convertEmojis(folder.name)}</span>
            </button>
          </div>
        ))}
      </div>

      {/* Bulk Actions - Show when items are selected */}
      {selectedJourneys.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-blue-900 font-medium">
            {selectedJourneys.length} user journey{selectedJourneys.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleAddToFolderClick}
              className="flex items-center gap-2"
            >
              <FolderOpen size={16} />
              Add to Folder
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedJourneys([])}
              className="text-sm"
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* User Journeys Table */}
      <div className="flex-shrink-0">
        <DataTable
          data={filteredTableItems}
          getItemId={(item) => item.type === 'folder' ? `folder-${item.data.id}` : item.data.id}
          columns={columns}
          sortableFields={currentFolderId === null ? ['name', 'status', 'updated_at'] : ['name', 'updated_at']}
          onRowClick={(item, e) => {
            // Check for option-click (Mac) or Ctrl+click (Windows/Linux)
            if (e && (e.metaKey || e.altKey || e.ctrlKey)) {
              if (item.type === 'journey') {
                handleContextMenu(e as React.MouseEvent, item.data, 'journey')
              } else if (item.type === 'folder') {
                handleContextMenu(e as React.MouseEvent, item.data, 'folder')
              }
              return
            }
            
            if (item.type === 'folder') {
              handleFolderClick(item.data.id)
            } else {
              navigate(`/user-journey/${item.data.short_id}`)
            }
          }}
          onRowContextMenu={(e, item) => {
            // Show context menu for both journeys and folders
            if (item.type === 'journey') {
              handleContextMenu(e, item.data, 'journey')
            } else if (item.type === 'folder') {
              handleContextMenu(e, item.data, 'folder')
            }
          }}
          selectable={false}
          selectedItems={selectedJourneys}
          onSelectionChange={setSelectedJourneys}
          showSelectionBar={false}
          onDragStart={handleTableDragStart}
          onDragOver={handleTableDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleTableDrop}
          getItemDragType={getItemDragType}
          dragOverItemId={dragOverFolder ? `folder-${dragOverFolder}` : null}
        />
      </div>




      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && journeyToDelete && (
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false)
            setJourneyToDelete(null)
          }}
          title="Delete User Journey"
          size="sm"
          closeOnOverlayClick={false}
          footerContent={
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setJourneyToDelete(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Journey
              </Button>
            </div>
          }
        >
          <div className="p-6">
            <p className="text-gray-600">
              Are you sure you want to delete "<strong>{journeyToDelete.name}</strong>"? This action cannot be undone.
            </p>
          </div>
        </Modal>
      )}

      {/* Duplicate Confirmation Modal */}
      {showDuplicateConfirm && journeyToDuplicate && (
        <Modal
          isOpen={showDuplicateConfirm}
          onClose={() => {
            setShowDuplicateConfirm(false)
            setJourneyToDuplicate(null)
          }}
          title="Duplicate User Journey"
          size="sm"
          closeOnOverlayClick={false}
          footerContent={
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDuplicateConfirm(false)
                  setJourneyToDuplicate(null)
                }}
                disabled={duplicating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmDuplicate}
                disabled={duplicating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {duplicating ? 'Duplicating...' : 'Confirm'}
              </Button>
            </div>
          }
        >
          <div className="p-6">
            <p className="text-gray-600">
              Are you sure you want to duplicate this user journey? A copy will be created with the name "<strong>{journeyToDuplicate.name} (Copy)</strong>".
            </p>
          </div>
        </Modal>
      )}

      {/* Add/Edit Folder Modal */}
      {showEditFolderModal && (
        <Modal
          isOpen={showEditFolderModal}
          onClose={() => {
            setShowEditFolderModal(false)
            setFolderToEdit(null)
            setEditFolderName('')
            setEditFolderStatus('personal')
          }}
          closeOnOverlayClick={false}
          title={folderToEdit ? "Edit Folder" : "Add Folder"}
          size="sm"
          footerContent={
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowEditFolderModal(false)
                  setFolderToEdit(null)
                  setEditFolderName('')
                  setEditFolderStatus('personal')
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleEditFolderSave}
                disabled={!editFolderName.trim()}
              >
                {folderToEdit ? 'Save Changes' : 'Add Folder'}
              </Button>
            </div>
          }
        >
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Folder Name
              </label>
              <EmojiAutocomplete
                value={editFolderName}
                onChange={setEditFolderName}
                placeholder="Enter folder name (type : to search emojis)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* Status Toggle - Only show when editing (not creating) and user is the creator */}
            {folderToEdit && currentUserId && folderToEdit.created_by === currentUserId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Share to make this folder accessible to everyone in the workspace
                </p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={editFolderStatus === 'shared'}
                      onChange={(e) => setEditFolderStatus(e.target.checked ? 'shared' : 'personal')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {editFolderStatus === 'shared' ? 'Shared' : 'Personal'}
                  </span>
                </label>
                {editFolderStatus === 'shared' && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      All user journeys and folders inside this folder will also be shared, and therefore available to all users in this workspace.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Delete Folder Confirmation Modal */}
      {showDeleteFolderConfirm && folderToDelete && (
        <Modal
          isOpen={showDeleteFolderConfirm}
          onClose={() => {
            setShowDeleteFolderConfirm(false)
            setFolderToDelete(null)
          }}
          title="Delete Folder"
          size="md"
          closeOnOverlayClick={false}
          footerContent={
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteFolderConfirm(false)
                  setFolderToDelete(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteFolderConfirm}
              >
                Delete Folder & Contents
              </Button>
            </div>
          }
        >
          <div className="p-6 space-y-4">
            <p className="text-gray-700">
              Are you sure you want to delete "<strong>{convertEmojis(folderToDelete.name)}</strong>"?
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-2">
                ⚠️ Warning: This action cannot be undone
              </p>
              <p className="text-sm text-red-700 mb-2">
                This will permanently delete:
              </p>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                <li>The folder "{convertEmojis(folderToDelete.name)}"</li>
                <li>{folderJourneyCounts[folderToDelete.id] || 0} user journey(s) inside it</li>
                <li>Any subfolders and their contents</li>
              </ul>
            </div>
          </div>
        </Modal>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[180px]"
          style={{
            left: `${Math.min(contextMenu.x, window.innerWidth - 200)}px`,
            top: `${Math.min(contextMenu.y, window.innerHeight - 100)}px`,
          }}
        >
          {contextMenu.journey && (() => {
            // Compute status from folder - journeys inherit status from their parent folder
            const journey = contextMenu.journey!
            const folder = journey.folder_id ? folders.find(f => f.id === journey.folder_id) : null
            const isShared = folder?.status === 'shared'
            // Show copy link for all journeys (both personal and shared can be accessed via public link)
            return (
              <button
                onClick={() => handleCopyLink(journey)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <LinkIcon size={16} />
                <span>Copy link</span>
              </button>
            )
          })()}
          {(contextMenu.journey || contextMenu.folder) && (
            <button
              onClick={() => {
                if (contextMenu.journey) {
                  handleMoveClick(contextMenu.journey)
                } else if (contextMenu.folder) {
                  handleMoveFolderClick(contextMenu.folder)
                }
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
            >
              <Move size={16} />
              <span>Move</span>
            </button>
          )}
        </div>
      )}

      {/* Move Journey/Folder Modal */}
      {showMoveModal && (journeyToMove || folderToMove) && (
        <Modal
          isOpen={showMoveModal}
          onClose={() => {
            setShowMoveModal(false)
            setJourneyToMove(null)
            setFolderToMove(null)
            setSelectedMoveFolder('')
          }}
          closeOnOverlayClick={false}
          title={journeyToMove ? "Move User Journey" : "Move Folder"}
          size="sm"
          footerContent={
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowMoveModal(false)
                  setJourneyToMove(null)
                  setFolderToMove(null)
                  setSelectedMoveFolder('')
                }}
                disabled={movingJourney || movingFolder}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleMoveConfirm}
                disabled={movingJourney || movingFolder}
              >
                {(movingJourney || movingFolder) ? 'Moving...' : 'Move'}
              </Button>
            </div>
          }
        >
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Move "<strong>{convertEmojis(journeyToMove?.name || folderToMove?.name || '')}</strong>" to a folder:
            </p>
            <div>
              <select
                value={selectedMoveFolder}
                onChange={(e) => setSelectedMoveFolder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={movingJourney || movingFolder}
              >
                <option value="">No folder (root)</option>
                {folders
                  .filter(folder => {
                    // Don't show current folder or the folder being moved (to prevent moving into itself)
                    if (journeyToMove) {
                      return folder.id !== journeyToMove.folder_id
                    } else if (folderToMove) {
                      // Prevent moving folder into itself or its own descendants
                      return folder.id !== folderToMove.id && 
                             !isDescendantOf(folder.id, folderToMove.id)
                    }
                    return true
                  })
                  .map(folder => (
                    <option key={folder.id} value={folder.id}>
                      {convertEmojis(folder.name)}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Journey Modal */}
      {showEditModal && journeyToEdit && (
        <EditJourneyModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setJourneyToEdit(null)
            setSelectedLawFirmIds([])
            setLawFirmSearchQuery('')
          }}
          onSave={saveEdit}
          journeyName={editForm.name}
          journeyDescription={editForm.description}
          onNameChange={(name) => setEditForm(prev => ({ ...prev, name }))}
          onDescriptionChange={(description) => setEditForm(prev => ({ ...prev, description }))}
        />
      )}

      {/* Add Law Firm Modal - Opens from Edit Journey Details when no search results */}
      <LawFirmForm
        isOpen={showAddLawFirmModal}
        isEditing={false}
        lawFirm={newLawFirm}
        loading={creatingLawFirm}
        onUpdate={(updates) => setNewLawFirm({ ...newLawFirm, ...updates })}
        onSubmit={handleCreateLawFirmFromModal}
        onClose={() => {
          setNewLawFirm({ name: '', structure: 'decentralised', status: 'active', top_4: false })
          setShowAddLawFirmModal(false)
        }}
      />

      {/* Add to Folder Modal */}
      <Modal
        isOpen={showAddToFolderModal}
        onClose={() => setShowAddToFolderModal(false)}
        title="Add to Folder"
        size="sm"
        closeOnOverlayClick={false}
        footerContent={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowAddToFolderModal(false)}
              disabled={assigningToFolder}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAssignToFolder}
              disabled={!selectedFolderForAssignment || assigningToFolder}
              loading={assigningToFolder}
            >
              Assign to Folder
            </Button>
          </div>
        }
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            Assign <strong>{selectedJourneys.length}</strong> selected user journey{selectedJourneys.length > 1 ? 's' : ''} to a folder:
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Folder
            </label>
            <select
              value={selectedFolderForAssignment}
              onChange={(e) => setSelectedFolderForAssignment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            >
              <option value="">Choose a folder...</option>
              <option value="none">Remove from folder</option>
              {folders.map(folder => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
          
          {folders.length === 0 && (
            <p className="text-sm text-gray-500 italic">
              No folders available. Create a folder first using the "Add Folder" button.
            </p>
          )}
        </div>
      </Modal>

    </div>
  )
}
