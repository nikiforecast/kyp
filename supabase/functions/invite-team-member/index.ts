import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface InviteRequest {
  email: string
  role: 'admin' | 'member'
  fullName?: string
  team?: 'Design' | 'Product' | 'Engineering' | 'Other'
  workspaceId: string
  username?: string
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

function validateUsername(username: string): string | null {
  const normalized = normalizeUsername(username)
  if (!/^[a-z0-9_]{3,30}$/.test(normalized)) {
    return 'Username must be 3–30 characters: lowercase letters, numbers, and underscores only'
  }
  return null
}

function isPlatformAdmin(user: { app_metadata?: Record<string, unknown> }): boolean {
  return user.app_metadata?.is_admin === true
}

async function isWorkspaceAdmin(
  supabaseAdmin: ReturnType<typeof createClient>,
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('workspace_users')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !data) return false
  return data.role === 'owner' || data.role === 'admin'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { email, role, fullName, team, workspaceId, username }: InviteRequest = await req.json()

    if (!email || !role || !workspaceId) {
      return new Response(
        JSON.stringify({ error: 'Email, role, and workspaceId are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!['admin', 'member'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Role must be either "admin" or "member"' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (team && !['Design', 'Product', 'Engineering', 'Other'].includes(team)) {
      return new Response(
        JSON.stringify({ error: 'Team must be one of: Design, Product, Engineering, Other' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    let normalizedUsername: string | null = null
    if (username?.trim()) {
      const usernameError = validateUsername(username)
      if (usernameError) {
        return new Response(
          JSON.stringify({ error: usernameError }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      normalizedUsername = normalizeUsername(username)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const callerIsPlatformAdmin = isPlatformAdmin(user)
    const callerIsWorkspaceAdmin = await isWorkspaceAdmin(supabaseAdmin, workspaceId, user.id)

    if (!callerIsPlatformAdmin && !callerIsWorkspaceAdmin) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to invite users to this workspace' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .maybeSingle()

    if (workspaceError || !workspace) {
      return new Response(
        JSON.stringify({ error: 'Workspace not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('workspace_users')
      .select('id, status')
      .eq('workspace_id', workspaceId)
      .eq('user_email', email)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing user:', checkError)
      return new Response(
        JSON.stringify({ error: 'Database error while checking existing user' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'User already exists in workspace' }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    const { data: existingAuthUserRow, error: authLookupError } = await supabaseAdmin
      .schema('auth')
      .from('users')
      .select('id, email')
      .ilike('email', normalizedEmail)
      .maybeSingle()

    if (authLookupError) {
      console.error('Error looking up auth user:', authLookupError)
    }

    const existingAuthUser = existingAuthUserRow
      ? { id: existingAuthUserRow.id, email: existingAuthUserRow.email }
      : null

    if (!existingAuthUser) {
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${req.headers.get('origin') || 'http://localhost:5173'}/`,
        data: {
          workspace_id: workspaceId,
          role: role
        }
      })

      if (inviteError) {
        console.error('Error inviting user:', inviteError)
        return new Response(
          JSON.stringify({ error: `Failed to send invitation: ${inviteError.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    if (normalizedUsername) {
      const { data: existingUsername } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('username', normalizedUsername)
        .maybeSingle()

      if (existingUsername && existingUsername.user_id !== existingAuthUser?.id) {
        return new Response(
          JSON.stringify({ error: 'Username is already taken' }),
          {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    const { data: workspaceUser, error: workspaceUserError } = await supabaseAdmin
      .from('workspace_users')
      .insert([{
        workspace_id: workspaceId,
        user_id: existingAuthUser?.id ?? null,
        user_email: email,
        full_name: fullName || null,
        team: team || null,
        role: role,
        username: normalizedUsername,
        invited_by: user.id,
        status: existingAuthUser ? 'active' : 'pending'
      }])
      .select()
      .single()

    if (workspaceUserError) {
      console.error('Error creating workspace user:', workspaceUserError)
      const message = workspaceUserError.message.includes('profiles_username')
        ? 'Username is already taken'
        : 'Failed to create workspace user entry'
      return new Response(
        JSON.stringify({ error: message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (existingAuthUser?.id && normalizedUsername) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          user_id: existingAuthUser.id,
          username: normalizedUsername,
          updated_at: new Date().toISOString(),
        })

      if (profileError) {
        console.error('Error setting username:', profileError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: workspaceUser,
        message: existingAuthUser
          ? `${email} added to workspace`
          : `Invitation sent to ${email}`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
