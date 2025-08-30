import { supabase, isSupabaseConfigured } from '../../supabase'
import type { ResearchNote, NoteLink } from '../../supabase'

export const getResearchNotes = async (): Promise<ResearchNote[]> => {
  console.log('🔍 Debug: getResearchNotes called, isSupabaseConfigured:', isSupabaseConfigured, 'supabase:', !!supabase)
  
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    console.log('🔍 Debug: Using local storage fallback for research notes')
    try {
      const stored = localStorage.getItem('kyp_research_notes')
      const notes = stored ? JSON.parse(stored) : []
      console.log('🔍 Debug: Local storage research notes:', notes)
      return notes
    } catch {
      console.log('🔍 Debug: Local storage fallback failed')
      return []
    }
  }

  try {
    console.log('🔍 Debug: Fetching research notes from Supabase')
    const { data, error } = await supabase
      .from('research_notes')
      .select('*')
      .order('note_date', { ascending: false, nullsLast: true })
      .order('created_at', { ascending: false })

    if (error) throw error
    console.log('🔍 Debug: Supabase research notes data:', data)
    return data || []
  } catch (error) {
    console.error('Error fetching research notes:', error)
    return []
  }
}



export const getResearchNoteByShortId = async (shortId: number): Promise<ResearchNote | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_research_notes')
      const notes = stored ? JSON.parse(stored) : []
      return notes.find((note: ResearchNote) => note.short_id === shortId) || null
    } catch {
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('research_notes')
      .select('*')
      .eq('short_id', shortId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching research note by short ID:', error)
    return null
  }
}

