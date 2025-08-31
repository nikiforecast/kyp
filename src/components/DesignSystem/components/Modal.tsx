import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button, IconButton } from './Button'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  className?: string
  headerContent?: React.ReactNode
  footerContent?: React.ReactNode
  maxHeight?: string
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  headerContent,
  footerContent,
  maxHeight = '90vh'
}: ModalProps) {
  useEffect(() => {
    if (!closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
      document.body.classList.add('modal-open')
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
      document.body.classList.remove('modal-open')
    }
  }, [isOpen, onClose, closeOnEscape])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-7xl'
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div 
        className={`bg-white rounded-xl w-full ${sizeClasses[size]} overflow-hidden flex flex-col ${className}`}
        style={{ maxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || headerContent || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 flex-shrink-0">
            {headerContent || (
              title && (
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              )
            )}
            {showCloseButton && (
              <IconButton
                icon={X}
                variant="ghost"
                onClick={onClose}
                className="text-gray-500 hover:bg-gray-100"
              />
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footerContent && (
          <div className="px-6 py-3 border-t border-gray-200 flex-shrink-0">
            {footerContent}
          </div>
        )}
      </div>
    </div>
  )
}

// Specialized modal variants
export function ConfirmModal({
  isOpen,
  onClose,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'danger',
  loading = false
}: {
  isOpen: boolean
  onClose: () => void
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}) {


  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
              footerContent={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              variant={variant === 'danger' ? 'primary' : variant === 'warning' ? 'secondary' : 'primary'}
              onClick={onConfirm}
              disabled={loading}
              loading={loading}
            >
              {confirmText}
            </Button>
          </div>
        }
    >
      <div className="p-6">
        <p className="text-gray-700">{message}</p>
      </div>
    </Modal>
  )
}

export function FormModal({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitText = 'Save',
  cancelText = 'Cancel',
  loading = false,
  size = 'md'
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void
  submitText?: string
  cancelText?: string
  loading?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
              footerContent={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              loading={loading}
            >
              {submitText}
            </Button>
          </div>
        }
    >
      <form onSubmit={onSubmit} className="p-6">
        {children}
      </form>
    </Modal>
  )
}
