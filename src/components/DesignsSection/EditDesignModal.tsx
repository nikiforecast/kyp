import React, { useState } from 'react'
import { X, Upload, Palette as PaletteIcon, Link as LinkIcon, BookOpen, FileText } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import type { Design } from '../../lib/supabase'
import type { UserStory, ResearchNote } from '../../lib/supabase'

interface EditDesignModalProps {
  design: Design
  onClose: () => void
  onSubmit: (designData: {
    name: string
    snapshotImageUrl?: string
    description?: string
    linkUrl?: string
    userStoryIds: string[]
    researchNoteIds: string[]
  }) => Promise<void>
  userStories: UserStory[]
  researchNotes: ResearchNote[]
  linkedUserStoryIds: string[]
  linkedResearchNoteIds: string[]
}

export function EditDesignModal({ 
  design, 
  onClose, 
  onSubmit, 
  userStories, 
  researchNotes, 
  linkedUserStoryIds, 
  linkedResearchNoteIds 
}: EditDesignModalProps) {
  const [formData, setFormData] = useState({
    name: design.name,
    snapshotImageUrl: design.snapshot_image_url || '',
    description: design.description || '',
    linkUrl: design.link_url || '',
    userStoryIds: linkedUserStoryIds,
    researchNoteIds: linkedResearchNoteIds
  })
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(design.snapshot_image_url || null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) return
    
    setSaving(true)
    try {
      await onSubmit({
        name: formData.name.trim(),
        snapshotImageUrl: formData.snapshotImageUrl.trim() || undefined,
        description: formData.description.trim() || undefined,
        linkUrl: formData.linkUrl.trim() || undefined,
        userStoryIds: formData.userStoryIds,
        researchNoteIds: formData.researchNoteIds
      })
      onClose()
    } catch (error) {
      console.error('Error updating design:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleImageUrlChange = (url: string) => {
    setFormData({ ...formData, snapshotImageUrl: url })
    setImagePreview(url)
  }

  const handlePasteImage = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (file) {
          try {
            // Compress the image before converting to base64
            const compressedFile = await imageCompression(file, {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true
            })
            
            // Convert compressed image to base64 for preview and storage
            const reader = new FileReader()
            reader.onload = (event) => {
              const base64String = event.target?.result as string
              setFormData({ ...formData, snapshotImageUrl: base64String })
              setImagePreview(base64String)
            }
            reader.readAsDataURL(compressedFile)
          } catch (error) {
            console.error('Error compressing pasted image:', error)
            alert('Error processing image. Please try again.')
          }
        }
      }
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    const compressImage = async () => {
      try {
        // Compress the image before converting to base64
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        })
        
        // Convert compressed image to base64 for preview and storage
        const reader = new FileReader()
        reader.onload = (event) => {
          const base64String = event.target?.result as string
          setFormData({ ...formData, snapshotImageUrl: base64String })
          setImagePreview(base64String)
        }
        reader.readAsDataURL(compressedFile)
      } catch (error) {
        console.error('Error compressing uploaded image:', error)
        alert('Error processing image. Please try again.')
      }
    }
    
    compressImage()
  }

  const toggleUserStory = (userStoryId: string) => {
    setFormData(prev => ({
      ...prev,
      userStoryIds: prev.userStoryIds.includes(userStoryId)
        ? prev.userStoryIds.filter(id => id !== userStoryId)
        : [...prev.userStoryIds, userStoryId]
    }))
  }

  const toggleResearchNote = (researchNoteId: string) => {
    setFormData(prev => ({
      ...prev,
      researchNoteIds: prev.researchNoteIds.includes(researchNoteId)
        ? prev.researchNoteIds.filter(id => id !== researchNoteId)
        : [...prev.researchNoteIds, researchNoteId]
    }))
  }

  const isValidUrl = (url: string) => {
    if (!url.trim()) return true
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`)
      return true
    } catch {
      return false
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Edit Design</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Design Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Design Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter design name..."
                required
                disabled={saving}
              />
            </div>

            {/* Snapshot Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Snapshot Image
              </label>
              
              {/* Image Preview */}
              {imagePreview ? (
                <div className="mb-4">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null)
                      setFormData({ ...formData, snapshotImageUrl: '' })
                    }}
                    className="mt-2 text-sm text-red-600 hover:text-red-700"
                  >
                    Remove Image
                  </button>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4"
                  onPaste={handlePasteImage}
                >
                  <PaletteIcon size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">Upload an image or paste from clipboard</p>
                  <div className="flex items-center justify-center gap-4">
                    <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all cursor-pointer">
                      <Upload size={16} />
                      Upload File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={saving}
                      />
                    </label>
                    <span className="text-gray-500">or</span>
                    <span className="text-sm text-gray-600">Ctrl+V to paste</span>
                  </div>
                </div>
              )}

              {/* Image URL Input */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Or enter image URL
                </label>
                <input
                  type="url"
                  value={formData.snapshotImageUrl}
                  onChange={(e) => handleImageUrlChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Describe this design..."
                disabled={saving}
              />
            </div>

            {/* External Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                External Link
              </label>
              <div className="relative">
                <LinkIcon size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="url"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formData.linkUrl && !isValidUrl(formData.linkUrl) ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="https://example.com"
                  disabled={saving}
                />
              </div>
              {formData.linkUrl && !isValidUrl(formData.linkUrl) && (
                <p className="text-sm text-red-600 mt-1">Please enter a valid URL</p>
              )}
            </div>

            {/* Tag to User Stories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tag to User Stories ({formData.userStoryIds.length} selected)
              </label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                {userStories.length === 0 ? (
                  <p className="text-sm text-gray-500">No user stories available</p>
                ) : (
                  <div className="space-y-2">
                    {userStories.map((story) => (
                      <label key={story.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.userStoryIds.includes(story.id)}
                          onChange={() => toggleUserStory(story.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          disabled={saving}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <BookOpen size={16} style={{ color: '#6b42d1' }} />
                          <span className="text-sm text-gray-700 truncate">{story.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tag to Research Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tag to Notes & Calls ({formData.researchNoteIds.length} selected)
              </label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                {researchNotes.length === 0 ? (
                  <p className="text-sm text-gray-500">No notes & calls available</p>
                ) : (
                  <div className="space-y-2">
                    {researchNotes.map((note) => (
                      <label key={note.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.researchNoteIds.includes(note.id)}
                          onChange={() => toggleResearchNote(note.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          disabled={saving}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <FileText size={16} className="text-indigo-600" />
                          <span className="text-sm text-gray-700 truncate">{note.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center gap-3 pt-4">
              <button 
                type="submit" 
                disabled={saving || !formData.name.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {saving ? 'Updating...' : 'Update Design'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}