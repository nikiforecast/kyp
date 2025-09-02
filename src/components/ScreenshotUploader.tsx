import React, { useState, useCallback } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from './DesignSystem/components/Button'
import { Card } from './DesignSystem/components/Card'
import type { Example } from '../lib/supabase'
import { analyzeScreenshot, validateExtractedExamples, enhanceExtractedExamples } from '../lib/aiService'
import { supabase } from '../lib/supabase'

interface ScreenshotUploaderProps {
  projectId: string
  onImportComplete: (examples: Omit<Example, 'id' | 'short_id' | 'created_at' | 'updated_at'>[]) => void
  onClose: () => void
}

interface ExtractedExample {
  actor: string
  goal: string
  entry_point: string
  actions: string
  error: string
  outcome: string
}

export const ScreenshotUploader: React.FC<ScreenshotUploaderProps> = ({
  projectId,
  onImportComplete,
  onClose
}) => {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [extractedExamples, setExtractedExamples] = useState<ExtractedExample[]>([])
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, etc.)')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setError(null)
    setUploading(true)

    try {
      // Create preview URL
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)

      // Convert to base64 for AI processing
      const base64 = await fileToBase64(file)
      
      // Process with AI
      setProcessing(true)
      const examples = await processScreenshot(base64)
      setExtractedExamples(examples)
      
    } catch (err) {
      console.error('Error processing file:', err)
      setError('Failed to process image. Please try again.')
    } finally {
      setUploading(false)
      setProcessing(false)
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        // Remove data:image/...;base64, prefix
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = error => reject(error)
    })
  }

  const processScreenshot = async (base64Image: string): Promise<ExtractedExample[]> => {
    try {
      // Analyze screenshot with AI
      const result = await analyzeScreenshot(base64Image)
      
      // Enhance and validate extracted examples
      const enhanced = enhanceExtractedExamples(result.examples)
      const { valid } = validateExtractedExamples(enhanced)
      
      return valid
    } catch (error) {
      console.error('Error processing screenshot:', error)
      throw error
    }
  }

  const handleImport = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase?.auth.getUser() || { data: { user: null }, error: new Error('Supabase not configured') }
      
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      // Convert extracted examples to full Example objects
      const examples: Omit<Example, 'id' | 'short_id' | 'created_at' | 'updated_at'>[] = extractedExamples.map(example => ({
        project_id: projectId,
        actor: example.actor,
        goal: example.goal,
        entry_point: example.entry_point,
        actions: example.actions,
        error: example.error,
        outcome: example.outcome,
        created_by: user.id // Set the actual user ID
      }))

      onImportComplete(examples)
      onClose()
    } catch (error) {
      console.error('Error preparing examples for import:', error)
      setError('Failed to prepare examples for import. Please try again.')
    }
  }

  const resetUpload = () => {
    setExtractedExamples([])
    setError(null)
    setPreviewUrl(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Import Examples from Screenshot
            </h2>
            <Button
              onClick={onClose}
              variant="ghost"
              size="small"
              icon={X}
            >
              Close
            </Button>
          </div>

          {/* Upload Area */}
          {!extractedExamples.length && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {uploading || processing ? (
                <div className="space-y-4">
                  <Loader2 className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {uploading ? 'Uploading image...' : 'Analyzing screenshot...'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {uploading 
                        ? 'Please wait while we process your image' 
                        : 'AI is extracting examples from your Miro board'
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      Upload Miro Board Screenshot
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Drag and drop your image here, or click to browse
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                    id="screenshot-upload"
                  />
                  <label htmlFor="screenshot-upload">
                    <Button
                      variant="outline"
                      size="default"
                      className="cursor-pointer"
                    >
                      Choose File
                    </Button>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {previewUrl && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Preview</h3>
              <img
                src={previewUrl}
                alt="Screenshot preview"
                className="w-full max-h-64 object-contain border rounded-lg"
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Extracted Examples */}
          {extractedExamples.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Extracted Examples ({extractedExamples.length})
                </h3>
                <Button
                  onClick={resetUpload}
                  variant="outline"
                  size="small"
                >
                  Upload Different Image
                </Button>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {extractedExamples.map((example, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Actor:</span>
                        <p className="text-gray-900">{example.actor}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Goal:</span>
                        <p className="text-gray-900">{example.goal}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Entry Point:</span>
                        <p className="text-gray-900">{example.entry_point}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Error:</span>
                        <p className="text-gray-900">{example.error}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium text-gray-700">Actions:</span>
                        <p className="text-gray-900">{example.actions}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium text-gray-700">Outcome:</span>
                        <p className="text-gray-900">{example.outcome}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Import Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  onClick={onClose}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  variant="primary"
                  icon={CheckCircle}
                >
                  Import {extractedExamples.length} Examples
                </Button>
              </div>
            </div>
          )}
     
      </Card>
    </div>
  )
}
