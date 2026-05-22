import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Node } from '@xyflow/react'
import { Modal } from './DesignSystem/components/Modal'
import { Button } from './DesignSystem/components/Button'
import type { Notification } from './DesignSystem/components/UserJourneyNode'
import type { UserRole, Platform } from '../lib/supabase'
import { Plus, Trash2, GripVertical, ChevronDown, Check } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getPlatforms } from '../lib/database'
import { EmojiAutocomplete } from './EmojiAutocomplete'
import { AddPlatformModal } from './AddPlatformModal'
import { UserRoleForm } from './UserRoleManager/UserRoleForm'

interface EditNodeModalProps {
  isOpen: boolean
  onClose: () => void
  node: Node | null
  isAddingNewNode: boolean
  userRoles: UserRole[]
  availableRegions: Array<{ id: string; label: string }>
  journeyLayout: 'vertical' | 'horizontal'
  existingNodes: Node[] // List of existing nodes to determine default node type
  onSave: (formData: NodeFormData) => void
  onDelete?: () => void
  userRoleEmojiOverrides?: Record<string, string> // Journey-specific emoji overrides: { roleId: emoji }
  onUpdateEmojiOverride?: (roleId: string, emoji: string | null) => void // Callback to update emoji override for all nodes. Pass null to delete override and use global emoji.
  onCreateUserRole?: (name: string, colour: string, icon?: string) => Promise<UserRole | null> // Callback to create a new user role
  onPlatformCreated?: (platform: Platform) => void // Callback when a platform is created to refresh parent's platform list
}

interface BulletPoint {
  id: string
  text: string
}

export interface NodeFormData {
  label: string
  type: 'start' | 'process' | 'decision' | 'end' | 'label'
  variant: 'CMS' | 'Legl' | 'End client' | 'Back end' | 'Custom' | ''
  thirdPartyName: string
  customPlatformName: string
  userRole: UserRole | null
  customUserRoleName: string
  customUserRoleEmoji: string
  bulletPoints: string[]
  notifications: Notification[]
  customProperties: Record<string, unknown>
  swimLane: string | null
}

// Sortable Bullet Point Component
interface SortableBulletPointProps {
  id: string
  bullet: string
  index: number
  totalCount: number
  onUpdate: (index: number, text: string) => void
  onRemove: (index: number) => void
  onInsert: (index: number) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, index: number, bullet: string) => void
  inputRef: (el: HTMLInputElement | null) => void
}

