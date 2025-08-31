import React from 'react'
import { cn } from '../../../utils/cn'

export interface CardAction {
  icon: React.ReactNode
  onClick: (e: React.MouseEvent) => void
  label: string
  variant?: 'default' | 'danger' | 'warning'
  disabled?: boolean
}

export interface CardProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  variant?: 'default' | 'elevated' | 'outlined'
  size?: 'sm' | 'md' | 'lg'
}

export function Card({
  children,
  onClick,
  className = '',
  disabled = false,
  variant = 'default',
  size = 'md'
}: CardProps) {
  const isClickable = !!onClick && !disabled
  
  const baseClasses = 'bg-white rounded-xl border border-gray-200 transition-all duration-300 ease-out'
  
  const variantClasses = {
    default: isClickable ? 'shadow-sm' : '',
    elevated: 'shadow-md',
    outlined: 'shadow-none'
  }
  
  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }
  
  const clickableClasses = isClickable 
    ? 'hover:shadow-md hover:scale-[1.005] cursor-pointer' 
    : ''
  
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : ''
  
  const classes = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    clickableClasses,
    disabledClasses,
    className
  )
  
  const handleClick = () => {
    if (isClickable && onClick) {
      onClick()
    }
  }
  
  return (
    <div 
      className={classes}
      onClick={handleClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      {children}
    </div>
  )
}

// Card Header component
export function CardHeader({
  children,
  className = '',
  actions,
  dragHandle,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  actions?: CardAction[]
  dragHandle?: {
    icon: React.ReactNode
    onMouseDown?: (e: React.MouseEvent) => void
    onTouchStart?: (e: React.TouchEvent) => void
    label?: string
  }
}) {
  const renderActions = () => {
    if (!actions || actions.length === 0) return null

    return (
      <CardActions>
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation()
              action.onClick(e)
            }}
            disabled={action.disabled}
            className={cn(
              'p-2 rounded-lg transition-colors duration-200',
              'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              action.variant === 'danger' && 'hover:text-red-600 hover:bg-red-50',
              action.variant === 'warning' && 'hover:text-yellow-600 hover:bg-yellow-50'
            )}
            title={action.label}
          >
            {action.icon}
          </button>
        ))}
      </CardActions>
    )
  }

  const renderDragHandle = () => {
    if (!dragHandle) return null

    return (
      <div
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200 cursor-grab active:cursor-grabbing"
        onMouseDown={dragHandle.onMouseDown}
        onTouchStart={dragHandle.onTouchStart}
        title={dragHandle.label || 'Drag to reorder'}
      >
        {dragHandle.icon}
      </div>
    )
  }

  return (
    <div 
      className={cn('flex items-start justify-between mb-4', className)}
      {...props}
    >
      <div className="flex-1">
        {children}
      </div>
      <div className="flex items-center gap-1">
        {renderActions()}
        {renderDragHandle()}
      </div>
    </div>
  )
}

// Card Title component
export function CardTitle({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 
      className={cn('text-lg font-semibold text-gray-900', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

// Card Content component
export function CardContent({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn('', className)}
      {...props}
    >
      {children}
    </div>
  )
}

// Card Footer component
export function CardFooter({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn('mt-4 pt-4 border-t border-gray-100', className)}
      {...props}
    >
      {children}
    </div>
  )
}

// Card Actions component for buttons/controls
export function CardActions({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn('flex items-center gap-2', className)}
      {...props}
    >
      {children}
    </div>
  )
}

// Card Stats component for displaying metrics
export function CardStats({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn('grid grid-cols-2 gap-4 text-sm', className)}
      {...props}
    >
      {children}
    </div>
  )
}

// Card Stat Item component
export function CardStatItem({
  icon,
  label,
  value,
  className = '',
  ...props
}: {
  icon?: React.ReactNode
  label: string
  value: string | number
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn('flex items-center gap-2 text-gray-600', className)}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{value} {label}</span>
    </div>
  )
}
