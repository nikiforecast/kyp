import React from 'react'
import { Plus, Edit, Trash, ChevronRight, Download, Upload, Search, Filter } from 'lucide-react'

interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  icon?: 'plus' | 'edit' | 'trash' | 'chevron-right' | 'download' | 'upload' | 'search' | 'filter'
  iconPosition?: 'left' | 'right'
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

const iconMap = {
  plus: Plus,
  edit: Edit,
  trash: Trash,
  'chevron-right': ChevronRight,
  download: Download,
  upload: Upload,
  search: Search,
  filter: Filter,
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

const variantClasses = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 border-blue-600',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 border-gray-200',
  outline: 'bg-transparent text-gray-700 hover:bg-gray-50 focus:ring-gray-500 border-gray-300',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 border-transparent',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border-red-600',
}

const disabledClasses = 'opacity-50 cursor-not-allowed hover:bg-opacity-100'

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon,
  iconPosition = 'left',
  onClick,
  type = 'button',
  className = '',
}: ButtonProps) {
  const IconComponent = icon ? iconMap[icon] : null
  
  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-lg
    border transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${disabled ? disabledClasses : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ')

  const iconClasses = size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'

  return (
    <button
      type={type}
      className={baseClasses}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && iconPosition === 'left' && IconComponent && (
        <IconComponent className={`${iconClasses} ${children ? 'mr-2' : ''}`} />
      )}
      {children}
      {icon && iconPosition === 'right' && IconComponent && (
        <IconComponent className={`${iconClasses} ${children ? 'ml-2' : ''}`} />
      )}
    </button>
  )
}
