import React, { useState, useRef, useEffect } from 'react'
import { Tag, Plus, X } from 'lucide-react'
import { createTheme } from '../../lib/database'
import type { Theme } from '../../lib/supabase'

interface TagThemeCardProps {
  availableThemes: Theme[]
  selectedThemes: Theme[]
  onThemeAdd: (theme: Theme) => void
  onThemeRemove: (themeId: string) => void
  onThemeCreate?: (theme: Theme) => void
  className?: string
}

export function TagThemeCard({
  availableThemes = [],
  selectedThemes,
  onThemeAdd,
  onThemeRemove,
  onThemeCreate,
  className = ''
}: TagThemeCardProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [creating, setCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter themes based on search term and exclude already selected themes
  const filteredThemes = availableThemes.filter(theme => 
    theme.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedThemes.some(selected => selected.id === theme.id)
  )

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (value: string) => {
    setSearchTerm(value)
    setShowDropdown(value.length > 0)
  }

  const handleThemeSelect = (theme: Theme) => {
    onThemeAdd(theme)
    setSearchTerm('')
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  const handleCreateTheme = async () => {
    if (!searchTerm.trim()) return
    
    setCreating(true)
    try {
      const newTheme = await createTheme(searchTerm.trim())
      if (newTheme) {
        onThemeAdd(newTheme)
        if (onThemeCreate) {
          onThemeCreate(newTheme)
        }
        setSearchTerm('')
        setShowDropdown(false)
        inputRef.current?.focus()
      }
    } catch (error) {
      console.error('Error creating theme:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredThemes.length === 1) {
        handleThemeSelect(filteredThemes[0])
      } else if (filteredThemes.length === 0 && searchTerm.trim()) {
        handleCreateTheme()
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      setSearchTerm('')
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
                        <Tag className="w-5 h-5" style={{ color: '#6b42d1' }} />
        <h3 className="text-lg font-semibold text-gray-900">
          Tag Theme ({selectedThemes.length})
        </h3>
      </div>

      {/* Selected Themes */}
      {selectedThemes.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {selectedThemes.map((theme) => (
              <div
                key={theme.id}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                style={{ 
                  backgroundColor: `${theme.color}20`,
                  color: theme.color,
                  border: `1px solid ${theme.color}40`
                }}
              >
                <span>{theme.name}</span>
                <button
                  onClick={() => onThemeRemove(theme.id)}
                  className="hover:bg-black hover:bg-opacity-10 rounded-full p-0.5 transition-colors"
                  title="Remove theme"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => searchTerm && setShowDropdown(true)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': '#6b42d1' } as React.CSSProperties}
          placeholder="Search or create themes..."
          disabled={creating}
        />

        {/* Dropdown */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-y-auto"
          >
            {filteredThemes.length > 0 ? (
              <>
                {filteredThemes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => handleThemeSelect(theme)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: theme.color }}
                      />
                      <div>
                        <div className="font-medium text-gray-900">{theme.name}</div>
                        {theme.description && (
                          <div className="text-sm text-gray-600">{theme.description}</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </>
            ) : searchTerm.trim() ? (
              <button
                onClick={handleCreateTheme}
                disabled={creating}
                className="w-full px-4 py-3 text-left transition-colors disabled:opacity-50"
                style={{ 
                  '--tw-bg-opacity': '0.05',
                  backgroundColor: 'rgba(107, 66, 209, var(--tw-bg-opacity))'
                } as React.CSSProperties}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(107, 66, 209, 0.1)' }}>
                    <Plus size={16} style={{ color: '#6b42d1' }} />
                  </div>
                  <div>
                    <div className="font-medium" style={{ color: '#6b42d1' }}>
                      {creating ? 'Creating...' : `Create "${searchTerm}"`}
                    </div>
                    <div className="text-sm" style={{ color: '#6b42d1' }}>
                      Create a new theme with this name
                    </div>
                  </div>
                </div>
              </button>
            ) : (
              <div className="px-4 py-3 text-gray-500 text-sm">
                Start typing to search themes...
              </div>
            )}
          </div>
        )}
      </div>

      {selectedThemes.length === 0 && (
        <p className="text-sm text-gray-500 mt-2">
          No themes tagged. Start typing to search or create themes.
        </p>
      )}
    </div>
  )
}