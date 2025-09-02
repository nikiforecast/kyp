import { supabase, isSupabaseConfigured } from '../../supabase'
import type { ResearchNote, UserStory, Design, Example } from '../../supabase'

export interface ProjectDecision {
  id: string
  content: string
  source_type: 'note' | 'user_story' | 'design' | 'example'
  source_id: string
  source_name: string
  source_short_id?: number
  created_at: string
  updated_at?: string
  user_id?: string
}

export const getProjectDecisions = async (projectId: string): Promise<ProjectDecision[]> => {
  
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const decisions: ProjectDecision[] = []
      
      // Get decisions from notes (research_notes.decision_text column)
      const notes = JSON.parse(localStorage.getItem('kyp_research_notes') || '[]') as ResearchNote[]
      const projectNotes = notes.filter(note => note.project_id === projectId)
      
      projectNotes.forEach(note => {
        if (note.decision_text && note.decision_text.length > 0) {
          note.decision_text.forEach((decisionText, index) => {
            if (decisionText && decisionText.trim()) {
              // Parse timestamp|text format if present
              const content = decisionText.includes('|') 
                ? decisionText.split('|').slice(1).join('|')
                : decisionText
              
              decisions.push({
                id: `note-${note.id}-${index}`,
                content: content,
                source_type: 'note',
                source_id: note.id,
                source_name: note.name,
                source_short_id: note.short_id,
                created_at: note.created_at,
                updated_at: note.updated_at
              })
            }
          })
        }
      })
      
      // Get decisions from user stories
      const userStories = JSON.parse(localStorage.getItem('kyp_user_stories') || '[]') as UserStory[]
      const projectUserStories = userStories.filter(story => story.project_id === projectId)
      
      projectUserStories.forEach(story => {
        if (story.decision_text && story.decision_text.length > 0) {
          story.decision_text.forEach((decisionText, index) => {
            if (decisionText && decisionText.trim()) {
              // Parse timestamp|text format if present
              const content = decisionText.includes('|') 
                ? decisionText.split('|').slice(1).join('|')
                : decisionText
              
              decisions.push({
                id: `user-story-${story.id}-${index}`,
                content: content,
                source_type: 'user_story',
                source_id: story.id,
                source_name: story.name,
                source_short_id: story.short_id,
                created_at: story.created_at,
                updated_at: story.updated_at
              })
            }
          })
        }
        
        if (story.decision_text2 && story.decision_text2.length > 0) {
          story.decision_text2.forEach((decisionText, index) => {
            if (decisionText && decisionText.trim()) {
              // Parse timestamp|text format if present
              const content = decisionText.includes('|') 
                ? decisionText.split('|').slice(1).join('|')
                : decisionText
              
              decisions.push({
                id: `user-story-2-${story.id}-${index}`,
                content: content,
                source_type: 'user_story',
                source_id: story.id,
                source_name: story.name,
                source_short_id: story.short_id,
                created_at: story.created_at,
                updated_at: story.updated_at
              })
            }
          })
        }
      })
      
      // Get decisions from design assets
      const designs = JSON.parse(localStorage.getItem('kyp_assets') || '[]') as Design[]
      const projectDesigns = designs.filter(design => design.project_id === projectId)
      
      projectDesigns.forEach(design => {
        if (design.decision_text && design.decision_text.length > 0) {
          design.decision_text.forEach((decisionText, index) => {
            if (decisionText && decisionText.trim()) {
              // Parse timestamp|text format if present
              const content = decisionText.includes('|') 
                ? decisionText.split('|').slice(1).join('|')
                : decisionText
              
              decisions.push({
                id: `design-${design.id}-${index}`,
                content: content,
                source_type: 'design',
                source_id: design.id,
                source_name: design.name,
                source_short_id: design.short_id,
                created_at: design.created_at,
                updated_at: design.updated_at
              })
            }
          })
        }
      })
      
      // Get decisions from examples (example_comments localStorage)
      const exampleComments = JSON.parse(localStorage.getItem('kyp_example_comments') || '[]')
      const examples = JSON.parse(localStorage.getItem('kyp_examples') || '[]') as Example[]
      const projectExamples = examples.filter(example => example.project_id === projectId)
      
      exampleComments.forEach((comment: any) => {
        if (comment.is_decision && comment.comment_text && comment.comment_text.trim()) {
          const example = projectExamples.find(ex => ex.id === comment.example_id)
          if (example) {
            decisions.push({
              id: `example-${comment.id}`,
              content: comment.comment_text,
              source_type: 'example',
              source_id: comment.example_id,
              source_name: `Example #${example.short_id}`,
              source_short_id: example.short_id,
              created_at: comment.created_at,
              updated_at: comment.updated_at,
              user_id: comment.user_id
            })
          }
        }
      })
      
      // Sort by created_at (newest first)
      return decisions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } catch (error) {
      console.error('Error fetching decisions locally:', error)
      return []
    }
  }

  try {
    const decisions: ProjectDecision[] = []
    
    // Get decisions from notes (research_notes.decision_text column)
    const { data: notes, error: noteError } = await supabase
      .from('research_notes')
      .select('*')
      .eq('project_id', projectId)
      .not('decision_text', 'is', null)
      .order('created_at', { ascending: false })

    if (noteError) throw noteError

    if (notes) {
      notes.forEach((note: ResearchNote) => {
        if (note.decision_text && note.decision_text.length > 0) {
          note.decision_text.forEach((decisionText, index) => {
            if (decisionText && decisionText.trim()) {
              // Parse timestamp|text format if present
              const content = decisionText.includes('|') 
                ? decisionText.split('|').slice(1).join('|')
                : decisionText
              
              decisions.push({
                id: `note-${note.id}-${index}`,
                content: content,
                source_type: 'note',
                source_id: note.id,
                source_name: note.name,
                source_short_id: note.short_id,
                created_at: note.created_at,
                updated_at: note.updated_at
              })
            }
          })
        }
      })
    }
    
    // Get decisions from user stories
    const { data: userStories, error: userStoryError } = await supabase
      .from('user_stories')
      .select('*')
      .eq('project_id', projectId)
      .not('decision_text', 'is', null)
      .order('created_at', { ascending: false })

    if (userStoryError) throw userStoryError

    if (userStories) {
      userStories.forEach((story: UserStory) => {
        if (story.decision_text && story.decision_text.length > 0) {
          story.decision_text.forEach((decisionText, index) => {
            if (decisionText && decisionText.trim()) {
              // Parse timestamp|text format if present
              const content = decisionText.includes('|') 
                ? decisionText.split('|').slice(1).join('|')
                : decisionText
              
              decisions.push({
                id: `user-story-${story.id}-${index}`,
                content: content,
                source_type: 'user_story',
                source_id: story.id,
                source_name: story.name,
                source_short_id: story.short_id,
                created_at: story.created_at,
                updated_at: story.updated_at
              })
            }
          })
        }
        
        if (story.decision_text2 && story.decision_text2.length > 0) {
          story.decision_text2.forEach((decisionText, index) => {
            if (decisionText && decisionText.trim()) {
              // Parse timestamp|text format if present
              const content = decisionText.includes('|') 
                ? decisionText.split('|').slice(1).join('|')
                : decisionText
              
              decisions.push({
                id: `user-story-2-${story.id}-${index}`,
                content: content,
                source_type: 'user_story',
                source_id: story.id,
                source_name: story.name,
                source_short_id: story.short_id,
                created_at: story.created_at,
                updated_at: story.updated_at
              })
            }
          })
        }
      })
    }
    
    // Get decisions from design assets (assets table)
    const { data: designs, error: designError } = await supabase
      .from('assets')
      .select('*')
      .eq('project_id', projectId)
      .not('decision_text', 'is', null)
      .order('created_at', { ascending: false })

    if (designError) throw designError

    if (designs) {
      designs.forEach((design: Design) => {
        if (design.decision_text && design.decision_text.length > 0) {
          design.decision_text.forEach((decisionText, index) => {
            if (decisionText && decisionText.trim()) {
              // Parse timestamp|text format if present
              const content = decisionText.includes('|') 
                ? decisionText.split('|').slice(1).join('|')
                : decisionText
              
              decisions.push({
                id: `design-${design.id}-${index}`,
                content: content,
                source_type: 'design',
                source_id: design.id,
                source_name: design.name,
                source_short_id: design.short_id,
                created_at: design.created_at,
                updated_at: design.updated_at
              })
            }
          })
        }
      })
    }
    
    // Get decisions from examples (example_comments table where is_decision = true)
    const { data: exampleComments, error: exampleCommentError } = await supabase
      .from('example_comments')
      .select(`
        *,
        examples!inner(
          id,
          project_id,
          short_id,
          actor
        )
      `)
      .eq('examples.project_id', projectId)
      .eq('is_decision', true)
      .order('created_at', { ascending: false })

    if (exampleCommentError) throw exampleCommentError

    if (exampleComments) {
      exampleComments.forEach((comment: any) => {
        if (comment.comment_text && comment.comment_text.trim()) {
          decisions.push({
            id: `example-${comment.id}`,
            content: comment.comment_text,
            source_type: 'example',
            source_id: comment.example_id,
            source_name: `Example #${comment.examples.short_id}`,
            source_short_id: comment.examples.short_id,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
            user_id: comment.user_id
          })
        }
      })
    }
    
    // Sort by created_at (newest first)
    return decisions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } catch (error) {
    console.error('Error fetching project decisions:', error)
    return []
  }
}
