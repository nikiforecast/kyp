import { supabase, isSupabaseConfigured } from '../../supabase'

export interface ExampleComment {
  id: string
  example_id: string
  user_id: string
  comment_text: string
  is_decision: boolean
  created_at: string
  updated_at: string
}

export const getExampleComments = async (exampleId: string): Promise<ExampleComment[]> => {
  // TEMPORARY: Force localStorage until database is fixed
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_example_comments')
      const allComments = stored ? JSON.parse(stored) : []
      const filteredComments = allComments.filter((comment: ExampleComment) => comment.example_id === exampleId)
      return filteredComments
    } catch (error) {
      console.error('Error reading from localStorage:', error)
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('example_comments')
      .select('*')
      .eq('example_id', exampleId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching example comments from Supabase:', error)
    return []
  }
}

export const createExampleComment = async (
  exampleId: string,
  commentText: string,
  userId: string,
  isDecision: boolean = false
): Promise<ExampleComment | null> => {
  // TEMPORARY: Force localStorage until database is fixed
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const newComment: ExampleComment = {
        id: `ec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        example_id: exampleId,
        user_id: userId,
        comment_text: commentText,
        is_decision: isDecision,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const stored = localStorage.getItem('kyp_example_comments')
      const comments = stored ? JSON.parse(stored) : []
      comments.push(newComment)
      localStorage.setItem('kyp_example_comments', JSON.stringify(comments))
      
      return newComment
    } catch (error) {
      console.error('Error creating example comment locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('example_comments')
      .insert([{
        example_id: exampleId,
        user_id: userId,
        comment_text: commentText,
        is_decision: isDecision
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating example comment:', error)
    return null
  }
}

export const updateExampleComment = async (
  commentId: string,
  commentText: string
): Promise<ExampleComment | null> => {
  // TEMPORARY: Force localStorage until database is fixed
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_example_comments')
      const comments = stored ? JSON.parse(stored) : []
      const updatedComments = comments.map((comment: ExampleComment) =>
        comment.id === commentId
          ? { ...comment, comment_text: commentText, updated_at: new Date().toISOString() }
          : comment
      )
      localStorage.setItem('kyp_example_comments', JSON.stringify(updatedComments))
      
      return updatedComments.find((c: ExampleComment) => c.id === commentId) || null
    } catch (error) {
      console.error('Error updating example comment locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('example_comments')
      .update({ 
        comment_text: commentText, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', commentId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating example comment:', error)
    return null
  }
}

export const deleteExampleComment = async (commentId: string): Promise<boolean> => {
  // TEMPORARY: Force localStorage until database is fixed
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_example_comments')
      const comments = stored ? JSON.parse(stored) : []
      const filteredComments = comments.filter((comment: ExampleComment) => comment.id !== commentId)
      localStorage.setItem('kyp_example_comments', JSON.stringify(filteredComments))
      
      return true
    } catch (error) {
      console.error('Error deleting example comment locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('example_comments')
      .delete()
      .eq('id', commentId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting example comment:', error)
    return false
  }
}
