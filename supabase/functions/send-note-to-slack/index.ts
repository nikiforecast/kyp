import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

interface SendNoteRequest {
  noteId: string
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get the authorization header
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

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body to get the noteId
    const { noteId }: SendNoteRequest = await req.json()
    if (!noteId) {
      return new Response(
        JSON.stringify({ error: 'noteId is required in the request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Fetch note details from the database
    const { data: note, error: noteError } = await supabaseClient
      .from('research_notes')
      .select('name, summary, short_id, note_date, created_at, project_id')
      .eq('id', noteId)
      .single()

    if (noteError || !note) {
      console.error('Error fetching note:', noteError?.message || 'Note not found')
      return new Response(
        JSON.stringify({ error: 'Note not found or database error' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Fetch project details
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('name')
      .eq('id', note.project_id)
      .single()

    if (projectError) {
      console.error('Error fetching project:', projectError?.message || 'Project not found')
      return new Response(
        JSON.stringify({ error: 'Project not found or database error' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Fetch stakeholders associated with this note
    const { data: noteStakeholders, error: stakeholdersError } = await supabaseClient
      .from('research_note_stakeholders')
      .select(`
        stakeholders (
          name,
          user_role_id,
          law_firm_id
        )
      `)
      .eq('research_note_id', noteId)

    if (stakeholdersError) {
      console.error('Error fetching stakeholders:', stakeholdersError?.message || 'Stakeholders not found')
      // Continue without stakeholders rather than failing completely
    }

    // Fetch user roles and law firms for stakeholder details
    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('id, name')
    
    const { data: lawFirms } = await supabaseClient
      .from('law_firms')
      .select('id, name')
    
    const stakeholderDetails = noteStakeholders?.map(item => {
      const stakeholder = (item as any).stakeholders
      if (!stakeholder) return null
      
      const userRole = userRoles?.find(role => role.id === stakeholder.user_role_id)
      const lawFirm = lawFirms?.find(firm => firm.id === stakeholder.law_firm_id)
      
      return {
        name: stakeholder.name,
        role: userRole?.name || '',
        lawFirm: lawFirm?.name || ''
      }
    }).filter(Boolean) || []

    // Retrieve the Slack Webhook URL from environment variables
    const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL')
    if (!slackWebhookUrl) {
      console.error('SLACK_WEBHOOK_URL environment variable not set in Edge Function')
      return new Response(
        JSON.stringify({ 
          error: 'Slack webhook URL not configured. Please set the SLACK_WEBHOOK_URL environment variable in your Supabase Edge Function settings.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the request origin for constructing the note link
    const origin = req.headers.get('origin') || 'https://kyp-legl.netlify.app'
    const noteLink = `${origin}/note/${note.short_id}`

    // Strip HTML from summary for Slack
    // Convert HTML to Slack markdown format
 const htmlToSlackMarkdown = (html: string) => {
  if (!html) return '';

  let text = html;

  // Normalize non-breaking spaces to regular spaces
  text = text.replace(/&nbsp;/gi, ' ');

  // Remove empty paragraphs (e.g., <p></p>, <p> </p>, <p>&nbsp;</p>)
  text = text.replace(/<p[^>]*>\s*<\/p>/gi, '');

  // Convert headings (h3, h4) to bold with double newlines
  text = text.replace(/<h[34][^>]*>(.*?)<\/h[34]>/gi, '*$1*\n\n');

   // Handle ordered lists first (to avoid li being overwritten)
  text = text.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner) => {
    let i = 1;
    return inner.replace(/<li[^>]*>(.*?)<\/li>/gi, (match, content) => {
      return `${i++}. ${content.trim()}\n`;
    });
  });

  // Handle unordered lists
  text = text.replace(/<ul[^>]*>/gi, '\n');
  text = text.replace(/<\/ul>/gi, '\n');
  text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n');

  // Convert paragraphs to newlines
  text = text.replace(/<p[^>]*>/gi, '');
  text = text.replace(/<\/p>/gi, '\n\n');

  // Bold (strong or b)
  text = text.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '*$2*');

  // Italics (em or i)
  text = text.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '_$2_');

  // Clean up excessive spacing
  text = text.replace(/\n{3,}/g, '\n\n');        // Collapse >2 newlines
  text = text.replace(/[ \t]+\n/g, '\n');        // Trim spaces before newlines
  text = text.replace(/\n[ \t]+/g, '\n');        // Trim spaces after newlines
  text = text.replace(/[ ]{2,}/g, ' ');          // Collapse multiple spaces

  return text.trim();
};



    const cleanSummary = note.summary ? htmlToSlackMarkdown(note.summary) : 'No summary provided'
    const noteDate = note.note_date ? new Date(note.note_date).toLocaleDateString() : new Date(note.created_at).toLocaleDateString()

    // Build the message text with project and stakeholder information
    let messageText = `*<${noteLink}|${note.name}>*\n\n`
    
    // Add project information
    messageText += `*Project:* ${project.name}\n`
    
    // Add stakeholder information
    if (stakeholderDetails.length > 0) {
      messageText += `*Stakeholders:*\n`
      stakeholderDetails.forEach(stakeholder => {
        const parts = [stakeholder.name]
        if (stakeholder.role) parts.push(stakeholder.role)
        if (stakeholder.lawFirm) parts.push(stakeholder.lawFirm)
        messageText += `• ${parts.join(', ')}\n`
      })
    }
    
    messageText += `\n${cleanSummary}`

    // Prepare the Slack message payload using Block Kit
    const slackMessage = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'New Note from Journey Studio'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: messageText
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `${noteDate} • Shared by *${user.email}*`
            }
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View full note'
              },
              url: noteLink,
              style: 'primary'
            }
          ]
        }
      ]
    }

    // Send the message to Slack
    const slackResponse = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackMessage),
    })

    if (!slackResponse.ok) {
      const slackErrorText = await slackResponse.text()
      console.error('Error sending to Slack:', slackResponse.status, slackErrorText)
      return new Response(
        JSON.stringify({ 
          error: `Failed to send message to Slack: ${slackResponse.status} ${slackErrorText}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Note summary sent to Slack successfully!',
        noteTitle: note.name
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unhandled error in send-note-to-slack function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})