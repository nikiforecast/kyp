import { supabase } from '../../supabase'
import type { Example } from '../../supabase'

export interface BulkImportResult {
  success: Example[]
  failed: Array<{ example: Partial<Example>, error: string }>
  totalProcessed: number
  totalSuccessful: number
  totalFailed: number
}

/**
 * Creates multiple examples in a single transaction
 * @param examples - Array of example data to create
 * @returns Promise<BulkImportResult> - Results of the bulk import operation
 */
export const bulkCreateExamples = async (examples: Omit<Example, 'id' | 'short_id' | 'created_at' | 'updated_at'>[]): Promise<BulkImportResult> => {
  const result: BulkImportResult = {
    success: [],
    failed: [],
    totalProcessed: examples.length,
    totalSuccessful: 0,
    totalFailed: 0
  }

  try {
    // Validate all examples before processing
    const validatedExamples = examples.map(example => {
      if (!example.project_id || !example.actor || !example.goal || 
          !example.entry_point || !example.actions || !example.error || !example.outcome) {
        throw new Error('Missing required fields')
      }
      return example
    })

    // Create examples one by one to handle individual failures
    for (const exampleData of validatedExamples) {
      try {
        const { data, error } = await supabase
          .from('examples')
          .insert([exampleData])
          .select()
          .single()

        if (error) {
          throw error
        }

        result.success.push(data)
        result.totalSuccessful++
      } catch (error) {
        result.failed.push({
          example: exampleData,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        result.totalFailed++
      }
    }

    return result
  } catch (error) {
    console.error('Bulk import error:', error)
    throw error
  }
}

/**
 * Creates multiple examples using a single insert operation (faster but less error handling)
 * @param examples - Array of example data to create
 * @returns Promise<Example[]> - Created examples
 */
export const bulkCreateExamplesFast = async (examples: Omit<Example, 'id' | 'short_id' | 'created_at' | 'updated_at'>[]): Promise<Example[]> => {
  try {
    const { data, error } = await supabase
      .from('examples')
      .insert(examples)
      .select()

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Fast bulk import error:', error)
    throw error
  }
}

/**
 * Validates example data before bulk import
 * @param examples - Array of example data to validate
 * @returns { valid: Example[], invalid: Array<{ example: Partial<Example>, errors: string[] }> }
 */
export const validateExamplesForBulkImport = (examples: Partial<Example>[]): {
  valid: Omit<Example, 'id' | 'created_at' | 'updated_at'>[],
  invalid: Array<{ example: Partial<Example>, errors: string[] }>
} => {
  const valid: Omit<Example, 'id' | 'created_at' | 'updated_at'>[] = []
  const invalid: Array<{ example: Partial<Example>, errors: string[] }> = []

  examples.forEach(example => {
    const errors: string[] = []

    // Check required fields
    if (!example.project_id) errors.push('Project ID is required')
    if (!example.actor) errors.push('Actor is required')
    if (!example.goal) errors.push('Goal is required')
    if (!example.entry_point) errors.push('Entry point is required')
    if (!example.actions) errors.push('Actions are required')
    if (!example.error) errors.push('Error is required')
    if (!example.outcome) errors.push('Outcome is required')

    // Check field lengths
    if (example.actor && example.actor.length > 255) errors.push('Actor is too long (max 255 characters)')
    if (example.goal && example.goal.length > 1000) errors.push('Goal is too long (max 1000 characters)')
    if (example.entry_point && example.entry_point.length > 1000) errors.push('Entry point is too long (max 1000 characters)')
    if (example.actions && example.actions.length > 2000) errors.push('Actions are too long (max 2000 characters)')
    if (example.error && example.error.length > 1000) errors.push('Error is too long (max 1000 characters)')
    if (example.outcome && example.outcome.length > 2000) errors.push('Outcome is too long (max 2000 characters)')

    if (errors.length === 0) {
      valid.push(example as Omit<Example, 'id' | 'created_at' | 'updated_at'>)
    } else {
      invalid.push({ example, errors })
    }
  })

  return { valid, invalid }
}

/**
 * Gets import statistics for a project
 * @param projectId - Project ID
 * @returns Promise<{ total: number, imported: number, manual: number }>
 */
export const getImportStatistics = async (projectId: string): Promise<{
  total: number
  imported: number
  manual: number
}> => {
  try {
    const { data, error } = await supabase
      .from('examples')
      .select('import_source')
      .eq('project_id', projectId)

    if (error) {
      throw error
    }

    const total = data?.length || 0
    const imported = data?.filter(ex => ex.import_source === 'screenshot').length || 0
    const manual = data?.filter(ex => ex.import_source === 'manual' || !ex.import_source).length || 0

    return { total, imported, manual }
  } catch (error) {
    console.error('Error getting import statistics:', error)
    throw error
  }
}
