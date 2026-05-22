# Connecting Journey Studio MCP Connector to Claude Cowork

## Important: Your MCP server must be publicly accessible

Claude Cowork runs in the cloud and connects to your MCP server over the internet. **localhost URLs will not work.** You need either:

1. **Deploy the connector** (Railway, Render, Fly.io, etc.) — recommended for production
2. **Use a tunnel for local testing** (e.g. ngrok) — for quick testing before deployment

---

## Option A: Local testing with ngrok

1. **Start your MCP server:**
   ```bash
   cd kyp-mcp-connector
   npm start
   ```

2. **In another terminal, start ngrok:**
   ```bash
   ngrok http 3100
   ```

3. **Copy the HTTPS URL** ngrok gives you (e.g. `https://abc123.ngrok-free.app`)

4. **Your MCP endpoint URL is:** `https://abc123.ngrok-free.app/mcp`

---

## Option B: Deploy to production

Deploy the connector to Railway, Render, or similar. Set environment variables (`JS_MCP_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) in the platform's dashboard.

Your MCP endpoint will be something like: `https://your-app.railway.app/mcp`

---

## Add the connector in Claude Cowork

### Pro and Max plans

1. Go to [claude.ai](https://claude.ai)
2. Click your **initials** (bottom left) → **Settings**
3. Open the **Connectors** tab
4. Click **Add**
5. Click **Add custom connector**
6. Enter your **remote MCP server URL**: `https://your-url/mcp` (include the `/mcp` path)
7. If prompted for **Authorization** or **API key**, enter your `JS_MCP_API_KEY` value
8. Click **Add** / **Connect**

### Team and Enterprise plans

**Owners:**

1. Go to **Admin settings** → **Connectors**
2. Click **Add**
3. Enter the remote MCP server URL: `https://your-url/mcp`
4. Optionally configure OAuth in Advanced settings (not needed for API key auth)
5. Click **Add custom connector**

**Members:**

1. Go to **Settings** → **Connectors**
2. Find the connector with the **Custom** label
3. Click **Connect** to authenticate (enter your API key if prompted)

---

## Use the connector in chat

1. Start a new conversation or open an existing one
2. Click the **+** button (or "Add" / "Connectors" in the chat interface)
3. Enable the **Journey Studio** connector for this conversation
4. Ask Claude to use Journey Studio — e.g. "List my projects" or "Show me user journeys for project X"

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Connection failed" | Ensure your server is running and the URL is reachable (try opening it in a browser — you may get 405 for GET, which is expected) |
| "Unauthorized" | Verify `JS_MCP_API_KEY` in your `.env` matches what you entered in Claude |
| Tools don't appear | Check that the server is running and the URL ends with `/mcp` |
| Empty data | Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly |

---

## Verify the connection

1. **Health check:** Open `https://your-url/health` in a browser — you should see `{"status":"ok",...}`
2. **MCP endpoint:** The `/mcp` endpoint expects POST requests with JSON-RPC. A GET request may return 405 — that's normal.
3. **In Claude:** Ask "What Journey Studio tools do you have?" or "List my projects" to test.
