import React from 'react'
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter, 
  CardActions, 
  CardStats, 
  CardStatItem 
} from './Card'
import { Button } from './Button'
import { 
  FolderOpen, 
  FileText, 
  BookOpen, 
  GitBranch, 
  Palette, 
  Users, 
  Edit, 
  Trash2,
  GripVertical
} from 'lucide-react'

export function CardShowcase() {
  const handleCardClick = () => {
    console.log('Card clicked!')
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="text-left">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-4">
          Card System
        </h2>
        <p className="text-gray-600">
          A flexible card system with clickable and non-clickable variants, based on the project cards styling.
        </p>
      </div>

            {/* Basic Cards */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Basic Cards</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Clickable Card */}
          <Card onClick={handleCardClick}>
            <CardHeader>
              <CardTitle>Clickable Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">This card is clickable and has hover effects.</p>
            </CardContent>
          </Card>

          {/* Non-clickable Card */}
          <Card>
            <CardHeader>
              <CardTitle>Static Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">This card is not clickable, has no hover effects, and no shadow.</p>
            </CardContent>
          </Card>

          {/* Card with Actions */}
          <Card>
            <CardHeader
              actions={[
                {
                  icon: <Edit size={16} />,
                  onClick: (e) => {
                    e.stopPropagation()
                    console.log('Edit clicked')
                  },
                  label: 'Edit'
                },
                {
                  icon: <Trash2 size={16} />,
                  onClick: (e) => {
                    e.stopPropagation()
                    console.log('Delete clicked')
                  },
                  label: 'Delete',
                  variant: 'danger'
                }
              ]}
            >
              <CardTitle>Card with Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">This card has action buttons in the top-right corner.</p>
            </CardContent>
          </Card>

          {/* Card with Drag Handle */}
          <Card>
            <CardHeader
              dragHandle={{
                icon: <GripVertical size={16} />,
                onMouseDown: (e) => {
                  e.stopPropagation()
                  console.log('Drag started')
                },
                label: 'Drag to reorder'
              }}
            >
              <CardTitle>Draggable Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">This card has a drag handle for reordering.</p>
            </CardContent>
          </Card>
        </div>
      </div>





      {/* Action Configurations */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Action Configurations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Single Action */}
          <Card>
            <CardHeader
              actions={[
                {
                  icon: <Edit size={16} />,
                  onClick: (e) => {
                    e.stopPropagation()
                    console.log('Edit clicked')
                  },
                  label: 'Edit'
                }
              ]}
            >
              <CardTitle>Single Action</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Card with just one action button.</p>
            </CardContent>
          </Card>

          {/* Multiple Actions */}
          <Card>
            <CardHeader
              actions={[
                {
                  icon: <Edit size={16} />,
                  onClick: (e) => {
                    e.stopPropagation()
                    console.log('Edit clicked')
                  },
                  label: 'Edit'
                },
                {
                  icon: <Trash2 size={16} />,
                  onClick: (e) => {
                    e.stopPropagation()
                    console.log('Delete clicked')
                  },
                  label: 'Delete',
                  variant: 'danger'
                }
              ]}
            >
              <CardTitle>Multiple Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Card with multiple action buttons.</p>
            </CardContent>
          </Card>

          {/* Actions with Variants */}
          <Card>
            <CardHeader
              actions={[
                {
                  icon: <Edit size={16} />,
                  onClick: (e) => {
                    e.stopPropagation()
                    console.log('Edit clicked')
                  },
                  label: 'Edit'
                },
                {
                  icon: <Trash2 size={16} />,
                  onClick: (e) => {
                    e.stopPropagation()
                    console.log('Delete clicked')
                  },
                  label: 'Delete',
                  variant: 'danger'
                },
                {
                  icon: <Users size={16} />,
                  onClick: (e) => {
                    e.stopPropagation()
                    console.log('Users clicked')
                  },
                  label: 'Users',
                  variant: 'warning'
                }
              ]}
            >
              <CardTitle>Action Variants</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Card with different action variants (default, danger, warning).</p>
            </CardContent>
          </Card>

          {/* Card with Actions and Drag Handle */}
          <Card>
            <CardHeader
              actions={[
                {
                  icon: <Edit size={16} />,
                  onClick: (e) => {
                    e.stopPropagation()
                    console.log('Edit clicked')
                  },
                  label: 'Edit'
                },
                {
                  icon: <Trash2 size={16} />,
                  onClick: (e) => {
                    e.stopPropagation()
                    console.log('Delete clicked')
                  },
                  label: 'Delete',
                  variant: 'danger'
                }
              ]}
              dragHandle={{
                icon: <GripVertical size={16} />,
                onMouseDown: (e) => {
                  e.stopPropagation()
                  console.log('Drag started')
                },
                label: 'Drag to reorder'
              }}
            >
              <CardTitle>Complete Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">This card has both actions and a drag handle.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Complex Card Example */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Complex Card Example</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Project-style Card */}
          <Card onClick={handleCardClick}>
            <CardHeader
              actions={[
                {
                  icon: <Edit size={16} />,
                  onClick: (e) => {
                    e.stopPropagation()
                    console.log('Edit clicked')
                  },
                  label: 'Edit Project'
                },
                {
                  icon: <Trash2 size={16} />,
                  onClick: (e) => {
                    e.stopPropagation()
                    console.log('Delete clicked')
                  },
                  label: 'Delete Project',
                  variant: 'danger'
                }
              ]}
              dragHandle={{
                icon: <GripVertical size={16} />,
                onMouseDown: (e) => {
                  e.stopPropagation()
                  console.log('Drag started')
                },
                label: 'Drag to reorder'
              }}
            >
              <CardTitle>Project Alpha</CardTitle>
            </CardHeader>
            
            <CardContent>
              <CardStats>
                <CardStatItem icon={<FileText size={16} />} label="Notes" value={12} />
                <CardStatItem icon={<BookOpen size={16} />} label="Stories" value={8} />
                <CardStatItem icon={<GitBranch size={16} />} label="Journeys" value={3} />
                <CardStatItem icon={<Palette size={16} />} label="Designs" value={5} />
              </CardStats>
            </CardContent>
            
            <CardFooter>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>15 Stakeholders</span>
              </div>
            </CardFooter>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Information Panel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FolderOpen size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Active Projects</p>
                    <p className="text-sm text-gray-600">Currently managing 5 projects</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Team Members</p>
                    <p className="text-sm text-gray-600">12 active team members</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Usage Examples */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Usage Examples</h3>
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Usage</h4>
          <div className="space-y-4">
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Clickable Card:</h5>
              <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">
{`<Card onClick={handleClick}>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
</Card>`}
              </pre>
            </div>
            
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Non-clickable Card:</h5>
              <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">
{`<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
</Card>`}
              </pre>
            </div>
            
            <div>
              <h5 className="font-medium text-gray-900 mb-2">With Actions:</h5>
              <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">
{`<Card>
  <CardHeader
    actions={[
      {
        icon: <Edit size={16} />,
        onClick: (e) => {
          e.stopPropagation()
          handleEdit()
        },
        label: 'Edit'
      },
      {
        icon: <Trash2 size={16} />,
        onClick: (e) => {
          e.stopPropagation()
          handleDelete()
        },
        label: 'Delete',
        variant: 'danger'
      }
    ]}
  >
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Card with action buttons in top-right corner</p>
  </CardContent>
</Card>`}
              </pre>
            </div>
            
            <div>
              <h5 className="font-medium text-gray-900 mb-2">With Drag Handle:</h5>
              <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">
{`<Card>
  <CardHeader
    dragHandle={{
      icon: <GripVertical size={16} />,
      onMouseDown: (e) => {
        e.stopPropagation()
        handleDragStart()
      },
      label: 'Drag to reorder'
    }}
  >
    <CardTitle>Draggable Card</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Card with drag handle for reordering</p>
  </CardContent>
</Card>`}
              </pre>
            </div>
            
            <div>
              <h5 className="font-medium text-gray-900 mb-2">With Actions and Drag Handle:</h5>
              <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">
{`<Card>
  <CardHeader
    actions={[
      {
        icon: <Edit size={16} />,
        onClick: (e) => {
          e.stopPropagation()
          handleEdit()
        },
        label: 'Edit'
      }
    ]}
    dragHandle={{
      icon: <GripVertical size={16} />,
      onMouseDown: (e) => {
        e.stopPropagation()
        handleDragStart()
      },
      label: 'Drag to reorder'
    }}
  >
    <CardTitle>Complete Card</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Card with both actions and drag handle</p>
  </CardContent>
</Card>`}
              </pre>
            </div>
            
            <div>
              <h5 className="font-medium text-gray-900 mb-2">With Custom Styling:</h5>
              <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">
{`<Card 
  variant="elevated" 
  size="lg" 
  className="bg-gradient-to-br from-blue-50 to-indigo-50"
>
  <CardContent>
    <p>Custom styled card</p>
  </CardContent>
</Card>`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