export const createResearchNote = async (
  name: string, 
  projectId: string, 
  summary?: string,
  nativeNotes?: string,
  stakeholderIds: string[] = [],
  decisionTexts: string[] = [],
  noteDate?: string,
  links: Array<{ name: string; url: string }> = [],
  themeIds: string[] = []
): Promise<ResearchNote | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const notes = JSON.parse(localStorage.getItem('kyp_research_notes') || '[]')
      const nextShortId = Math.max(0, ...notes.map((n: ResearchNote) => n.short_id || 0)) + 1
      const newNote: ResearchNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        project_id: projectId,
        name,
        summary: summary || null,
        native_notes: nativeNotes || null,
        note_date: noteDate || null,
        decision_text: decisionTexts.length > 0 ? decisionTexts : null,
        short_id: nextShortId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      notes.unshift(newNote)
      localStorage.setItem('kyp_research_notes', JSON.stringify(notes))
      
      // Store stakeholder associations
      if (stakeholderIds.length > 0) {
        const noteStakeholders = JSON.parse(localStorage.getItem('kyp_research_note_stakeholders') || '[]')
        stakeholderIds.forEach(stakeholderId => {
          noteStakeholders.push({
            id: `ns-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            research_note_id: newNote.id,
            stakeholder_id: stakeholderId,
            created_at: new Date().toISOString()
          })
        })
        localStorage.setItem('kyp_research_note_stakeholders', JSON.stringify(noteStakeholders))
      }
      
      // Store links
      if (links.length > 0) {
        const noteLinks = JSON.parse(localStorage.getItem('kyp_note_links') || '[]')
        links.forEach(link => {
          noteLinks.push({
            id: `nl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            research_note_id: newNote.id,
            name: link.name,
            url: link.url,
            created_at: new Date().toISOString()
          })
        })
        localStorage.setItem('kyp_note_links', JSON.stringify(noteLinks))
      }
      
      // Store theme associations
      if (themeIds.length > 0) {
        const themeResearchNotes = JSON.parse(localStorage.getItem('kyp_theme_research_notes') || '[]')
        themeIds.forEach(themeId => {
          themeResearchNotes.push({
            id: `trn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            theme_id: themeId,
            research_note_id: newNote.id,
            created_at: new Date().toISOString()
          })
        })
        localStorage.setItem('kyp_theme_research_notes', JSON.stringify(themeResearchNotes))
      }
      
      return newNote
    } catch (error) {
      console.error('Error creating research note locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('research_notes')
      .insert([{
        project_id: projectId,
        name,
        summary,
        native_notes: nativeNotes,
        note_date: noteDate,
        decision_text: decisionTexts.length > 0 ? decisionTexts : null
      }])
      .select()
      .maybeSingle()

    if (error) throw error

    // Create stakeholder associations
    if (stakeholderIds.length > 0) {
      const stakeholderInserts = stakeholderIds.map(stakeholderId => ({
        research_note_id: data.id,
        stakeholder_id: stakeholderId
      }))

      await supabase
        .from('research_note_stakeholders')
        .insert(stakeholderInserts)
    }

    // Create links
    if (links.length > 0) {
      const linkInserts = links.map(link => ({
        research_note_id: data.id,
        name: link.name,
        url: link.url
      }))

      const { error: linkError } = await supabase
        .from('note_links')
        .insert(linkInserts)

      if (linkError) {
        console.error('Error creating note links:', linkError)
        throw linkError
      }
    }

    // Create theme associations
    if (themeIds.length > 0) {
      const themeInserts = themeIds.map(themeId => ({
        theme_id: themeId,
        research_note_id: data.id
      }))

      await supabase
        .from('theme_research_notes')
        .insert(themeInserts)
    }
    return data
  } catch (error) {
    console.error('Error creating research note:', error)
    return null
  }
}

export const getResearchNoteById = async (noteId: string): Promise<ResearchNote | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_research_notes')
      const notes = stored ? JSON.parse(stored) : []
      return notes.find((note: ResearchNote) => note.id === noteId) || null
    } catch {
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('research_notes')
      .select('*')
      .eq('id', noteId)
      .limit(1)

    if (error) throw error
    return data && data.length > 0 ? data[0] : null
  } catch (error) {
    console.error('Error fetching research note by ID:', error)
    return null
  }
}

export const updateResearchNote = async (
  noteId: string, 
  updates: { 
    name?: string; 
    summary?: string; 
    native_notes?: string; 
    note_date?: string; 
    decision_text?: string[]
  },
  stakeholderIds?: string[],
  themeIds?: string[]
): Promise<ResearchNote | null> => {
  if (!isSupabaseConfigured || !supabase) {
    console.log('🔵 updateResearchNote (Local): Called with noteId:', noteId, 'updates:', updates, 'stakeholderIds:', stakeholderIds)
    // Local storage fallback
    try {
      const notes = JSON.parse(localStorage.getItem('kyp_research_notes') || '[]')
      const updatedNotes = notes.map((note: ResearchNote) => 
        note.id === noteId 
          ? { ...note, ...updates, updated_at: new Date().toISOString() }
          : note
      )
      localStorage.setItem('kyp_research_notes', JSON.stringify(updatedNotes))
      
      // Update stakeholder associations if provided
      if (stakeholderIds !== undefined) {
        console.log('🔵 updateResearchNote (Local): Updating stakeholder associations')
        const noteStakeholders = JSON.parse(localStorage.getItem('kyp_research_note_stakeholders') || '[]')
        const filteredStakeholders = noteStakeholders.filter((ns: any) => ns.research_note_id !== noteId)
        
        console.log('🔵 updateResearchNote (Local): Filtered existing stakeholders, remaining count:', filteredStakeholders.length)
        
        stakeholderIds.forEach(stakeholderId => {
          filteredStakeholders.push({
            id: `ns-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            research_note_id: noteId,
            stakeholder_id: stakeholderId,
            created_at: new Date().toISOString()
          })
        })
        
        console.log('🔵 updateResearchNote (Local): Added new stakeholder associations, total count:', filteredStakeholders.length)
        localStorage.setItem('kyp_research_note_stakeholders', JSON.stringify(filteredStakeholders))
      }
      
      // Update theme associations if provided
      if (themeIds !== undefined) {
        console.log('🔵 updateResearchNote (Local): Updating theme associations')
        const themeResearchNotes = JSON.parse(localStorage.getItem('kyp_theme_research_notes') || '[]')
        const filteredThemes = themeResearchNotes.filter((trn: any) => trn.research_note_id !== noteId)
        
        console.log('🔵 updateResearchNote (Local): Filtered existing themes, remaining count:', filteredThemes.length)
        
        themeIds.forEach(themeId => {
          filteredThemes.push({
            id: `trn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            theme_id: themeId,
            research_note_id: noteId,
            created_at: new Date().toISOString()
          })
        })
        
        console.log('🔵 updateResearchNote (Local): Added new theme associations, total count:', filteredThemes.length)
        localStorage.setItem('kyp_theme_research_notes', JSON.stringify(filteredThemes))
      }
      
      const updatedNote = updatedNotes.find((n: ResearchNote) => n.id === noteId)
      console.log('✅ updateResearchNote (Local): Returning updated note:', updatedNote)
      return updatedNote || null
    } catch (error) {
      console.error('❌ updateResearchNote (Local): Error updating research note locally:', error)
      console.error('Error updating research note locally:', error)
      return null
    }
  }

  console.log('🔵 updateResearchNote (Supabase): Called with noteId:', noteId, 'updates:', updates, 'stakeholderIds:', stakeholderIds)
  
  try {
    let data;
    
    // Check if there are actual field updates to make
    const hasFieldUpdates = Object.keys(updates).length > 0;
    
    if (hasFieldUpdates) {
      console.log('🔵 updateResearchNote (Supabase): Performing update operation with field changes')
      const { data: updateData, error } = await supabase
        .from('research_notes')
        .update(updates)
        .eq('id', noteId)
        .select()
        .order('id', { ascending: true })
        .limit(1)

      if (error) throw error
      if (!updateData || updateData.length === 0) return null
      data = updateData[0]
    } else {
      console.log('🔵 updateResearchNote (Supabase): No field updates, performing select operation to fetch existing note')
      const { data: selectData, error } = await supabase
        .from('research_notes')
        .select('*')
        .eq('id', noteId)
        .order('id', { ascending: true })
        .limit(1)

      if (error) throw error
      if (!selectData || selectData.length === 0) return null
      data = selectData[0]
    }

    console.log('🔵 updateResearchNote (Supabase): Note updated successfully:', data)
    // Update stakeholder associations if provided
    if (stakeholderIds !== undefined) {
      console.log('🔵 updateResearchNote (Supabase): Updating stakeholder associations')
      
      try {
        // Delete existing associations
        console.log('🔵 updateResearchNote (Supabase): Deleting existing stakeholder associations for noteId:', noteId)
        await supabase
          .from('research_note_stakeholders')
          .delete()
          .eq('research_note_id', noteId)

        console.log('🔵 updateResearchNote (Supabase): Existing associations deleted')
        // Create new associations
        if (stakeholderIds.length > 0) {
          console.log('🔵 updateResearchNote (Supabase): Creating new associations for stakeholderIds:', stakeholderIds)
          const stakeholderInserts = stakeholderIds.map(stakeholderId => ({
            research_note_id: noteId,
            stakeholder_id: stakeholderId
          }))

          console.log('🔵 updateResearchNote (Supabase): Inserting stakeholder associations:', stakeholderInserts)
          await supabase
            .from('research_note_stakeholders')
            .insert(stakeholderInserts)
          
          console.log('✅ updateResearchNote (Supabase): New associations created successfully')
        } else {
          console.log('🔵 updateResearchNote (Supabase): No stakeholder IDs to associate (empty array)')
        }
      } catch (stakeholderError) {
        console.error('⚠️ updateResearchNote (Supabase): Error updating stakeholder associations (continuing anyway):', stakeholderError)
      }
    }

    // Update theme associations if provided
    if (themeIds !== undefined) {
      console.log('🔵 updateResearchNote (Supabase): Updating theme associations')
      
      try {
        // Delete existing theme associations
        console.log('🔵 updateResearchNote (Supabase): Deleting existing theme associations for noteId:', noteId)
        await supabase
          .from('theme_research_notes')
          .delete()
          .eq('research_note_id', noteId)

        console.log('🔵 updateResearchNote (Supabase): Existing theme associations deleted')
        // Create new theme associations
        if (themeIds.length > 0) {
          console.log('🔵 updateResearchNote (Supabase): Creating new theme associations for themeIds:', themeIds)
          const themeInserts = themeIds.map(themeId => ({
            theme_id: themeId,
            research_note_id: noteId
          }))

          console.log('🔵 updateResearchNote (Supabase): Inserting theme associations:', themeInserts)
          await supabase
            .from('theme_research_notes')
            .insert(themeInserts)
          
          console.log('✅ updateResearchNote (Supabase): New theme associations created successfully')
        } else {
          console.log('🔵 updateResearchNote (Supabase): No theme IDs to associate (empty array)')
        }
      } catch (themeError) {
        console.error('⚠️ updateResearchNote (Supabase): Error updating theme associations (continuing anyway):', themeError)
      }
    }

    console.log('✅ updateResearchNote (Supabase): Returning updated note:', data)
    return data
  } catch (error) {
    console.error('❌ updateResearchNote (Supabase): Error updating research note:', error)
    throw error
  }
}

export const deleteResearchNote = async (noteId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const notes = JSON.parse(localStorage.getItem('kyp_research_notes') || '[]')
      const filteredNotes = notes.filter((note: ResearchNote) => note.id !== noteId)
      localStorage.setItem('kyp_research_notes', JSON.stringify(filteredNotes))
      
      // Also remove stakeholder associations
      const noteStakeholders = JSON.parse(localStorage.getItem('kyp_research_note_stakeholders') || '[]')
      const filteredStakeholders = noteStakeholders.filter((ns: any) => ns.research_note_id !== noteId)
      localStorage.setItem('kyp_research_note_stakeholders', JSON.stringify(filteredStakeholders))
      
      // Also remove links
      const noteLinks = JSON.parse(localStorage.getItem('kyp_note_links') || '[]')
      const filteredLinks = noteLinks.filter((nl: any) => nl.research_note_id !== noteId)
      localStorage.setItem('kyp_note_links', JSON.stringify(filteredLinks))
      
      return true
    } catch (error) {
      console.error('Error deleting research note locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('research_notes')
      .delete()
      .eq('id', noteId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting research note:', error)
    return false
  }
}

export const getResearchNoteStakeholders = async (noteId: string): Promise<string[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_research_note_stakeholders')
      const noteStakeholders = stored ? JSON.parse(stored) : []
      return noteStakeholders
        .filter((ns: any) => ns.research_note_id === noteId)
        .map((ns: any) => ns.stakeholder_id)
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('research_note_stakeholders')
      .select('stakeholder_id')
      .eq('research_note_id', noteId)

    if (error) throw error
    return data?.map(item => item.stakeholder_id) || []
  } catch (error) {
    console.error('Error fetching research note stakeholders:', error)
    return []
  }
}

export const getResearchNotesForStakeholder = async (stakeholderId: string): Promise<ResearchNote[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const noteStakeholders = JSON.parse(localStorage.getItem('kyp_research_note_stakeholders') || '[]')
      const notes = JSON.parse(localStorage.getItem('kyp_research_notes') || '[]')
      
      const noteIds = noteStakeholders
        .filter((ns: any) => ns.stakeholder_id === stakeholderId)
        .map((ns: any) => ns.research_note_id)
      
      return notes.filter((note: ResearchNote) => noteIds.includes(note.id))
    } catch (error) {
      console.error('Error getting research notes for stakeholder locally:', error)
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('research_note_stakeholders')
      .select(`
        research_notes (
          id,
          project_id,
          name,
          summary,
          native_notes,
          note_date,
          is_decision,
          created_at,
          updated_at
        )
      `)
      .eq('stakeholder_id', stakeholderId)

    if (error) throw error
    
    return data?.map(item => (item as any).research_notes).filter(Boolean) || []
  } catch (error) {
    console.error('Error getting research notes for stakeholder:', error)
    return []
  }
}

export const getNoteLinks = async (noteId: string): Promise<NoteLink[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_note_links')
      const noteLinks = stored ? JSON.parse(stored) : []
      return noteLinks.filter((nl: any) => nl.research_note_id === noteId)
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('note_links')
      .select('*')
      .eq('research_note_id', noteId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching note links:', error)
    return []
  }
}

export const getAllResearchNoteStakeholders = async (): Promise<Record<string, string[]>> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_research_note_stakeholders')
      const noteStakeholders = stored ? JSON.parse(stored) : []
      
      // Group by note ID
      const noteStakeholderMap: Record<string, string[]> = {}
      noteStakeholders.forEach((ns: any) => {
        if (!noteStakeholderMap[ns.research_note_id]) {
          noteStakeholderMap[ns.research_note_id] = []
        }
        noteStakeholderMap[ns.research_note_id].push(ns.stakeholder_id)
      })
      
      return noteStakeholderMap
    } catch {
      return {}
    }
  }

  try {
    const { data, error } = await supabase
      .from('research_note_stakeholders')
      .select('research_note_id, stakeholder_id')

    if (error) throw error
    
    // Group by note ID
    const noteStakeholderMap: Record<string, string[]> = {}
    data?.forEach(item => {
      if (!noteStakeholderMap[item.research_note_id]) {
        noteStakeholderMap[item.research_note_id] = []
      }
      noteStakeholderMap[item.research_note_id].push(item.stakeholder_id)
    })
    
    return noteStakeholderMap
  } catch (error) {
    console.error('Error fetching all research note stakeholders:', error)
    return {}
  }
}

export const saveNoteLinks = async (noteId: string, links: Array<{ id?: string; name: string; url: string }>): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const noteLinks = JSON.parse(localStorage.getItem('kyp_note_links') || '[]')
      const filteredLinks = noteLinks.filter((nl: any) => nl.research_note_id !== noteId)
      
      links.forEach(link => {
        filteredLinks.push({
          id: link.id || `nl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          research_note_id: noteId,
          name: link.name,
          url: link.url,
          created_at: new Date().toISOString()
        })
      })
      
      localStorage.setItem('kyp_note_links', JSON.stringify(filteredLinks))
    } catch (error) {
      console.error('Error saving note links locally:', error)
      throw error
    }
    return
  }

  try {
    // Delete existing links
    await supabase
      .from('note_links')
      .delete()
      .eq('research_note_id', noteId)

    // Insert new links
    if (links.length > 0) {
      const linkInserts = links.map(link => ({
        research_note_id: noteId,
        name: link.name,
        url: link.url
      }))

      const { error } = await supabase
        .from('note_links')
        .insert(linkInserts)

      if (error) throw error
    }
  } catch (error) {
    console.error('Error saving note links:', error)
    throw error
  }
}

export const getResearchNotesByThemeId = async (themeId: string): Promise<ResearchNote[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const themeResearchNotes = JSON.parse(localStorage.getItem('kyp_theme_research_notes') || '[]')
      const researchNotes = JSON.parse(localStorage.getItem('kyp_research_notes') || '[]')
      
      const researchNoteIds = themeResearchNotes
        .filter((trn: any) => trn.theme_id === themeId)
        .map((trn: any) => trn.research_note_id)
      
      return researchNotes.filter((note: ResearchNote) => researchNoteIds.includes(note.id))
    } catch (error) {
      console.error('Error getting research notes by theme ID locally:', error)
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('theme_research_notes')
      .select(`
        research_notes (
          id,
          project_id,
          name,
          summary,
          native_notes,
          note_date,
          decision_text,
          short_id,
          created_at,
          updated_at
        )
      `)
      .eq('theme_id', themeId)

    if (error) throw error
    
    return data?.map(item => (item as any).research_notes).filter(Boolean) || []
  } catch (error) {
    console.error('Error getting research notes by theme ID:', error)
    return []
  }
}