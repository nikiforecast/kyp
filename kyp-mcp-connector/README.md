# Journey Studio MCP Connector

A Model Context Protocol (MCP) connector that enables Claude Cowork to interact with your Journey Studio (JS) data. Claude can search projects, user journeys, examples, and stakeholders directly from the Cowork interface.

## Features

- **list_projects** – List all projects with names, IDs, and overviews
- **get_project** – Get details of a specific project by ID or short_id
- **list_user_journeys** – List user journeys, optionally filtered by project
- **get_journey_details** – Get full journey details including flow data (nodes and edges)
- **search_examples** – Search examples (user journey scenarios) by project or text
- **list_stakeholders** – List all stakeholders in the workspace

## Prerequisites

- Node.js 20+
- A Journey Studio instance with Supabase backend

## Setup

### 1. Install dependencies

```bash
cd kyp-mcp-connector
npm install
```

### 2. Configure environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `JS_MCP_API_KEY` | Secret API key for authenticating requests. Use this when adding the connector in Claude Cowork. (`KYP_MCP_API_KEY` is still supported as a legacy alias.) |
| `SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role key (from Project Settings → API). **Never expose this client-side.** |

### 3. Build and run

```bash
npm run build
npm start
```

For development with auto-reload:

```bash
npm run dev
```

The server runs on port 3100 by default. The MCP endpoint is at `http://localhost:3100/mcp`.

## Adding to Claude Cowork

**Important:** Your MCP server must be publicly accessible over HTTPS. localhost will not work — deploy the connector or use [ngrok](https://ngrok.com) for local testing.

See **[CLAUDE_COWORK_SETUP.md](./CLAUDE_COWORK_SETUP.md)** for step-by-step instructions.

**Quick steps:**
1. Deploy the connector (or run locally + ngrok) so you have an HTTPS URL
2. Go to **Claude** → **Settings** → **Connectors** → **Add** → **Add custom connector**
3. Enter your MCP URL: `https://your-url/mcp`
4. Enter your `JS_MCP_API_KEY` as the authorization token when prompted
5. Click **Connect**

## Deployment

The connector must be **publicly accessible over HTTPS** for Claude Cowork to connect. Local STDIO servers are not supported.

### Recommended platforms

- **Railway** – Simple Node.js deployment
- **Render** – Free tier available
- **Fly.io** – Global edge deployment
- **Cloudflare Workers** – See MCP docs for Workers-specific setup
- **Vercel** – Serverless (may need adapter for long-lived connections)

### Example: Railway

1. Create a new project from the `kyp-mcp-connector` directory
2. Set environment variables in the Railway dashboard
3. Deploy – Railway will run `npm start` by default

### Example: Render

1. Create a new Web Service
2. Connect your repo and set root directory to `kyp-mcp-connector`
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Add environment variables

## Security

- **API key**: Use a strong, random value for `JS_MCP_API_KEY`. Rotate it if compromised.
- **Service role key**: The Supabase Service Role key bypasses RLS. Keep it secret and never commit to version control.
- **HTTPS**: Always use HTTPS in production. Claude requires `https://` URLs.
- **Rate limiting**: Consider adding rate limiting (e.g. via a reverse proxy) for production.

## Testing with MCP Inspector

```bash
npm run inspector
```

This launches the MCP Inspector for testing your server locally. Configure the inspector to point to your server URL and use your API key as the Bearer token.

## Troubleshooting

**"Supabase not configured"** – Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in your environment.

**"Unauthorized"** – Verify the `Authorization: Bearer <your-api-key>` header matches `JS_MCP_API_KEY`.

**Empty data** – Check that your Supabase project has the required tables (`projects`, `user_journeys`, `examples`, `stakeholders`) and that the Service Role key has access.
