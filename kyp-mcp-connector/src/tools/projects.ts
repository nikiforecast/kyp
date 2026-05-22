import { z } from 'zod'
import { supabase, isSupabaseConfigured } from '../supabase.js'

export const listProjectsTool = {
  name: 'list_projects' as const,
  config: {
    title: 'List Projects',
    description:
      'List all projects in Journey Studio. Returns project names, IDs, and overviews.',
    inputSchema: {},
  },
  handler: async (): Promise<{ content: Array<{ type: 'text'; text: string }> }> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Supabase not configured',
              projects: [],
            }),
          },
        ],
      }
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, overview, short_id, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error

      const projects = (data || []).map((p) => ({
        id: p.id,
        name: p.name,
        overview: p.overview || '',
        short_id: p.short_id,
      }))

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ projects }, null, 2),
          },
        ],
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: message, projects: [] }),
          },
        ],
      }
    }
  },
}

export const getProjectTool = {
  name: 'get_project' as const,
  config: {
    title: 'Get Project',
    description: 'Get details of a specific project by ID or short_id.',
    inputSchema: {
      projectId: z.string().optional().describe('Project UUID'),
      shortId: z.number().optional().describe('Project short_id (numeric)'),
    },
  },
  handler: async (args: {
    projectId?: string
    shortId?: number
  }): Promise<{ content: Array<{ type: 'text'; text: string }> }> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Supabase not configured' }),
          },
        ],
      }
    }

    if (!args.projectId && args.shortId === undefined) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Provide either projectId or shortId',
            }),
          },
        ],
      }
    }

    try {
      let query = supabase.from('projects').select('*')

      if (args.projectId) {
        query = query.eq('id', args.projectId)
      } else if (args.shortId !== undefined) {
        query = query.eq('short_id', args.shortId)
      }

      const { data, error } = await query.maybeSingle()

      if (error) throw error

      return {
        content: [
          {
            type: 'text',
            text: data ? JSON.stringify(data, null, 2) : 'Project not found',
          },
        ],
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: message }),
          },
        ],
      }
    }
  },
}
