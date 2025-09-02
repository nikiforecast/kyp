import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { SupabaseAuthError } from '../../lib/supabase'
import { type BlockNoteBlock } from '../../utils/blocknoteConverters'
import {
  getStakeholders,
  getUserRoles,
  getUserPermissions,
  getLawFirms,
  getResearchNotes,
  createResearchNote,
  updateResearchNote,
  deleteResearchNote,
  getResearchNoteStakeholders,
  getProblemOverview,
  saveProblemOverview,
  getProjectStakeholders,
  assignStakeholderToProject,
  removeStakeholderFromProject,
  getUserStoryRoles,
  getUserStories,
  createUserStory,
  updateUserStory,
  deleteUserStory,
  getUserStoryComments,
  createUserStoryComment,
  updateUserStoryComment,
  deleteUserStoryComment,
  getUserJourneys,
  getUserJourneyStakeholders,
  getThemes,
  getWorkspaceUsers,
  getNoteTemplates,
  getAllProjectProgressStatus,
  getTasks,
  createTask,
  getExamples,
  getExamplesCount
} from '../../lib/database'
import { ProjectViewRenderer } from './ProjectViewRenderer'
import type { 
  Project, 
  Stakeholder, 
  ResearchNote, 
  ProblemOverview, 
  UserRole, 
  LawFirm, 
  UserStory, 
  Theme, 
  WorkspaceUser,
  UserJourney,
  UserPermission,
  NoteTemplate,
  ProjectProgressStatus,
  Task,
  UserStoryComment,
  Example
} from '../../lib/supabase'

interface ProjectDataFetcherProps {
  project: Project
  initialSelectedNote?: ResearchNote | null
  initialView?: string
  initialSelectedUserStory?: UserStory | null
  initialSelectedUserJourney?: UserJourney | null
  initialUserStoryRoleIds?: string[]
  initialSelectedDesign?: Design | null
  workspaceUsers: WorkspaceUser[]
  onCreateTask?: (name: string, description: string, status: string, assignedToUserId?: string, userStoryId?: string) => Promise<void>
  onUpdateTask?: (taskId: string, updates: { name?: string; description?: string; status?: string; user_story_id?: string }) => Promise<void>
  onDeleteTask?: (taskId: string) => Promise<void>
  onBack: () => void
  onNavigateToWorkspace?: (view: string) => void
  onSignOut?: () => void
}

