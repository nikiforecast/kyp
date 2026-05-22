import 'dotenv/config'
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { requireApiKey } from './auth.js'
import {
  listProjectsTool,
  getProjectTool,
} from './tools/projects.js'
import {
  listUserJourneysTool,
  getJourneyDetailsTool,
} from './tools/journeys.js'
import { searchExamplesTool } from './tools/examples.js'
import { listStakeholdersTool } from './tools/stakeholders.js'

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3100

function createServer(): McpServer {
  const server = new McpServer(
    {
      name: 'js-connector',
      version: '1.0.0',
    },
    { capabilities: { logging: {} } }
  )

  server.registerTool(
    listProjectsTool.name,
    listProjectsTool.config,
    listProjectsTool.handler
  )

  server.registerTool(
    getProjectTool.name,
    getProjectTool.config,
    getProjectTool.handler
  )

  server.registerTool(
    listUserJourneysTool.name,
    listUserJourneysTool.config,
    listUserJourneysTool.handler
  )

  server.registerTool(
    getJourneyDetailsTool.name,
    getJourneyDetailsTool.config,
    getJourneyDetailsTool.handler
  )

  server.registerTool(
    searchExamplesTool.name,
    searchExamplesTool.config,
    searchExamplesTool.handler
  )

  server.registerTool(
    listStakeholdersTool.name,
    listStakeholdersTool.config,
    listStakeholdersTool.handler
  )

  return server
}

const app = createMcpExpressApp({
  host: process.env.HOST || '0.0.0.0',
  allowedHosts: process.env.ALLOWED_HOSTS
    ? process.env.ALLOWED_HOSTS.split(',')
    : undefined,
})

app.post('/mcp', requireApiKey, async (req, res) => {
  const server = createServer()
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    })
    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
    res.on('close', () => {
      transport.close()
      server.close()
    })
  } catch (error) {
    console.error('Error handling MCP request:', error)
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      })
    }
  }
})

app.get('/mcp', (req, res) => {
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    })
  )
})

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'js-mcp-connector',
    version: '1.0.0',
  })
})

const host = process.env.HOST || '0.0.0.0'
app.listen(PORT, host, () => {
  console.log(`Journey Studio MCP Connector running on port ${PORT}`)
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`)
  if (!process.env.JS_MCP_API_KEY && !process.env.KYP_MCP_API_KEY) {
    console.warn('⚠️  JS_MCP_API_KEY not set - authentication will fail')
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️  Supabase not configured - tools will return empty data')
  }
})