function SortableBulletPoint({ id, bullet, index, totalCount, onUpdate, onRemove, onInsert, onKeyDown, inputRef }: SortableBulletPointProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const showDragHandle = totalCount > 1

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 group">
      <div className="flex-1 relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">•</span>
        <input
          ref={inputRef}
          type="text"
          value={bullet}
          onChange={(e) => onUpdate(index, e.target.value)}
          onKeyDown={(e) => onKeyDown(e, index, bullet)}
          className="w-full pl-6 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="Enter bullet point text"
        />
      </div>
      {showDragHandle && (
        <button
          type="button"
          className="p-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing rounded transition-colors"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
        >
          <GripVertical size={14} />
        </button>
      )}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
        title="Remove bullet point"
      >
        <Trash2 size={14} />
      </button>
      <button
        type="button"
        onClick={() => onInsert(index)}
        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
        title="Add bullet point below"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

// Sortable Notification Component
interface SortableNotificationProps {
  notification: Notification
  index: number
  totalCount: number
  colors: { bg: string; border: string; text: string; name: string }
  onUpdate: (id: string, field: 'type' | 'message', value: string) => void
  onRemove: (id: string) => void
  onInsert: (index: number) => void
}

function SortableNotification({ notification, index, totalCount, colors, onUpdate, onRemove, onInsert }: SortableNotificationProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: notification.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const showDragHandle = totalCount > 1

  // Get emoji for notification type
  const getNotificationEmoji = (type: string) => {
    switch (type) {
      case 'pain-point': return '🔴'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      case 'positive': return '✅'
      default: return 'ℹ️'
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 group">
      <div className={`flex-1 p-3 rounded-lg border ${colors.border} ${colors.bg}`}>
        <div className="flex gap-2">
          <div className="relative">
            <select
              value={notification.type}
              onChange={(e) => onUpdate(notification.id, 'type', e.target.value)}
              className="appearance-none px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer text-transparent"
              style={{ width: '4rem' }}
            >
              <option value="pain-point">🔴 Pain Point</option>
              <option value="warning">⚠️ Warning</option>
              <option value="info">ℹ️ Info</option>
              <option value="positive">✅ Positive</option>
            </select>
            <div className="absolute inset-0 flex items-center justify-center gap-1 pointer-events-none">
              <span className="text-lg">{getNotificationEmoji(notification.type)}</span>
              <ChevronDown size={14} className="text-gray-400" />
            </div>
          </div>
          <input
            type="text"
            value={notification.message}
            onChange={(e) => onUpdate(notification.id, 'message', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            placeholder="Enter notification message"
          />
        </div>
      </div>
      {showDragHandle && (
        <button
          type="button"
          className="p-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing rounded transition-colors"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
        >
          <GripVertical size={14} />
        </button>
      )}
      <button
        type="button"
        onClick={() => onRemove(notification.id)}
        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
        title="Remove notification"
      >
        <Trash2 size={14} />
      </button>
      <button
        type="button"
        onClick={() => onInsert(index)}
        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
        title="Add notification below"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

export function EditNodeModal({
  isOpen,
  onClose,
  node,
  isAddingNewNode,
  userRoles,
  availableRegions,
  journeyLayout,
  existingNodes,
  onSave,
  onDelete,
  userRoleEmojiOverrides = {},
  onUpdateEmojiOverride,
  onCreateUserRole,
  onPlatformCreated,
}: EditNodeModalProps) {
  const bulletInputRefs = useRef<(HTMLInputElement | null)[]>([])
  
  // Track if custom user role is selected
  const [isCustomUserRoleSelected, setIsCustomUserRoleSelected] = useState(false)
  
  // Local state for emoji input to allow free editing
  const [emojiInputValue, setEmojiInputValue] = useState<Record<string, string>>({})
  
  // State for platforms from database
  const [platforms, setPlatforms] = useState<Platform[]>([])
  
  // Internal state for bullet points with stable IDs for drag and drop
  const [bulletPointsWithIds, setBulletPointsWithIds] = useState<BulletPoint[]>([
    { id: `bp-${Date.now()}`, text: '' }
  ])

  // State for platform search and modal
  const [platformSearchQuery, setPlatformSearchQuery] = useState('')
  const [showAddPlatformModal, setShowAddPlatformModal] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const platformSearchRef = useRef<HTMLDivElement>(null)
  const platformInputRef = useRef<HTMLInputElement>(null)

  // State for user role search and modal
  const [userRoleSearchQuery, setUserRoleSearchQuery] = useState('')
  const [showUserRoleForm, setShowUserRoleForm] = useState(false)
  const [newUserRole, setNewUserRole] = useState({ name: '', colour: '#3B82F6', icon: '' })
  const [creatingUserRole, setCreatingUserRole] = useState(false)
  const [selectedUserRole, setSelectedUserRole] = useState<UserRole | null>(null)
  const [showUserRoleDropdown, setShowUserRoleDropdown] = useState(false)
  const [highlightedUserRoleIndex, setHighlightedUserRoleIndex] = useState(-1)
  const [userRoleDropdownPosition, setUserRoleDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const userRoleSearchRef = useRef<HTMLDivElement>(null)
  const userRoleInputRef = useRef<HTMLInputElement>(null)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Initialize form state
  const [formData, setFormData] = useState<NodeFormData>({
    label: '',
    type: 'process',
    variant: '',
    thirdPartyName: '',
    customPlatformName: '',
    userRole: null,
    customUserRoleName: '',
    customUserRoleEmoji: '',
    bulletPoints: [''],
    notifications: [],
    customProperties: {},
    swimLane: null
  })
  
  // Load platforms on mount
  useEffect(() => {
    const loadPlatforms = async () => {
      const platformsData = await getPlatforms()
      setPlatforms(platformsData)
    }
    loadPlatforms()
  }, [])

  // Filter platforms based on search query
  const filteredPlatforms = useMemo(() => {
    if (!platformSearchQuery.trim()) {
      return []
    }
    const query = platformSearchQuery.toLowerCase().trim()
    return platforms.filter(platform => 
      platform.name.toLowerCase().includes(query)
    )
  }, [platforms, platformSearchQuery])

  // Filter user roles based on search query
  const filteredUserRoles = useMemo(() => {
    if (!userRoleSearchQuery.trim()) {
      return []
    }
    const query = userRoleSearchQuery.toLowerCase().trim()
    return userRoles.filter(role => 
      role.name.toLowerCase().includes(query)
    )
  }, [userRoles, userRoleSearchQuery])

  // Reset highlighted index when filtered platforms change
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [filteredPlatforms])

  // Reset highlighted user role index when filtered user roles change
  useEffect(() => {
    setHighlightedUserRoleIndex(-1)
  }, [filteredUserRoles])

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0) {
      const dropdown = document.querySelector('.platform-dropdown')
      const highlightedItem = dropdown?.children[highlightedIndex] as HTMLElement
      if (highlightedItem) {
        highlightedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [highlightedIndex])

  // Scroll highlighted user role into view
  useEffect(() => {
    if (highlightedUserRoleIndex >= 0) {
      const dropdown = document.querySelector('.user-role-dropdown')
      const highlightedItem = dropdown?.children[highlightedUserRoleIndex] as HTMLElement
      if (highlightedItem) {
        highlightedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [highlightedUserRoleIndex])

  // Handle keyboard navigation for platforms
  const handlePlatformSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showPlatformDropdown || !platformSearchQuery.trim()) {
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const maxIndex = filteredPlatforms.length > 0 ? filteredPlatforms.length - 1 : 0
      setHighlightedIndex(prev => (prev < maxIndex ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const maxIndex = filteredPlatforms.length > 0 ? filteredPlatforms.length - 1 : 0
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : maxIndex))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightedIndex >= 0 && highlightedIndex < filteredPlatforms.length) {
        const platform = filteredPlatforms[highlightedIndex]
        setSelectedPlatform(platform)
        setPlatformSearchQuery(platform.name)
        setFormData(prev => ({ 
          ...prev, 
          variant: platform.name as NodeFormData['variant'],
          customPlatformName: ''
        }))
        setShowPlatformDropdown(false)
        setHighlightedIndex(-1)
      } else if (filteredPlatforms.length === 0 && platformSearchQuery.trim()) {
        // If no results, open add platform modal
        setShowAddPlatformModal(true)
        setShowPlatformDropdown(false)
      }
    } else if (e.key === 'Escape') {
      setShowPlatformDropdown(false)
      setHighlightedIndex(-1)
    }
  }

  // Handle keyboard navigation for user roles
  const handleUserRoleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showUserRoleDropdown || !userRoleSearchQuery.trim()) {
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const maxIndex = filteredUserRoles.length > 0 ? filteredUserRoles.length - 1 : 0
      setHighlightedUserRoleIndex(prev => (prev < maxIndex ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const maxIndex = filteredUserRoles.length > 0 ? filteredUserRoles.length - 1 : 0
      setHighlightedUserRoleIndex(prev => (prev > 0 ? prev - 1 : maxIndex))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightedUserRoleIndex >= 0 && highlightedUserRoleIndex < filteredUserRoles.length) {
        const role = filteredUserRoles[highlightedUserRoleIndex]
        setSelectedUserRole(role)
        setUserRoleSearchQuery(role.name)
        setFormData(prev => ({ 
          ...prev, 
          userRole: role,
          customUserRoleName: ''
        }))
        setIsCustomUserRoleSelected(false)
        setShowUserRoleDropdown(false)
        setHighlightedUserRoleIndex(-1)
        
        // Initialize emoji input value for the selected role
        if (onUpdateEmojiOverride) {
          const hasOverride = role.id in userRoleEmojiOverrides
          const initialEmoji = hasOverride 
            ? userRoleEmojiOverrides[role.id] 
            : (role.icon || '')
          setEmojiInputValue(prev => ({
            ...prev,
            [role.id]: initialEmoji
          }))
        }
      } else if (filteredUserRoles.length === 0 && userRoleSearchQuery.trim()) {
        // If no results, open user role form modal
        setNewUserRole({ name: userRoleSearchQuery.trim(), colour: '#3B82F6', icon: '' })
        setShowUserRoleForm(true)
        setShowUserRoleDropdown(false)
      }
    } else if (e.key === 'Escape') {
      setShowUserRoleDropdown(false)
      setHighlightedUserRoleIndex(-1)
    }
  }

  // Find selected platform
  useEffect(() => {
    if (formData.variant && formData.variant !== 'Custom') {
      const platform = platforms.find(p => p.name === formData.variant)
      setSelectedPlatform(platform || null)
      if (platform && !showPlatformDropdown) {
        setPlatformSearchQuery(platform.name)
      } else if (platforms.length > 0 && !showPlatformDropdown) {
        // Platform not found in list, but variant is set - clear search query if dropdown is closed
        setPlatformSearchQuery('')
      }
    } else if (formData.variant === 'Custom') {
      // For Custom variant, show customPlatformName in search query if it exists
      if (formData.customPlatformName && !showPlatformDropdown) {
        setPlatformSearchQuery(formData.customPlatformName)
      } else if (!showPlatformDropdown) {
        setPlatformSearchQuery('')
      }
      setSelectedPlatform(null)
    } else {
      // No variant set (shouldn't happen if default is applied, but handle gracefully)
      setSelectedPlatform(null)
      if (!showPlatformDropdown) {
        setPlatformSearchQuery('')
      }
    }
  }, [formData.variant, formData.customPlatformName, platforms, showPlatformDropdown])

  // Find selected user role
  useEffect(() => {
    if (formData.userRole) {
      setSelectedUserRole(formData.userRole)
      setUserRoleSearchQuery(formData.userRole.name)
    } else {
      setSelectedUserRole(null)
      if (!showUserRoleDropdown) {
        setUserRoleSearchQuery('')
      }
    }
  }, [formData.userRole, showUserRoleDropdown])

  // Update dropdown position when it opens
  useEffect(() => {
    if (showPlatformDropdown && platformInputRef.current) {
      const updatePosition = () => {
        if (platformInputRef.current) {
          const rect = platformInputRef.current.getBoundingClientRect()
          setDropdownPosition({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width
          })
        }
      }
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    } else {
      setDropdownPosition(null)
    }
  }, [showPlatformDropdown, platformSearchQuery])

  // Update user role dropdown position when it opens
  useEffect(() => {
    if (showUserRoleDropdown && userRoleInputRef.current) {
      const updatePosition = () => {
        if (userRoleInputRef.current) {
          const rect = userRoleInputRef.current.getBoundingClientRect()
          setUserRoleDropdownPosition({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width
          })
        }
      }
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    } else {
      setUserRoleDropdownPosition(null)
    }
  }, [showUserRoleDropdown, userRoleSearchQuery])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const dropdown = document.querySelector('.platform-dropdown')
      if (
        platformSearchRef.current && 
        !platformSearchRef.current.contains(target) &&
        dropdown &&
        !dropdown.contains(target)
      ) {
        setShowPlatformDropdown(false)
      }
    }

    if (showPlatformDropdown) {
      // Use a small delay to avoid closing immediately on open
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 0)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showPlatformDropdown])

  // Handle click outside to close user role dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const dropdown = document.querySelector('.user-role-dropdown')
      if (
        userRoleSearchRef.current && 
        !userRoleSearchRef.current.contains(target) &&
        dropdown &&
        !dropdown.contains(target)
      ) {
        setShowUserRoleDropdown(false)
      }
    }

    if (showUserRoleDropdown) {
      // Use a small delay to avoid closing immediately on open
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 0)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showUserRoleDropdown])

  // Update form when node changes
  useEffect(() => {
    if (node && isOpen) {
      const existingBulletPoints = (node.data?.bulletPoints as string[]) || []
      let nodeVariant = node.data?.variant as 'CMS' | 'Legl' | 'End client' | 'Back end' | 'Third party' | 'Custom' | ''
      
      // Convert old 'Third party' to new 'Custom'
      if (nodeVariant === 'Third party') {
        nodeVariant = 'Custom'
      }
      
      const resolvedVariant = (nodeVariant !== undefined && nodeVariant !== null && nodeVariant !== '') ? nodeVariant : ''
      
      // Convert bullet points to objects with IDs
      const bulletPointsWithNewIds: BulletPoint[] = existingBulletPoints.length > 0
        ? existingBulletPoints.map((text, index) => ({ id: `bp-${Date.now()}-${index}`, text }))
        : [{ id: `bp-${Date.now()}`, text: '' }]
      
      setBulletPointsWithIds(bulletPointsWithNewIds)
      
      const existingNotifications = (node.data?.notifications as Notification[]) || []
      const notificationsWithDefault = existingNotifications.length > 0 
        ? existingNotifications 
        : [{ id: `notif-${Date.now()}`, type: 'info' as const, message: '' }]
      
      const customUserRoleName = (node.data?.customUserRoleName as string) || ''
      // If this node doesn't have an emoji but other nodes with the same custom role name do, use that emoji
      let customUserRoleEmoji = (node.data?.customUserRoleEmoji as string) || ''
      if (customUserRoleName && !customUserRoleEmoji) {
        // Find another node with the same custom user role name that has an emoji
        const nodeWithEmoji = existingNodes.find(
          n => n.data?.customUserRoleName === customUserRoleName && n.data?.customUserRoleEmoji
        )
        if (nodeWithEmoji) {
          customUserRoleEmoji = (nodeWithEmoji.data?.customUserRoleEmoji as string) || ''
        }
      }
      const initialCustomPlatformNameValue = (node.data?.customPlatformName as string) || (node.data?.thirdPartyName as string) || ''
      setFormData({
        label: (node.data?.label as string) || '',
        type: (node.data?.type as 'start' | 'process' | 'decision' | 'end') || 'process',
        variant: resolvedVariant,
        thirdPartyName: (node.data?.thirdPartyName as string) || '',
        customPlatformName: initialCustomPlatformNameValue,
        userRole: (node.data?.userRole as UserRole | null) || null,
        customUserRoleName: customUserRoleName,
        customUserRoleEmoji: customUserRoleEmoji,
        bulletPoints: existingBulletPoints.length > 0 ? existingBulletPoints : [''],
        notifications: notificationsWithDefault,
        customProperties: (node.data?.customProperties as Record<string, unknown>) || {},
        swimLane: (node as any).parentId || null
      })
      // Set platform search query based on variant
      if (resolvedVariant === 'Custom') {
        // For Custom variant, show customPlatformName if it exists
        if (initialCustomPlatformNameValue) {
          setPlatformSearchQuery(initialCustomPlatformNameValue)
        } else {
          setPlatformSearchQuery('')
        }
        setSelectedPlatform(null)
      } else if (resolvedVariant) {
        // For non-Custom variants, set the platform name immediately
        // The useEffect will update selectedPlatform when platforms load
        setPlatformSearchQuery(resolvedVariant)
      } else {
        setPlatformSearchQuery('')
        setSelectedPlatform(null)
      }
      // Set custom user role selected state if customUserRoleName exists
      setIsCustomUserRoleSelected(!!customUserRoleName)
    } else if (isAddingNewNode && isOpen) {
      // Reset form for new node with one empty notification by default
      setBulletPointsWithIds([{ id: `bp-${Date.now()}`, text: '' }])
      
      // Filter out highlight regions when checking for existing nodes
      const regularNodes = existingNodes.filter(n => n.type !== 'highlightRegion')
      // If there are no nodes yet, default to 'start', otherwise 'process'
      const defaultType = regularNodes.length === 0 ? 'start' : 'process'
      
      setFormData({
        label: '',
        type: defaultType,
        variant: '',
        thirdPartyName: '',
        customPlatformName: '',
        userRole: null,
        customUserRoleName: '',
        customUserRoleEmoji: '',
        bulletPoints: [''],
        notifications: [{ id: `notif-${Date.now()}`, type: 'info' as const, message: '' }],
        customProperties: {},
        swimLane: null
      })
      
      setPlatformSearchQuery('')
      setSelectedPlatform(null)
      // Reset user role search for new node
      setUserRoleSearchQuery('')
      setSelectedUserRole(null)
      setIsCustomUserRoleSelected(false)
    }
    
  }, [node, isOpen, isAddingNewNode, existingNodes])

  // Sync emoji input value when user role changes (but not when override changes to allow editing)
  useEffect(() => {
    if (formData.userRole && onUpdateEmojiOverride) {
      const roleId = formData.userRole.id
      // Only initialize if we don't have a value for this role yet
      if (emojiInputValue[roleId] === undefined) {
        const hasOverride = roleId in userRoleEmojiOverrides
        const initialEmoji = hasOverride 
          ? userRoleEmojiOverrides[roleId] 
          : (formData.userRole.icon || '')
        setEmojiInputValue(prev => ({
          ...prev,
          [roleId]: initialEmoji
        }))
      }
    }
  }, [formData.userRole?.id])

  // Define handleSave early so it can be used in useEffect
  const handleSave = useCallback(() => {
    // Convert bulletPointsWithIds back to string array
    const bulletPointsAsStrings = bulletPointsWithIds.map(bp => bp.text)
    
    onSave({
      ...formData,
      bulletPoints: bulletPointsAsStrings
    })
  }, [formData, bulletPointsWithIds, onSave])


  // Handle global Enter key press to trigger Save (when not in textarea or select)
  useEffect(() => {
    if (!isOpen) return

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const activeElement = document.activeElement
        const isTextarea = activeElement?.tagName === 'TEXTAREA'
        const isSelect = activeElement?.tagName === 'SELECT'
        
        // Check if platform search input is focused
        const isPlatformSearchInput = platformInputRef.current === activeElement
        
        // Check if user role search input is focused
        const isUserRoleSearchInput = userRoleInputRef.current === activeElement
        
        // Check if emoji picker is open (look for the picker dropdown in the DOM)
        const emojiPicker = document.querySelector('.emoji-picker-dropdown')
        const isEmojiPickerOpen = emojiPicker !== null
        
        // Don't trigger Save if emoji picker is open - let the picker handle Enter key
        if (isEmojiPickerOpen) {
          return
        }
        
        // Don't trigger Save if platform search is focused - let the search handle Enter key
        if (isPlatformSearchInput) {
          return
        }
        
        // Don't trigger Save if user role search is focused - let the search handle Enter key
        if (isUserRoleSearchInput) {
          return
        }
        
        // Trigger Save for all inputs except textareas and selects
        // Bullet point inputs will be handled by their own onKeyDown handler
        if (!isTextarea && !isSelect) {
          // Check if it's already handled by a bullet point input
          const isBulletPointInput = bulletInputRefs.current.some(ref => ref === activeElement)
          if (!isBulletPointInput) {
            e.preventDefault()
            handleSave()
          }
        }
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [isOpen, handleSave])

  // Bullet point handlers
  const addBulletPoint = useCallback(() => {
    setBulletPointsWithIds(prev => [...prev, { id: `bp-${Date.now()}`, text: '' }])
  }, [])

  const updateBulletPoint = useCallback((index: number, newText: string) => {
    setBulletPointsWithIds(prev => prev.map((bp, i) => i === index ? { ...bp, text: newText } : bp))
  }, [])

  const removeBulletPoint = useCallback((index: number) => {
    setBulletPointsWithIds(prev => prev.filter((_, i) => i !== index))
  }, [])

  const insertBulletPoint = useCallback((index: number) => {
    const newBulletPoint = { id: `bp-${Date.now()}`, text: '' }
    setBulletPointsWithIds(prev => [
      ...prev.slice(0, index + 1),
      newBulletPoint,
      ...prev.slice(index + 1)
    ])
  }, [])

  const handleBulletPointKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number, value: string) => {
    // Handle Command+B or Ctrl+B for bold formatting
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault()
      const input = e.currentTarget
      const start = input.selectionStart || 0
      const end = input.selectionEnd || 0
      
      if (start !== end) {
        // Text is selected, wrap it with **
        const selectedText = value.substring(start, end)
        const beforeText = value.substring(0, start)
        const afterText = value.substring(end)
        const newValue = `${beforeText}**${selectedText}**${afterText}`
        
        updateBulletPoint(index, newValue)
        
        // Restore cursor position after the closing **
        setTimeout(() => {
          if (bulletInputRefs.current[index]) {
            const newCursorPos = start + selectedText.length + 4 // **text** = 4 extra chars
            bulletInputRefs.current[index]?.setSelectionRange(newCursorPos, newCursorPos)
            bulletInputRefs.current[index]?.focus()
          }
        }, 0)
      }
      return
    }
    
    // Tab key: only add new bullet point if this is the last bullet point
    if (e.key === 'Tab' && !e.shiftKey) {
      // Use functional update to get current state
      setBulletPointsWithIds(prev => {
        const isLastBulletPoint = index === prev.length - 1
        if (isLastBulletPoint) {
          e.preventDefault()
          const newBulletPoint = { id: `bp-${Date.now()}`, text: '' }
          setTimeout(() => {
            const newIndex = index + 1
            if (bulletInputRefs.current[newIndex]) {
              bulletInputRefs.current[newIndex]?.focus()
            }
          }, 0)
          return [...prev, newBulletPoint]
        }
        // If not the last bullet point, let Tab work normally (move to next field)
        return prev
      })
      return
    }
    
    // Enter key: trigger Save button
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      handleSave()
    }
  }, [updateBulletPoint, handleSave])

  // Notification handlers
  const addNotification = useCallback(() => {
    setFormData(prev => {
      // Get the type of the last notification, or default to 'info' if no notifications exist
      const lastNotificationType = prev.notifications.length > 0 
        ? prev.notifications[prev.notifications.length - 1].type 
        : 'info'
      
      const newNotification: Notification = {
        id: `notif-${Date.now()}`,
        type: lastNotificationType,
        message: ''
      }
      return {
        ...prev,
        notifications: [...prev.notifications, newNotification]
      }
    })
  }, [])

  const updateNotification = useCallback((id: string, field: 'type' | 'message', value: string) => {
    setFormData(prev => ({
      ...prev,
      notifications: prev.notifications.map(notif =>
        notif.id === id ? { ...notif, [field]: value } : notif
      )
    }))
  }, [])

  const removeNotification = useCallback((id: string) => {
    setFormData(prev => ({
      ...prev,
      notifications: prev.notifications.filter(notif => notif.id !== id)
    }))
  }, [])

  const insertNotification = useCallback((index: number) => {
    setFormData(prev => {
      // Get the type of the notification at the current index (the one we're inserting after)
      // or default to 'info' if no notifications exist
      const previousNotificationType = prev.notifications.length > 0 && index >= 0 && index < prev.notifications.length
        ? prev.notifications[index].type 
        : prev.notifications.length > 0
          ? prev.notifications[prev.notifications.length - 1].type
          : 'info'
      
      const newNotification: Notification = {
        id: `notif-${Date.now()}`,
        type: previousNotificationType,
        message: ''
      }
      return {
        ...prev,
        notifications: [
          ...prev.notifications.slice(0, index + 1),
          newNotification,
          ...prev.notifications.slice(index + 1)
        ]
      }
    })
  }, [])

  // Drag and drop handler for bullet points
  const handleBulletDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setBulletPointsWithIds((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }, [])

  // Drag and drop handler for notifications
  const handleNotificationDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setFormData(prev => {
        const notifications = [...prev.notifications]
        const oldIndex = notifications.findIndex((item) => item.id === active.id)
        const newIndex = notifications.findIndex((item) => item.id === over.id)
        
        return {
          ...prev,
          notifications: arrayMove(notifications, oldIndex, newIndex)
        }
      })
    }
  }, [])

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'pain-point':
        return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', name: 'Pain Point' }
      case 'warning':
        return { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-900', name: 'Warning' }
      case 'info':
        return { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700', name: 'Info' }
      case 'positive':
        return { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-800', name: 'Positive' }
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAddingNewNode ? 'Add Node' : 'Edit Node'}
      size="lg"
      closeOnOverlayClick={false}
      footerContent={
        <div className="flex justify-between items-center">
          {/* Delete button on the left - only show when editing existing node */}
          <div>
            {!isAddingNewNode && onDelete && (
              <Button 
                variant="ghost" 
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this node?')) {
                    onDelete()
                    onClose()
                  }
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Node
              </Button>
            )}
          </div>
          
          {/* Cancel and Save buttons on the right */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Label */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Label <span className="text-xs text-gray-500 font-normal">(Type : for emojis)</span>
          </label>
          <EmojiAutocomplete
            value={formData.label}
            onChange={(value) => setFormData(prev => ({ ...prev, label: value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter node label"
            autoFocus={isOpen && isAddingNewNode}
          />
        </div>

        {/* Swim Lane (Region) - only for horizontal layouts */}
        {journeyLayout === 'horizontal' && availableRegions.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Swim Lane (Region)
            </label>
            <select
              value={formData.swimLane || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, swimLane: e.target.value || null }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">None</option>
              {availableRegions.map(region => (
                <option key={region.id} value={region.id}>
                  {region.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Bullet Points with Drag and Drop */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bullet points
          </label>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleBulletDragEnd}
          >
            <SortableContext
              items={bulletPointsWithIds.map(bp => bp.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {bulletPointsWithIds.map((bulletPoint, index) => (
                  <SortableBulletPoint
                    key={bulletPoint.id}
                    id={bulletPoint.id}
                    bullet={bulletPoint.text}
                    index={index}
                    totalCount={bulletPointsWithIds.length}
                    onUpdate={updateBulletPoint}
                    onRemove={removeBulletPoint}
                    onInsert={insertBulletPoint}
                    onKeyDown={handleBulletPointKeyDown}
                    inputRef={(el) => bulletInputRefs.current[index] = el}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
         
        </div>

        {/* Notifications */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notifications
          </label>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleNotificationDragEnd}
          >
            <SortableContext
              items={formData.notifications.map(notif => notif.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {formData.notifications.map((notification, index) => (
                  <SortableNotification
                    key={notification.id}
                    notification={notification}
                    index={index}
                    totalCount={formData.notifications.length}
                    colors={getNotificationColor(notification.type)}
                    onUpdate={updateNotification}
                    onRemove={removeNotification}
                    onInsert={insertNotification}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
         
        </div>

        {/* User Role and Platform - Side by side */}
        <div className="grid grid-cols-2 gap-4 border-t py-4">
          {/* User Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Role
            </label>
            <div className="relative" ref={userRoleSearchRef}>
              <input
                ref={userRoleInputRef}
                type="text"
                value={userRoleSearchQuery}
                onChange={(e) => {
                  setUserRoleSearchQuery(e.target.value)
                  setShowUserRoleDropdown(true)
                  setHighlightedUserRoleIndex(-1)
                  if (e.target.value.trim() === '') {
                    setFormData(prev => ({ ...prev, userRole: null, customUserRoleName: '' }))
                    setSelectedUserRole(null)
                    setIsCustomUserRoleSelected(false)
                  }
                }}
                onKeyDown={handleUserRoleSearchKeyDown}
                onFocus={() => {
                  setShowUserRoleDropdown(true)
                }}
                placeholder="Search for a user role..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {showUserRoleDropdown && userRoleSearchQuery.trim() && userRoleDropdownPosition && createPortal(
                <div 
                  className="user-role-dropdown fixed z-[9999] bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
                  style={{
                    top: `${userRoleDropdownPosition.top}px`,
                    left: `${userRoleDropdownPosition.left}px`,
                    width: `${userRoleDropdownPosition.width}px`
                  }}
                >
                  {filteredUserRoles.length > 0 ? (
                    filteredUserRoles.map((role, index) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => {
                          setSelectedUserRole(role)
                          setUserRoleSearchQuery(role.name)
                          setFormData(prev => ({ 
                            ...prev, 
                            userRole: role,
                            customUserRoleName: ''
                          }))
                          setIsCustomUserRoleSelected(false)
                          setShowUserRoleDropdown(false)
                          setHighlightedUserRoleIndex(-1)
                          
                          // Initialize emoji input value for the selected role
                          if (onUpdateEmojiOverride) {
                            const hasOverride = role.id in userRoleEmojiOverrides
                            const initialEmoji = hasOverride 
                              ? userRoleEmojiOverrides[role.id] 
                              : (role.icon || '')
                            setEmojiInputValue(prev => ({
                              ...prev,
                              [role.id]: initialEmoji
                            }))
                          }
                        }}
                        onMouseEnter={() => setHighlightedUserRoleIndex(index)}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2 ${
                          highlightedUserRoleIndex === index 
                            ? 'bg-blue-50 text-blue-900' 
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        {role.icon && (
                          <span className="text-lg">{role.icon}</span>
                        )}
                        <span>{role.name}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          const roleName = userRoleSearchQuery.trim()
                          setNewUserRole({ name: roleName, colour: '#3B82F6', icon: '' })
                          setShowUserRoleForm(true)
                          setShowUserRoleDropdown(false)
                        }}
                        className="w-full text-left text-blue-600 hover:text-blue-800 font-medium"
                      >
                        + Add user role "{userRoleSearchQuery}"
                      </button>
                    </div>
                  )}
                </div>,
                document.body
              )}
            </div>
            
            {/* Emoji selector for selected user role */}
            {formData.userRole && onUpdateEmojiOverride && (() => {
              const roleId = formData.userRole.id
              const hasOverride = roleId in userRoleEmojiOverrides
              // Use local input value if it exists, otherwise use override or global emoji
              const currentEmoji = emojiInputValue[roleId] !== undefined
                ? emojiInputValue[roleId]
                : (hasOverride 
                    ? userRoleEmojiOverrides[roleId] 
                    : (formData.userRole.icon || ''))
              
              return (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Emoji for this role
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <EmojiAutocomplete
                        value={currentEmoji}
                        onChange={(value) => {
                          if (formData.userRole) {
                            // Update local state immediately for responsive UI
                            setEmojiInputValue(prev => ({
                              ...prev,
                              [roleId]: value
                            }))
                            // Update the override
                            onUpdateEmojiOverride(roleId, value)
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                        placeholder="Select emoji..."
                      />
                    </div>
                    {hasOverride && (
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.userRole && onUpdateEmojiOverride) {
                            // Delete override to use global emoji
                            onUpdateEmojiOverride(roleId, null)
                            // Reset local input value to global emoji
                            setEmojiInputValue(prev => ({
                              ...prev,
                              [roleId]: formData.userRole!.icon || ''
                            }))
                          }
                        }}
                        className="px-2 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Reset to global emoji"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    This emoji will be used for all nodes with this role in this journey.
                  </p>
                </div>
              )
            })()}
          </div>

          {/* Platform/Variant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platform
            </label>
            <div className="relative" ref={platformSearchRef}>
              <input
                ref={platformInputRef}
                type="text"
                value={platformSearchQuery}
                onChange={(e) => {
                  setPlatformSearchQuery(e.target.value)
                  setShowPlatformDropdown(true)
                  setHighlightedIndex(-1)
                  if (e.target.value.trim() === '') {
                    setFormData(prev => ({ ...prev, variant: '', customPlatformName: '' }))
                    setSelectedPlatform(null)
                  }
                }}
                onKeyDown={handlePlatformSearchKeyDown}
                onFocus={() => {
                  setShowPlatformDropdown(true)
                }}
                placeholder="Search for a platform..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {showPlatformDropdown && platformSearchQuery.trim() && dropdownPosition && createPortal(
                <div 
                  className="platform-dropdown fixed z-[9999] bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
                  style={{
                    top: `${dropdownPosition.top}px`,
                    left: `${dropdownPosition.left}px`,
                    width: `${dropdownPosition.width}px`
                  }}
                >
                  {filteredPlatforms.length > 0 ? (
                    filteredPlatforms.map((platform, index) => (
                      <button
                        key={platform.id}
                        type="button"
                        onClick={() => {
                          setSelectedPlatform(platform)
                          setPlatformSearchQuery(platform.name)
                          setFormData(prev => ({ 
                            ...prev, 
                            variant: platform.name as NodeFormData['variant'],
                            customPlatformName: ''
                          }))
                          setShowPlatformDropdown(false)
                          setHighlightedIndex(-1)
                        }}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2 ${
                          highlightedIndex === index 
                            ? 'bg-blue-50 text-blue-900' 
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        {platform.logo && (
                          <div className="w-6 h-6 flex-shrink-0">
                            {platform.logo.startsWith('<svg') || platform.logo.startsWith('<?xml') ? (
                              <div 
                                className="w-full h-full"
                                dangerouslySetInnerHTML={{ __html: platform.logo }}
                              />
                            ) : (
                              <img src={platform.logo} alt={platform.name} className="w-full h-full object-contain" />
                            )}
                          </div>
                        )}
                        <span>{platform.name}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPlatformDropdown(false)
                          setHighlightedIndex(-1)
                          setShowAddPlatformModal(true)
                        }}
                        className="w-full text-left text-blue-600 hover:text-blue-800 font-medium"
                      >
                        + Add platform "{platformSearchQuery}"
                      </button>
                    </div>
                  )}
                </div>,
                document.body
              )}
            </div>
          </div>
        </div>

        {/* Custom User Role Name (conditionally shown) */}
        {(isCustomUserRoleSelected || formData.customUserRoleName) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom User Role Name
            </label>
            <div className="flex items-center gap-2">
              <div className="w-20">
                <EmojiAutocomplete
                  key={`emoji-${formData.customUserRoleName}`}
                  value={formData.customUserRoleEmoji || ''}
                  onChange={(value) => {
                    // Allow clearing the emoji by setting empty string
                    setFormData(prev => ({ ...prev, customUserRoleEmoji: value || '' }))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  placeholder=":"
                />
              </div>
              <div className="flex-1">
                <EmojiAutocomplete
                  value={formData.customUserRoleName}
                  onChange={(value) => setFormData(prev => ({ ...prev, customUserRoleName: value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter custom user role name"
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Enter a custom user role name. The emoji will be applied to all nodes with this role name.
            </p>
          </div>
        )}


      </div>

      {/* Add Platform Modal */}
      <AddPlatformModal
        isOpen={showAddPlatformModal}
        onClose={() => {
          setShowAddPlatformModal(false)
        }}
        onSuccess={async (platform) => {
          // Immediately update UI with the platform we already have (no database fetch needed)
          // Add the new platform to the local platforms list if it doesn't exist
          setPlatforms(prev => {
            const exists = prev.some(p => p.id === platform.id)
            return exists ? prev : [...prev, platform]
          })
          
          // Select the newly created platform immediately
          setSelectedPlatform(platform)
          setPlatformSearchQuery(platform.name)
          setFormData(prev => ({ 
            ...prev, 
            variant: platform.name as NodeFormData['variant'],
            customPlatformName: ''
          }))
          
          // Close the platform dropdown
          setShowPlatformDropdown(false)
          setHighlightedIndex(-1)
          
          // Close the Add Platform modal immediately
          setShowAddPlatformModal(false)
          
          // Refresh platforms in the background (non-blocking) to ensure sync
          // Also notify parent component to refresh platforms
          if (onPlatformCreated) {
            onPlatformCreated(platform)
          }
          
          // Refresh platforms list in background for consistency
          getPlatforms().then(platformsData => {
            setPlatforms(platformsData)
          }).catch(error => {
            console.error('Error refreshing platforms:', error)
            // If refresh fails, we still have the platform in local state, so UI is fine
          })
        }}
        initialName={platformSearchQuery.trim()}
      />

      {/* Add User Role Form Modal */}
      {onCreateUserRole && showUserRoleForm && (
        <UserRoleForm
          isEditing={false}
          userRole={newUserRole}
          loading={creatingUserRole}
          onUpdate={(updates) => setNewUserRole({ ...newUserRole, ...updates })}
          onSubmit={async (e) => {
            e.preventDefault()
            if (!newUserRole.name.trim()) return

            setCreatingUserRole(true)
            try {
              // Create the user role using the callback
              const createdRole = await onCreateUserRole(
                newUserRole.name.trim(),
                newUserRole.colour,
                newUserRole.icon || undefined
              )
              if (createdRole) {
                // Select the newly created user role
                setSelectedUserRole(createdRole)
                setUserRoleSearchQuery(createdRole.name)
                setFormData(prev => ({ 
                  ...prev, 
                  userRole: createdRole,
                  customUserRoleName: ''
                }))
                setIsCustomUserRoleSelected(false)
                
                // Initialize emoji input value for the selected role
                if (onUpdateEmojiOverride) {
                  const hasOverride = createdRole.id in userRoleEmojiOverrides
                  const initialEmoji = hasOverride 
                    ? userRoleEmojiOverrides[createdRole.id] 
                    : (createdRole.icon || '')
                  setEmojiInputValue(prev => ({
                    ...prev,
                    [createdRole.id]: initialEmoji
                  }))
                }
                
                // Reset form and close modal
                setNewUserRole({ name: '', colour: '#3B82F6', icon: '' })
                setShowUserRoleForm(false)
              }
            } catch (error) {
              console.error('Error creating user role:', error)
            } finally {
              setCreatingUserRole(false)
            }
          }}
          onClose={() => {
            setShowUserRoleForm(false)
            setNewUserRole({ name: '', colour: '#3B82F6', icon: '' })
          }}
        />
      )}
    </Modal>
  )
}

