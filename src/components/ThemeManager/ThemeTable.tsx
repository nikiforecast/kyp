import React from 'react'
import { Tag, Edit, Trash2, ChevronUp, ChevronDown, BookOpen, FileText, GitBranch } from 'lucide-react'
import type { Theme } from '../../lib/supabase'

interface ThemeTableProps {
  themes: Array<Theme & { contentCounts: { userStories: number; userJourneys: number; researchNotes: number } }>
  onEdit: (theme: Theme) => void
  onDelete: (themeId: string, themeName: string) => void
  onRowClick: (theme: Theme) => void
}

type SortField = 'name' | 'userStories' | 'userJourneys' | 'researchNotes' | 'total'

export function ThemeTable({ themes, onEdit, onDelete, onRowClick }: ThemeTableProps) {
  const [sortField, setSortField] = React.useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronUp size={14} className="text-gray-300" />
    }
    return sortDirection === 'asc' 
      ? <ChevronUp size={14} className="text-gray-600" />
      : <ChevronDown size={14} className="text-gray-600" />
  }

  const handleDeleteTheme = async (themeId: string, themeName: string) => {
    if (window.confirm(`Are you sure you want to delete the theme "${themeName}"? This will remove it from all associated content.`)) {
      onDelete(themeId, themeName)
    }
  }

  // Sort themes
  const sortedThemes = [...themes].sort((a, b) => {
    if (!sortField) return 0
    
    let aValue: string | number
    let bValue: string | number
    
    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'userStories':
        aValue = a.contentCounts.userStories
        bValue = b.contentCounts.userStories
        break
      case 'userJourneys':
        aValue = a.contentCounts.userJourneys
        bValue = b.contentCounts.userJourneys
        break
      case 'researchNotes':
        aValue = a.contentCounts.researchNotes
        bValue = b.contentCounts.researchNotes
        break
      case 'total':
        aValue = a.contentCounts.userStories + a.contentCounts.userJourneys + a.contentCounts.researchNotes
        bValue = b.contentCounts.userStories + b.contentCounts.userJourneys + b.contentCounts.researchNotes
        break
      default:
        return 0
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Color
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Theme Name
                  {getSortIcon('name')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('userStories')}
              >
                <div className="flex items-center gap-1">
                  User Stories
                  {getSortIcon('userStories')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('userJourneys')}
              >
                <div className="flex items-center gap-1">
                  User Journeys
                  {getSortIcon('userJourneys')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('researchNotes')}
              >
                <div className="flex items-center gap-1">
                  Notes & Calls
                  {getSortIcon('researchNotes')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('total')}
              >
                <div className="flex items-center gap-1">
                  Total Content
                  {getSortIcon('total')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedThemes.map((theme) => {
              const totalContent = theme.contentCounts.userStories + theme.contentCounts.userJourneys + theme.contentCounts.researchNotes
              
              return (
                <tr 
                  key={theme.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onRowClick(theme)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div 
                      className="w-6 h-6 rounded-full border border-gray-300"
                      style={{ backgroundColor: theme.color || '#3B82F6' }}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{theme.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 max-w-xs truncate">
                      {theme.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} style={{ color: '#6b42d1' }} />
                      <span className="text-sm text-gray-900">{theme.contentCounts.userStories}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <GitBranch size={16} className="text-green-600" />
                      <span className="text-sm text-gray-900">{theme.contentCounts.userJourneys}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-indigo-600" />
                      <span className="text-sm text-gray-900">{theme.contentCounts.researchNotes}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{totalContent}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit(theme)
                        }}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteTheme(theme.id, theme.name)
                        }}
                        className="text-red-600 hover:text-red-900 flex items-center gap-1"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        
        {sortedThemes.length === 0 && (
          <div className="text-center py-12">
            <Tag size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No themes yet. Create your first theme to organize your content!</p>
          </div>
        )}
      </div>
    </div>
  )
}