import { supabase } from './supabase'

export interface ExtractedExample {
  actor: string
  goal: string
  entry_point: string
  actions: string
  error: string
  outcome: string
}

export interface AIAnalysisResult {
  examples: ExtractedExample[]
  confidence: number
  processingTime: number
}

/**
 * Analyzes a screenshot of a Miro board to extract user journey examples
 * Only extracts data that is actually visible in the screenshot - no hallucination
 * @param base64Image - Base64 encoded image data
 * @returns Promise<AIAnalysisResult> - Extracted examples with confidence score
 */
export const analyzeScreenshot = async (base64Image: string): Promise<AIAnalysisResult> => {
  const startTime = Date.now()
  
  try {
    // For now, we'll use a mock implementation
    // TODO: Integrate with actual AI vision service (OpenAI, Google Vision, etc.)
    const mockExamples = await mockAIAnalysis(base64Image)
    
    const processingTime = Date.now() - startTime
    
    return {
      examples: mockExamples,
      confidence: 0.85, // Mock confidence score
      processingTime
    }
  } catch (error) {
    console.error('Error analyzing screenshot:', error)
    throw new Error('Failed to analyze screenshot. Please try again.')
  }
}

/**
 * Mock AI analysis for development/testing
 * In production, this would be replaced with actual AI vision API calls
 * 
 * NOTE: This mock simulates what would be extracted from an actual Miro screenshot
 * In real implementation, this would analyze the actual image content
 */
const mockAIAnalysis = async (base64Image: string): Promise<ExtractedExample[]> => {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Mock data simulating what would be extracted from a real Miro screenshot
  // This represents actual post-it notes or table rows visible in the image
  return [
    {
      actor: "New User",
      goal: "Sign up for the service",
      entry_point: "Landing page",
      actions: "Click sign up button, fill registration form, verify email address",
      error: "Email verification link expired",
      outcome: "Successfully created account and logged in"
    },
    {
      actor: "New User", // Same actor as above
      goal: "Sign up for the service", // Same goal
      entry_point: "Landing page", // Same entry point
      actions: "Click sign up button, fill registration form, verify email address", // Same actions
      error: "Email already exists", // Different error - this should be allowed
      outcome: "Successfully created account and logged in" // Same outcome
    },
    {
      actor: "Returning User",
      goal: "Access their dashboard",
      entry_point: "Login page",
      actions: "Enter email and password, click login button",
      error: "Forgot password, need to reset",
      outcome: "Reset password and accessed dashboard"
    },
    {
      actor: "Premium User",
      goal: "Upgrade their subscription",
      entry_point: "Account settings",
      actions: "Navigate to billing, select plan, enter payment info",
      error: "Payment method declined",
      outcome: "Updated payment method and upgraded successfully"
    }
  ]
}

/**
 * Real AI implementation using OpenAI Vision API
 * Uncomment and configure when ready to use
 */
/*
export const analyzeScreenshotWithOpenAI = async (base64Image: string): Promise<AIAnalysisResult> => {
  const startTime = Date.now()
  
  try {
    const response = await fetch('/api/ai/analyze-screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        prompt: `Analyze this Miro board screenshot containing post-it notes with user journey examples. 
        
        IMPORTANT: Only extract data that is actually visible in the screenshot. Do not create or hallucinate examples that are not present in the image.
        
        Look for post-it notes or table rows that contain user journey examples. Each example should be listed in a row, following the same column order as the example table:
        - Actor: Who is performing the action (look for user roles closely associated with the 'Actor' field, default to user roles previously created)
        - Goal: What they want to achieve  
        - Entry Point: How they start
        - Actions: Steps they take
        - Error: Problems they encounter
        - Outcome: Final result
        
        Extraction guidelines:
        - Read the actual text from each post-it note or table row in the screenshot
        - Do not invent or create examples that are not visible in the image
        - Examples might have the same fields as other examples, with only one field difference. Please allow this.
        - Only examples with all fields identical should be rejected as duplicates.
        - Focus on user roles that are closely associated with the Actor field.
        - If you cannot clearly read text in the image, do not include that example
        
        Return structured JSON data only for examples that are clearly visible and readable in the screenshot.`
      })
    })

    if (!response.ok) {
      throw new Error('AI analysis failed')
    }

    const result = await response.json()
    const processingTime = Date.now() - startTime

    return {
      examples: result.examples,
      confidence: result.confidence,
      processingTime
    }
  } catch (error) {
    console.error('OpenAI analysis error:', error)
    throw error
  }
}
*/

/**
 * Real AI implementation using Google Vision API
 * Uncomment and configure when ready to use
 */
/*
export const analyzeScreenshotWithGoogleVision = async (base64Image: string): Promise<AIAnalysisResult> => {
  const startTime = Date.now()
  
  try {
    const response = await fetch('/api/ai/google-vision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image
      })
    })

    if (!response.ok) {
      throw new Error('Google Vision analysis failed')
    }

    const result = await response.json()
    const processingTime = Date.now() - startTime

    return {
      examples: result.examples,
      confidence: result.confidence,
      processingTime
    }
  } catch (error) {
    console.error('Google Vision analysis error:', error)
    throw error
  }
}
*/

/**
 * Validates extracted examples to ensure they have required fields and removes exact duplicates
 */
export const validateExtractedExamples = (examples: ExtractedExample[]): { valid: ExtractedExample[], invalid: ExtractedExample[] } => {
  const valid: ExtractedExample[] = []
  const invalid: ExtractedExample[] = []
  const seenExamples = new Set<string>()

  examples.forEach(example => {
    const hasRequiredFields = example.actor && example.goal && example.entry_point && 
                             example.actions && example.error && example.outcome
    
    if (!hasRequiredFields) {
      invalid.push(example)
      return
    }

    // Create a unique key for exact duplicate detection
    const exampleKey = `${example.actor}|${example.goal}|${example.entry_point}|${example.actions}|${example.error}|${example.outcome}`
    
    if (seenExamples.has(exampleKey)) {
      // This is an exact duplicate, mark as invalid
      invalid.push(example)
    } else {
      // This is a new example (even if similar to others)
      seenExamples.add(exampleKey)
      valid.push(example)
    }
  })

  return { valid, invalid }
}

/**
 * Enhances extracted examples with additional processing
 */
export const enhanceExtractedExamples = (examples: ExtractedExample[]): ExtractedExample[] => {
  return examples.map(example => ({
    ...example,
    // Clean up text formatting
    actor: example.actor.trim(),
    goal: example.goal.trim(),
    entry_point: example.entry_point.trim(),
    actions: example.actions.trim(),
    error: example.error.trim(),
    outcome: example.outcome.trim(),
  }))
}