export function ProjectDataFetcher({
  project,
  initialSelectedNote = null,
  initialView = 'dashboard',
  initialSelectedUserStory = null,
  initialSelectedUserJourney = null,
  initialUserStoryRoleIds = [],
  initialSelectedDesign = null,
  workspaceUsers,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onBack,
  onNavigateToWorkspace,
  onSignOut
}: ProjectDataFetcherProps) {
  const { user } = useAuth()
  
  // Data states
  const [allStakeholders, setAllStakeholders] = useState<Stakeholder[]>([])
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([])
  const [lawFirms, setLawFirms] = useState<LawFirm[]>([])
  const [assignedStakeholders, setAssignedStakeholders] = useState<string[]>([])
  const [notes, setNotes] = useState<ResearchNote[]>([])
  const [userStories, setUserStories] = useState<UserStory[]>([])
  const [storyRoles, setStoryRoles] = useState<Record<string, string[]>>({})
  const [examples, setExamples] = useState<Example[]>([])
  const [examplesCount, setExamplesCount] = useState(0)
  const [userJourneys, setUserJourneys] = useState<UserJourney[]>([])
  const [userJourneyStakeholders, setUserJourneyStakeholders] = useState<Record<string, string[]>>({})
  const [themes, setThemes] = useState<Theme[]>([])
  const [noteTemplates, setNoteTemplates] = useState<NoteTemplate[]>([])
  const [problemOverview, setProblemOverview] = useState<ProblemOverview>({
    id: '',
    project_id: project.id,
    what_is_the_problem: '',
    should_we_solve_it: '',
    understanding_rating: 5,
    risk_level: 5,
    created_at: '',
    updated_at: ''
  })
  const [noteStakeholders, setNoteStakeholders] = useState<Record<string, string[]>>({})
  const [projectTasks, setProjectTasks] = useState<Task[]>([])
  const [allProjectProgressStatus, setAllProjectProgressStatus] = useState<ProjectProgressStatus[]>([])
  const [userStoryComments, setUserStoryComments] = useState<UserStoryComment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNote, setSelectedNote] = useState<ResearchNote | null>(initialSelectedNote)

  // Load comments when selected user story changes
  useEffect(() => {
    if (initialSelectedUserStory) {
      loadUserStoryComments(initialSelectedUserStory.id)
    }
  }, [initialSelectedUserStory])

  useEffect(() => {
    fetchData()
    loadProblemOverviewData()
    loadProjectStakeholders()
    loadAllNoteStakeholders()
    loadProjectTasks()
    loadProjectProgressStatus()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [
        stakeholdersData,
        userRolesData,
        userPermissionsData,
        lawFirmsData,
        researchNotesData,
        userStoriesData,
        userJourneysData,
        themesData,
        noteTemplatesData,
        examplesData,
        examplesCountData
      ] = await Promise.all([
        getStakeholders(),
        getUserRoles(),
        getUserPermissions(),
        getLawFirms(),
        getResearchNotes(),
        getUserStories(project.id),
        getUserJourneys(project.id),
        getThemes(),
        getNoteTemplates(),
        getExamples(project.id),
        getExamplesCount(project.id)
      ])
      
      setAllStakeholders(stakeholdersData)
      setUserRoles(userRolesData)
      setUserPermissions(userPermissionsData)
      setLawFirms(lawFirmsData)
      setUserStories(userStoriesData)
      setUserJourneys(userJourneysData)
      setThemes(themesData)
      setNoteTemplates(noteTemplatesData)
      setExamples(examplesData)
      setExamplesCount(examplesCountData)
      
      // Filter notes for this specific project
      const projectNotes = researchNotesData.filter(note => note.project_id === project.id)
      setNotes(projectNotes)
      
      // Load role assignments for each user story
      const roleMap: Record<string, string[]> = {}
      for (const story of userStoriesData) {
        const roleIds = await getUserStoryRoles(story.id)
        roleMap[story.id] = roleIds
      }
      setStoryRoles(roleMap)
      
      // Load stakeholder assignments for all user journeys
      const journeyStakeholderMap: Record<string, string[]> = {}
      for (const journey of userJourneysData) {
        const stakeholderIds = await getUserJourneyStakeholders(journey.id)
        journeyStakeholderMap[journey.id] = stakeholderIds
      }
      setUserJourneyStakeholders(journeyStakeholderMap)
      
      // Load stakeholder assignments for all notes
      const stakeholderMap: Record<string, string[]> = {}
      for (const note of projectNotes) {
        const stakeholderIds = await getResearchNoteStakeholders(note.id)
        stakeholderMap[note.id] = stakeholderIds
      }
      setNoteStakeholders(stakeholderMap)
    } catch (error) {
      if (error instanceof SupabaseAuthError) {
        console.warn('Authentication session expired during project data fetch')
        if (onSignOut) {
          onSignOut()
        }
      } else {
        console.error('Error fetching project data:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadProjectStakeholders = async () => {
    try {
      const stakeholderIds = await getProjectStakeholders(project.id)
      setAssignedStakeholders(stakeholderIds)
    } catch (error) {
      console.error('Error loading project stakeholders:', error)
    }
  }

  const loadAllNoteStakeholders = async () => {
    try {
      const stakeholderMap: Record<string, string[]> = {}
      for (const note of notes) {
        const stakeholderIds = await getResearchNoteStakeholders(note.id)
        stakeholderMap[note.id] = stakeholderIds
      }
      setNoteStakeholders(stakeholderMap)
    } catch (error) {
      console.error('Error loading note stakeholders:', error)
    }
  }

  const loadProjectTasks = async () => {
    try {
      const tasks = await getTasks(project.id)
      setProjectTasks(tasks)
    } catch (error) {
      console.error('Error loading project tasks:', error)
    }
  }

  const loadProjectProgressStatus = async () => {
    try {
      const progressData = await getAllProjectProgressStatus()
      setAllProjectProgressStatus(progressData)
    } catch (error) {
      console.error('Error loading project progress status:', error)
    }
  }

  const loadUserStoryComments = async (userStoryId: string) => {
    try {
      const comments = await getUserStoryComments(userStoryId)
      setUserStoryComments(comments)
    } catch (error) {
      console.error('Error loading user story comments:', error)
    }
  }

  const loadProblemOverviewData = async () => {
    try {
      const data = await getProblemOverview(project.id)
      if (data) {
        setProblemOverview(data)
      }
    } catch (error) {
      console.error('Error loading problem overview:', error)
    }
  }

  const handleProblemOverviewChange = (updates: Partial<ProblemOverview>) => {
    setProblemOverview(prev => ({ ...prev, ...updates }))
  }

  const handleSaveProblemOverview = async (updates?: Partial<ProblemOverview>) => {
    try {
      const dataToSave = { ...problemOverview, ...updates }
      const saved = await saveProblemOverview(dataToSave)
      
      if (saved) {
        setProblemOverview(saved)
      }
    } catch (error) {
      console.error('Error saving problem overview:', error)
    }
  }

  const handleAssignStakeholder = async (stakeholderId: string) => {
    try {
      const success = await assignStakeholderToProject(project.id, stakeholderId)
      if (success) {
        setAssignedStakeholders([...assignedStakeholders, stakeholderId])
      }
    } catch (error) {
      console.error('Error assigning stakeholder:', error)
    }
  }

  const handleRemoveStakeholder = async (stakeholderId: string) => {
    try {
      const success = await removeStakeholderFromProject(project.id, stakeholderId)
      if (success) {
        setAssignedStakeholders(assignedStakeholders.filter(id => id !== stakeholderId))
      }
    } catch (error) {
      console.error('Error removing stakeholder:', error)
    }
  }

  const handleRemoveStakeholderFromNoteAndConditionallyProject = async (stakeholderId: string, noteId: string) => {
    try {
      // First, remove the stakeholder from the note
      const noteToUpdate = notes.find(note => note.id === noteId)
      if (!noteToUpdate) return

      const currentStakeholderIds = noteStakeholders[noteId] || []
      const updatedStakeholderIds = currentStakeholderIds.filter(id => id !== stakeholderId)
      
      // Update the note with new stakeholder associations
      const updatedNote = await updateResearchNote(
        noteId,
        {
          name: noteToUpdate.name,
          summary: noteToUpdate.summary || '',
          native_notes: noteToUpdate.native_notes || '',
          note_date: noteToUpdate.note_date,
          decision_text: noteToUpdate.decision_text || []
        },
        updatedStakeholderIds
      )
      
      if (updatedNote) {
        // Update local state
        setNotes(notes.map(note => note.id === noteId ? updatedNote : note))
        setNoteStakeholders(prev => ({
          ...prev,
          [noteId]: updatedStakeholderIds
        }))
        
        // Check if stakeholder is still used elsewhere in the project
        let isStakeholderStillUsed = false
        
        // Check other notes (excluding the current one)
        for (const [otherNoteId, stakeholderIds] of Object.entries(noteStakeholders)) {
          if (otherNoteId !== noteId && stakeholderIds.includes(stakeholderId)) {
            isStakeholderStillUsed = true
            break
          }
        }
        
        // Check user journeys if not found in notes
        if (!isStakeholderStillUsed) {
          for (const [journeyId, stakeholderIds] of Object.entries(userJourneyStakeholders)) {
            if (stakeholderIds.includes(stakeholderId)) {
              isStakeholderStillUsed = true
              break
            }
          }
        }
        
        // If stakeholder is not used anywhere else, remove from project
        if (!isStakeholderStillUsed && assignedStakeholders.includes(stakeholderId)) {
          const success = await removeStakeholderFromProject(project.id, stakeholderId)
          if (success) {
            setAssignedStakeholders(assignedStakeholders.filter(id => id !== stakeholderId))
          }
        }
      }
    } catch (error) {
      console.error('Error removing stakeholder from note and conditionally from project:', error)
    }
  }

  const handleCreateNote = React.useCallback(async (noteData: {
    name: string
    summary: string
    nativeNotes: string
    note_date: string
    stakeholderIds: string[]
    decision_text: string[]
    links: { name: string; url: string }[]
    tasks: Array<{
      name: string
      description: string
      status: 'not_complete' | 'complete' | 'no_longer_required'
      assignedToUserId?: string
    }>
    themeIds: string[]
    summaryBlocks?: BlockNoteBlock[]
  }) => {
    try {
      console.log('🔗 ProjectDataFetcher: Creating note with links:', noteData.links)
      const note = await createResearchNote(
        noteData.name, 
        project.id, 
        noteData.summary,
        noteData.nativeNotes,
        Array.isArray(noteData.stakeholderIds) ? noteData.stakeholderIds : [],
        noteData.decision_text,
        noteData.note_date,
        noteData.links,
        noteData.themeIds,
        noteData.summaryBlocks
      )
      if (note) {
        // Assign stakeholders to project after note creation
        for (const stakeholderId of noteData.stakeholderIds) {
          if (!assignedStakeholders.includes(stakeholderId)) {
            try {
              await assignStakeholderToProject(project.id, stakeholderId)
              setAssignedStakeholders(prev => [...prev, stakeholderId])
            } catch (error) {
              console.error('Error assigning stakeholder to project:', error)
            }
          }
        }
        
        setNotes([note, ...notes])
        // Update stakeholder mapping for the new note
        setNoteStakeholders(prev => ({
          ...prev,
          [note.id]: Array.isArray(noteData.stakeholderIds) ? noteData.stakeholderIds : []
        }))
        
        // Create associated tasks
        if (noteData.tasks && noteData.tasks.length > 0) {
          try {
            console.log('📝 ProjectDataFetcher: Creating tasks for note:', note.id, noteData.tasks)
            const { createTask } = await import('../../lib/database')
            await Promise.all(
              noteData.tasks.map(task => 
                createTask(
                  project.id, 
                  task.name, 
                  task.description, 
                  task.status,
                  task.assignedToUserId, // Pass assigned user ID if available
                  note.id // Link task to the research note
                )
              )
            )
            console.log('✅ ProjectDataFetcher: Successfully created all tasks for note:', note.id)
          } catch (taskError) {
            console.error('❌ ProjectDataFetcher: Error creating tasks:', taskError)
            // Note was created successfully, but tasks failed - could show a warning
          }
        } else {
          console.log('📝 ProjectDataFetcher: No tasks to create for note:', note.id)
        }
      }
    } catch (error) {
      console.error('Error creating note:', error)
    }
  }, [notes, project.id, assignedStakeholders])

  const handleThemeCreate = (newTheme: Theme) => {
    setThemes([newTheme, ...themes])
  }

  const handleUpdateNote = React.useCallback((updatedNote: ResearchNote, updatedStakeholderIds?: string[]) => {
    console.log('�� ProjectDataFetcher: handleUpdateNote called with:', updatedNote)
    console.log('�� ProjectDataFetcher: Current selectedNote:', selectedNote)
    console.log(' ProjectDataFetcher: Updated note note_date:', updatedNote.note_date)
    
    setNotes(notes.map(note => note.id === updatedNote.id ? updatedNote : note))
    
    // Update selectedNote if it matches the updated note OR if selectedNote is null but we're updating a note
    if (selectedNote && selectedNote.id === updatedNote.id) {
      console.log('✅ ProjectDataFetcher: Updating selectedNote with:', updatedNote)
      setSelectedNote(updatedNote)
    } else if (!selectedNote) {
      // If selectedNote is null, check if this is the note we should be viewing
      // This handles the case where the note detail view is open but selectedNote wasn't properly set
      console.log('✅ ProjectDataFetcher: selectedNote was null, setting it to updated note:', updatedNote)
      setSelectedNote(updatedNote)
    } else {
      console.log('⚠️ ProjectDataFetcher: selectedNote not updated - IDs don\'t match')
    }
    
    // Update noteStakeholders if stakeholder IDs are provided
    if (updatedStakeholderIds !== undefined) {
      setNoteStakeholders(prev => ({
        ...prev,
        [updatedNote.id]: updatedStakeholderIds
      }))
      
      // Re-fetch stakeholder assignments from database to ensure accuracy
      const refreshNoteStakeholders = async () => {
        try {
          const latestStakeholderIds = await getResearchNoteStakeholders(updatedNote.id)
          setNoteStakeholders(prev => ({
            ...prev,
            [updatedNote.id]: latestStakeholderIds
          }))
        } catch (error) {
          console.error('Error re-fetching note stakeholders:', error)
          // Keep the passed updatedStakeholderIds as fallback
        }
      }
      
      refreshNoteStakeholders()
    }
  }, [notes, selectedNote, setNotes, setSelectedNote, setNoteStakeholders, getResearchNoteStakeholders])

  const handleDeleteNote = async (noteId: string) => {
    if (window.confirm('Are you sure you want to delete this research note?')) {
      try {
        const success = await deleteResearchNote(noteId)
        if (success) {
          setNotes(notes.filter(note => note.id !== noteId))
        }
      } catch (error) {
        console.error('Error deleting note:', error)
      }
    }
  }

  const handleCreateUserStory = async (storyData: {
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
  }) => {
    try {
      const newStory = await createUserStory(
        project.id,
        storyData.name,
        storyData.description,
        storyData.reason,
        storyData.estimatedComplexity,
        storyData.roleIds || [],
        storyData.user_permission_id,
        storyData.assignedToUserId,
        storyData.priorityRating as 'must' | 'should' | 'could' | 'would',
        storyData.status as 'Not planned' | 'Not started' | 'Design in progress' | 'Design complete' | 'Build in progress' | 'Released',
        storyData.themeIds || []
      )
      
      if (newStory) {
        setUserStories([...userStories, newStory])
        // Update story roles if roleIds were provided
        if (storyData.roleIds && storyData.roleIds.length > 0) {
          setStoryRoles(prev => ({
            ...prev,
            [newStory.id]: storyData.roleIds || []
          }))
        }
      }
    } catch (error) {
      console.error('Error creating user story:', error)
    }
  }

  const handleUpdateUserStory = async (storyId: string, updates: Partial<UserStory>, updatedRoleIds: string[]) => {
    console.log('🔵 ProjectDataFetcher.handleUpdateUserStory: Called with story ID:', storyId, 'and updates:', updates)
    try {
      // Call the database update function
      const updatedUserStory = await updateUserStory(storyId, updates, updatedRoleIds)
      console.log('🔵 ProjectDataFetcher.handleUpdateUserStory: Database update result:', updatedUserStory)
      
      if (updatedUserStory) {
        console.log('🔵 ProjectDataFetcher.handleUpdateUserStory: Updating userStories state')
        setUserStories(userStories.map(s => s.id === updatedUserStory.id ? updatedUserStory : s))
        console.log('✅ ProjectDataFetcher.handleUpdateUserStory: State updated successfully')
      } else {
        console.log('🔵 ProjectDataFetcher.handleUpdateUserStory: Story not found in database, removing from local state')
        setUserStories(userStories.filter(s => s.id !== storyId))
        alert('This user story may have been deleted by another user. Returning to the project view.')
        // Optionally navigate back to avoid staying on a non-existent story
        console.log('✅ ProjectDataFetcher.handleUpdateUserStory: Removed non-existent story from state')
      }
    } catch (error) {
      console.error('❌ ProjectDataFetcher.handleUpdateUserStory: Error in handleUpdateUserStory:', error)
      console.error('Error updating user story:', error)
    }
  }

  const handleDeleteUserStory = async (storyId: string) => {
    if (window.confirm('Are you sure you want to delete this user story?')) {
      try {
        const success = await deleteUserStory(storyId)
        if (success) {
          setUserStories(userStories.filter(story => story.id !== storyId))
          // Remove from story roles as well
          setStoryRoles(prev => {
            const updated = { ...prev }
            delete updated[storyId]
            return updated
          })
        }
      } catch (error) {
        console.error('Error deleting user story:', error)
      }
    }
  }

  // New handler for when stories are reordered
  const handleStoriesReordered = async () => {
    console.log('🔵 ProjectDataFetcher.handleStoriesReordered: Starting stories refresh')
    try {
      // Re-fetch user stories to ensure the UI reflects the latest order from the database
      const updatedUserStories = await getUserStories(project.id)
      console.log('🔵 ProjectDataFetcher.handleStoriesReordered: Fetched updated stories:', updatedUserStories.length, 'stories')
      setUserStories(updatedUserStories)
      
      // Also reload role assignments for consistency
      const roleMap: Record<string, string[]> = {}
      for (const story of updatedUserStories) {
        const roleIds = await getUserStoryRoles(story.id)
        roleMap[story.id] = roleIds
      }
      setStoryRoles(roleMap)
      console.log('✅ ProjectDataFetcher.handleStoriesReordered: Stories and roles refreshed successfully')
    } catch (error) {
      console.error('❌ ProjectDataFetcher.handleStoriesReordered: Error refreshing user stories after reorder:', error)
      console.error('Error refreshing user stories after reorder:', error)
    }
  }

  const handleCreateTaskForUserStory = React.useCallback(async (name: string, description: string, status: 'not_complete' | 'complete' | 'no_longer_required', assignedToUserId?: string, userStoryId?: string) => {
    try {
      const newTask = await createTask(project.id, name, description, status, assignedToUserId, undefined, userStoryId)
      if (newTask) {
        setProjectTasks([...projectTasks, newTask])
      }
    } catch (error) {
      console.error('Error creating task for user story:', error)
    }
  }, [project.id, projectTasks])

  const handleUpdateTaskForUserStory = React.useCallback(async (taskId: string, updates: { name?: string; description?: string; status?: string; user_story_id?: string }) => {
    try {
      const { updateTask } = await import('../../lib/database')
      const updatedTask = await updateTask(taskId, updates)
      if (updatedTask) {
        setProjectTasks(projectTasks.map(task => task.id === taskId ? updatedTask : task))
      }
    } catch (error) {
      console.error('Error updating task for user story:', error)
    }
  }, [projectTasks])

  const handleDeleteTaskForUserStory = React.useCallback(async (taskId: string) => {
    try {
      const { deleteTask } = await import('../../lib/database')
      const success = await deleteTask(taskId)
      if (success) {
        setProjectTasks(projectTasks.filter(task => task.id !== taskId))
      }
    } catch (error) {
      console.error('Error deleting task for user story:', error)
    }
  }, [projectTasks])

  // Memoize the assigned stakeholders list to prevent unnecessary re-renders
  const memoizedAssignedStakeholders = React.useMemo(() => {
    return allStakeholders.filter(stakeholder => 
      assignedStakeholders.includes(stakeholder.id)
    )
  }, [allStakeholders, assignedStakeholders])

  const getUnassignedStakeholders = () => {
    return allStakeholders.filter(stakeholder => 
      !assignedStakeholders.includes(stakeholder.id)
    )
  }

  // User story comment handlers
  const handleAddUserStoryComment = async (userStoryId: string, commentText: string) => {
    if (!user) return
    
    const comment = await createUserStoryComment(userStoryId, commentText, user.id)
    if (comment) {
      setUserStoryComments([comment, ...userStoryComments])
    }
  }

  const handleEditUserStoryComment = async (commentId: string, commentText: string) => {
    const updatedComment = await updateUserStoryComment(commentId, commentText)
    if (updatedComment) {
      setUserStoryComments(userStoryComments.map(comment => 
        comment.id === commentId ? updatedComment : comment
      ))
    }
  }

  const handleDeleteUserStoryComment = async (commentId: string) => {
    const success = await deleteUserStoryComment(commentId)
    if (success) {
      setUserStoryComments(userStoryComments.filter(comment => comment.id !== commentId))
    }
  }

  return (
            <ProjectViewRenderer
          project={project}
          initialSelectedNote={initialSelectedNote}
          initialView={initialView}
          initialSelectedUserStory={initialSelectedUserStory}
          initialSelectedUserJourney={initialSelectedUserJourney}
          initialUserStoryRoleIds={initialUserStoryRoleIds}
          initialSelectedDesign={initialSelectedDesign}
          workspaceUsers={workspaceUsers}
          user={user}
          userStoryComments={userStoryComments}
          onBack={onBack}
          onNavigateToWorkspace={onNavigateToWorkspace}
          onSignOut={onSignOut}
          loading={loading}
          allStakeholders={allStakeholders}
          userRoles={userRoles}
          userPermissions={userPermissions}
          lawFirms={lawFirms}
          assignedStakeholders={assignedStakeholders}
          memoizedAssignedStakeholders={memoizedAssignedStakeholders}
          getUnassignedStakeholders={getUnassignedStakeholders}
          notes={notes}
          userStories={userStories}
          storyRoles={storyRoles}
          userJourneys={userJourneys}
          userJourneyStakeholders={userJourneyStakeholders}
          themes={themes}
          noteTemplates={noteTemplates}
          problemOverview={problemOverview}
          noteStakeholders={noteStakeholders}
          projectTasks={projectTasks}
          allProjectProgressStatus={allProjectProgressStatus}
          examplesCount={examplesCount}
          onProblemOverviewChange={handleProblemOverviewChange}
          onSaveProblemOverview={handleSaveProblemOverview}
          onAssignStakeholder={handleAssignStakeholder}
          onRemoveStakeholder={handleRemoveStakeholder}
          onRemoveStakeholderFromNoteAndConditionallyProject={handleRemoveStakeholderFromNoteAndConditionallyProject}
          onCreateNote={handleCreateNote}
          onThemeCreate={handleThemeCreate}
          onUpdateNote={handleUpdateNote}
          onDeleteNote={handleDeleteNote}
          onAddUserStoryComment={handleAddUserStoryComment}
          onEditUserStoryComment={handleEditUserStoryComment}
          onDeleteUserStoryComment={handleDeleteUserStoryComment}
          onCreateUserStory={handleCreateUserStory}
          onUpdateUserStory={handleUpdateUserStory}
          onDeleteUserStory={handleDeleteUserStory}
          onStoriesReordered={handleStoriesReordered}
          onCreateTask={onCreateTask || handleCreateTaskForUserStory}
          onUpdateTask={onUpdateTask || handleUpdateTaskForUserStory}
          onDeleteTask={onDeleteTask || handleDeleteTaskForUserStory}
        />
  )
}