import React from 'react'
import { LucideIcon } from 'lucide-react'

export interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'small' | 'default'
  disabled?: boolean
  loading?: boolean
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  onClick?: () => void
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

export function Button({
  children,
  variant = 'primary',
  size = 'default',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  rounded = 'lg',
  shadow = 'md',
  onClick,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-300 ease-out transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
  
  const sizeClasses = {
    small: 'px-3 py-2 text-sm h-8',
    default: 'px-5 py-2.5 text-base h-10'
  }
  
  const roundedClasses = {
    sm: 'rounded-md',
    md: 'rounded-lg',
    lg: 'rounded-lg',
    xl: 'rounded-2xl',
    full: 'rounded-full'
  }
  
  const shadowClasses = {
    none: '',
    sm: 'hover:shadow-sm',
    md: 'hover:shadow-md',
    lg: 'hover:shadow-lg',
    xl: 'hover:shadow-xl'
  }
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:shadow-lg focus:ring-blue-500 border border-blue-500/20',
    secondary: 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white hover:shadow-lg focus:ring-teal-500 border border-teal-500/20',
    outline: 'bg-transparent border-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-600 focus:ring-blue-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-500'
  }
  
  const widthClass = fullWidth ? 'w-full' : ''
  
  const classes = [
    baseClasses,
    sizeClasses[size],
    roundedClasses[rounded],
    shadowClasses[shadow],
    variantClasses[variant],
    widthClass,
    className
  ].filter(Boolean).join(' ')
  
  const iconSize = {
    small: 14,
    default: 20
  }
  
  const renderIcon = () => {
    if (!Icon) return null
    return <Icon size={iconSize[size]} className="flex-shrink-0" />
  }
  
  const renderContent = () => {
    if (loading) {
      return (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          Loading...
        </>
      )
    }
    
    if (Icon && iconPosition === 'left') {
      return (
        <>
          {renderIcon()}
          <span className="ml-2">{children}</span>
        </>
      )
    }
    
    if (Icon && iconPosition === 'right') {
      return (
        <>
          <span className="mr-2">{children}</span>
          {renderIcon()}
        </>
      )
    }
    
    return children
  }
  
  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {renderContent()}
    </button>
  )
}

// Specialized button variants
export function FloatingButton({ children, ...props }: Omit<ButtonProps, 'variant' | 'shadow'>) {
  return (
    <Button
      variant="primary"
      shadow="lg"
      rounded="lg"
      className="fixed bottom-6 right-6 z-50 shadow-2xl hover:shadow-3xl hover:scale-110"
      {...props}
    >
      {children}
    </Button>
  )
}

export function IconButton({ 
  icon: Icon, 
  size = 'default', 
  variant = 'ghost',
  ...props 
}: Omit<ButtonProps, 'children' | 'icon' | 'iconPosition'> & { icon: LucideIcon }) {
  const iconSizes = {
    small: 'p-1.5',
    default: 'p-2.5'
  }
  
  return (
    <Button
      data-component="KYP-button"
      variant={variant}
      size={size}
      className={`${iconSizes[size]} min-w-0`}
      {...props}
    >
      <Icon size={size === 'small' ? 16 : 20} />
    </Button>
  )
}

export function TextButton({ children, ...props }: Omit<ButtonProps, 'variant'>) {
  return (
    <Button
      variant="ghost"
      className="hover:bg-transparent hover:text-blue-600 underline-offset-4 hover:underline"
      {...props}
    >
      {children}
    </Button>
  )
}

export function GroupButton({ 
  children, 
  isActive = false,
  ...props 
}: ButtonProps & { isActive?: boolean }) {
  return (
    <Button
      variant={isActive ? 'primary' : 'ghost'}
      className={`${isActive ? '' : 'hover:bg-gray-100'} border-r border-gray-200 last:border-r-0 rounded-none first:rounded-l-lg last:rounded-r-lg`}
      {...props}
    >
      {children}
    </Button>
  )
}

export function SplitButton({ 
  primaryText, 
  secondaryText, 
  onPrimaryClick, 
  onSecondaryClick,
  variant = 'primary',
  ...props 
}: Omit<ButtonProps, 'children' | 'onClick'> & { 
  primaryText: string
  secondaryText: string
  onPrimaryClick: () => void
  onSecondaryClick: () => void
}) {
  return (
    <div className="inline-flex rounded-lg overflow-hidden shadow-md">
      <Button
        variant={variant}
        onClick={onPrimaryClick}
        className="rounded-r-none border-r-0"
        {...props}
      >
        {primaryText}
      </Button>
      <Button
        variant="ghost"
        onClick={onSecondaryClick}
        className="rounded-l-none border-l-0 bg-gray-50 hover:bg-gray-100"
        {...props}
      >
        {secondaryText}
      </Button>
    </div>
  )
}
