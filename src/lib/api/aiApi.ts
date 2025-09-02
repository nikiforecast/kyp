/**
 * AI API service for analyzing screenshots
 * This file contains the client-side API calls to AI services
 */

export interface AIAnalysisRequest {
  image: string // Base64 encoded image
  prompt?: string // Optional custom prompt
}

export interface AIAnalysisResponse {
  examples: Array<{
    actor: string
    goal: string
    entry_point: string
    actions: string
    error: string
    outcome: string
  }>
  confidence: number
  processingTime: number
}

/**
 * Analyzes a screenshot using OpenAI Vision API
 * @param request - Analysis request with image and optional prompt
 * @returns Promise<AIAnalysisResponse>
 */
export const analyzeWithOpenAI = async (request: AIAnalysisRequest): Promise<AIAnalysisResponse> => {
  try {
    const response = await fetch('/api/ai/analyze-screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`AI analysis failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('OpenAI analysis error:', error)
    throw error
  }
}

/**
 * Analyzes a screenshot using Google Vision API
 * @param request - Analysis request with image
 * @returns Promise<AIAnalysisResponse>
 */
export const analyzeWithGoogleVision = async (request: AIAnalysisRequest): Promise<AIAnalysisResponse> => {
  try {
    const response = await fetch('/api/ai/google-vision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`Google Vision analysis failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Google Vision analysis error:', error)
    throw error
  }
}

/**
 * Analyzes a screenshot using Azure Computer Vision
 * @param request - Analysis request with image
 * @returns Promise<AIAnalysisResponse>
 */
export const analyzeWithAzureVision = async (request: AIAnalysisRequest): Promise<AIAnalysisResponse> => {
  try {
    const response = await fetch('/api/ai/azure-vision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`Azure Vision analysis failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Azure Vision analysis error:', error)
    throw error
  }
}

/**
 * Fallback analysis using multiple AI services
 * @param request - Analysis request with image
 * @returns Promise<AIAnalysisResponse>
 */
export const analyzeWithFallback = async (request: AIAnalysisRequest): Promise<AIAnalysisResponse> => {
  const services = [
    { name: 'OpenAI', fn: analyzeWithOpenAI },
    { name: 'Google Vision', fn: analyzeWithGoogleVision },
    { name: 'Azure Vision', fn: analyzeWithAzureVision }
  ]

  for (const service of services) {
    try {
      console.log(`Trying ${service.name}...`)
      return await service.fn(request)
    } catch (error) {
      console.warn(`${service.name} failed:`, error)
      continue
    }
  }

  throw new Error('All AI services failed')
}
