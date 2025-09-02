import { analyzeScreenshot, validateExtractedExamples, enhanceExtractedExamples } from '../aiService'

describe('aiService', () => {
  describe('analyzeScreenshot', () => {
    it('should return mock examples for development', async () => {
      const mockBase64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      
      const result = await analyzeScreenshot(mockBase64Image)
      
      expect(result).toHaveProperty('examples')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('processingTime')
      expect(result.examples).toBeInstanceOf(Array)
      expect(result.examples.length).toBeGreaterThan(0)
    })

    it('should handle empty image gracefully', async () => {
      const emptyImage = ''
      
      await expect(analyzeScreenshot(emptyImage)).rejects.toThrow()
    })
  })

  describe('validateExtractedExamples', () => {
    it('should separate valid and invalid examples', () => {
      const examples = [
        {
          actor: 'User',
          goal: 'Sign up',
          entry_point: 'Landing page',
          actions: 'Click button',
          error: 'None',
          outcome: 'Success'
        },
        {
          actor: 'User',
          goal: '', // Missing goal
          entry_point: 'Landing page',
          actions: 'Click button',
          error: 'None',
          outcome: 'Success'
        }
      ]

      const result = validateExtractedExamples(examples)
      
      expect(result.valid).toHaveLength(1)
      expect(result.invalid).toHaveLength(1)
      expect(result.valid[0].actor).toBe('User')
      expect(result.invalid[0].example.goal).toBe('')
    })

    it('should handle empty examples array', () => {
      const result = validateExtractedExamples([])
      
      expect(result.valid).toHaveLength(0)
      expect(result.invalid).toHaveLength(0)
    })
  })

  describe('enhanceExtractedExamples', () => {
    it('should trim whitespace from all fields', () => {
      const examples = [
        {
          actor: '  User  ',
          goal: 'Sign up  ',
          entry_point: '  Landing page',
          actions: 'Click button  ',
          error: '  None  ',
          outcome: '  Success  '
        }
      ]

      const result = enhanceExtractedExamples(examples)
      
      expect(result[0].actor).toBe('User')
      expect(result[0].goal).toBe('Sign up')
      expect(result[0].entry_point).toBe('Landing page')
      expect(result[0].actions).toBe('Click button')
      expect(result[0].error).toBe('None')
      expect(result[0].outcome).toBe('Success')
    })

    it('should handle empty examples array', () => {
      const result = enhanceExtractedExamples([])
      
      expect(result).toHaveLength(0)
    })
  })
})
