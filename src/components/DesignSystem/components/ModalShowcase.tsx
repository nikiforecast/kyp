import React, { useState } from 'react'
import { Plus, Trash2, CheckCircle } from 'lucide-react'
import { Button, IconButton } from './Button'
import { Modal, ConfirmModal, FormModal } from './Modal'

export function ModalShowcase() {
  const [showBasicModal, setShowBasicModal] = useState(false)
  const [showLargeModal, setShowLargeModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showFormData, setShowFormData] = useState({ name: '', email: '' })

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget as HTMLFormElement)
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string
    }
    setShowFormData(data)
    setShowFormModal(false)
    // In a real app, you would submit this data
    console.log('Form submitted:', data)
  }

  const handleConfirmDelete = () => {
    console.log('Delete confirmed!')
    setShowConfirmModal(false)
  }



  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Modal Components</h2>
        <p className="text-gray-600">Reusable modal components for consistent user interactions across the platform.</p>
      </div>

      {/* Basic Modal Examples */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-800">Basic Modals</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={() => setShowBasicModal(true)}
            icon={Plus}
          >
            Basic Modal
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowLargeModal(true)}
            icon={Plus}
          >
            Large Modal
          </Button>
        </div>
      </div>

      {/* Specialized Modal Examples */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-800">Specialized Modals</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={() => setShowFormModal(true)}
            icon={Plus}
          >
            Form Modal
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowConfirmModal(true)}
            icon={Trash2}
          >
            Confirm Modal
          </Button>
        </div>
      </div>

      {/* Form Data Display */}
      {showFormData.name && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h4 className="font-medium text-green-800">Form Submitted Successfully!</h4>
          </div>
          <div className="text-sm text-green-700">
            <p><strong>Name:</strong> {showFormData.name}</p>
            <p><strong>Email:</strong> {showFormData.email}</p>
          </div>
        </div>
      )}

      {/* Basic Modal */}
      <Modal
        isOpen={showBasicModal}
        onClose={() => setShowBasicModal(false)}
        title="Basic Modal Example"
        size="md"
        footerContent={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowBasicModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowBasicModal(false)}
            >
              Confirm
            </Button>
          </div>
        }
      >
        <div className="p-6">
          <p className="text-gray-700 mb-4">
            This is a basic modal with a title, close button, and content area. 
            It automatically handles overlay clicks, escape key presses, and body scroll locking.
          </p>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-2">Features:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Responsive design with proper sizing</li>
              <li>• Keyboard navigation support</li>
              <li>• Overlay click to close</li>
              <li>• Escape key to close</li>
              <li>• Body scroll locking</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* Large Modal */}
      <Modal
        isOpen={showLargeModal}
        onClose={() => setShowLargeModal(false)}
        title="Large Modal Example"
        size="xl"
      >
        <div className="p-6">
          <p className="text-gray-700 mb-4">
            This modal demonstrates the 'xl' size variant, which is perfect for forms, 
            detailed content, or complex interactions that need more space.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Left Column</h4>
              <p className="text-sm text-blue-700">
                This column shows how the modal can accommodate complex layouts 
                with multiple columns and sections.
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">Right Column</h4>
              <p className="text-sm text-green-700">
                The xl size provides enough space for side-by-side content 
                while maintaining readability.
              </p>
            </div>
          </div>
        </div>
      </Modal>







      {/* Form Modal */}
      <FormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title="Form Modal Example"
        onSubmit={handleFormSubmit}
        submitText="Submit Form"
        cancelText="Cancel"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your name"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your email"
            />
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Form Modal Benefits:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Built-in form handling</li>
              <li>• Consistent button layout</li>
              <li>• Loading state support</li>
              <li>• Form validation ready</li>
            </ul>
          </div>
        </div>
      </FormModal>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Delete Item"
        message="Are you sure you want to delete this item? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        variant="danger"
      />


    </div>
  )
}
