import type { Request, Response, NextFunction } from 'express'

/** Supports JS_MCP_API_KEY (preferred) and legacy KYP_MCP_API_KEY */
const MCP_API_KEY = process.env.JS_MCP_API_KEY || process.env.KYP_MCP_API_KEY

/**
 * Validates the Authorization header against the MCP API key.
 * When adding the connector in Claude Cowork, use this key as the authorization_token.
 */
export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!MCP_API_KEY) {
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Server misconfiguration: JS_MCP_API_KEY not set',
      },
      id: null,
    })
    return
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: 'Unauthorized: Missing or invalid Authorization header',
      },
      id: null,
    })
    return
  }

  const token = authHeader.slice(7)
  if (token !== MCP_API_KEY) {
    res.status(401).json({
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: 'Unauthorized: Invalid API key',
      },
      id: null,
    })
    return
  }

  next()
}
