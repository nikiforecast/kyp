import React, { useState } from 'react'
import { Users, Building2, Star, Edit, Trash2 } from 'lucide-react'
import { DataTable, Column } from './DataTable'
import { Button } from './Button'

// Sample data types
interface SampleUser {
  id: string
  name: string
  email: string
  role: string
  status: 'active' | 'inactive'
  department: string
}

interface SampleProject {
  id: string
  name: string
  status: 'planning' | 'in-progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  assignee: string
  dueDate: string
}

export function DataTableShowcase() {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])

  // Sample data
  const sampleUsers: SampleUser[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Developer', status: 'active', department: 'Engineering' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Designer', status: 'active', department: 'Design' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'Manager', status: 'inactive', department: 'Management' },
    { id: '4', name: 'Alice Brown', email: 'alice@example.com', role: 'Developer', status: 'active', department: 'Engineering' },
    { id: '5', name: 'Charlie Wilson', email: 'charlie@example.com', role: 'Designer', status: 'active', department: 'Design' },
  ]

  const sampleProjects: SampleProject[] = [
    { id: '1', name: 'Website Redesign', status: 'in-progress', priority: 'high', assignee: 'Jane Smith', dueDate: '2024-02-15' },
    { id: '2', name: 'Mobile App', status: 'planning', priority: 'medium', assignee: 'John Doe', dueDate: '2024-03-01' },
    { id: '3', name: 'Database Migration', status: 'completed', priority: 'low', assignee: 'Bob Johnson', dueDate: '2024-01-30' },
    { id: '4', name: 'API Development', status: 'in-progress', priority: 'high', assignee: 'Alice Brown', dueDate: '2024-02-28' },
  ]

  // Column definitions for users table
  const userColumns: Column<SampleUser>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Users size={16} className="text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{user.name}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (user) => (
        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
          {user.role}
        </span>
      )
    },
    {
      key: 'department',
      header: 'Department',
      sortable: true,
      render: (user) => (
        <span className="text-sm text-gray-900">{user.department}</span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (user) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          user.status === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {user.status}
        </span>
      )
    }
  ]

  // Column definitions for projects table
  const projectColumns: Column<SampleProject>[] = [
    {
      key: 'name',
      header: 'Project Name',
      sortable: true,
      render: (project) => (
        <div className="text-sm font-medium text-gray-900">{project.name}</div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (project) => {
        const statusColors = {
          'planning': 'bg-yellow-100 text-yellow-800',
          'in-progress': 'bg-blue-100 text-blue-800',
          'completed': 'bg-green-100 text-green-800'
        }
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[project.status]}`}>
            {project.status.replace('-', ' ')}
          </span>
        )
      }
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (project) => {
        const priorityColors = {
          'low': 'bg-gray-100 text-gray-800',
          'medium': 'bg-yellow-100 text-yellow-800',
          'high': 'bg-red-100 text-red-800'
        }
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${priorityColors[project.priority]}`}>
            {project.priority}
          </span>
        )
      }
    },
    {
      key: 'assignee',
      header: 'Assignee',
      sortable: true,
      render: (project) => (
        <span className="text-sm text-gray-900">{project.assignee}</span>
      )
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      render: (project) => (
        <span className="text-sm text-gray-500">{project.dueDate}</span>
      )
    }
  ]

  const handleUserEdit = (user: SampleUser) => {
    console.log('Edit user:', user)
  }

  const handleUserDelete = (user: SampleUser) => {
    console.log('Delete user:', user)
  }

  const handleProjectEdit = (project: SampleProject) => {
    console.log('Edit project:', project)
  }

  const handleProjectDelete = (project: SampleProject) => {
    console.log('Delete project:', project)
  }

  const handleBulkDeleteUsers = (userIds: string[]) => {
    console.log('Bulk delete users:', userIds)
    setSelectedUsers([])
  }

  const handleBulkDeleteProjects = (projectIds: string[]) => {
    console.log('Bulk delete projects:', projectIds)
    setSelectedProjects([])
  }

  const handleUserRowClick = (user: SampleUser) => {
    console.log('User row clicked:', user)
  }

  const handleProjectRowClick = (project: SampleProject) => {
    console.log('Project row clicked:', project)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Data Table Component</h2>
        <p className="text-gray-600">A flexible, reusable table component with sorting, selection, and action capabilities.</p>
      </div>

      {/* Basic Table Example */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-800">Basic Table (No Selection)</h3>
        <DataTable
          data={sampleProjects}
          columns={projectColumns}
          sortableFields={['name', 'status', 'priority', 'assignee', 'dueDate']}
          getItemId={(project) => project.id}
          onRowClick={handleProjectRowClick}
          onEdit={handleProjectEdit}
          onDelete={handleProjectDelete}
          emptyStateIcon={Building2}
          emptyStateMessage="No projects available"
        />
      </div>

      {/* Selectable Table Example */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-800">Selectable Table with Bulk Actions</h3>
        <DataTable
          data={sampleUsers}
          columns={userColumns}
          sortableFields={['name', 'role', 'department', 'status']}
          getItemId={(user) => user.id}
          getItemName={(user) => 'user'}
          selectable={true}
          selectedItems={selectedUsers}
          onSelectionChange={setSelectedUsers}
          onRowClick={handleUserRowClick}
          onEdit={handleUserEdit}
          onDelete={handleUserDelete}
          onBulkDelete={handleBulkDeleteUsers}
          emptyStateIcon={Users}
          emptyStateMessage="No users available"
          bulkActions={
            <Button
              variant="outline"
              icon={Star}
              onClick={() => console.log('Custom bulk action')}
            >
              Custom Action
            </Button>
          }
        />
      </div>

      {/* Table Features */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-800">Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Core Functionality</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Sortable columns with visual indicators</li>
              <li>• Row selection with checkboxes</li>
              <li>• Shift-click for range selection</li>
              <li>• Bulk actions and delete</li>
              <li>• Row click handling</li>
              <li>• Edit and delete actions</li>
            </ul>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">Customization</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Flexible column definitions</li>
              <li>• Custom cell rendering</li>
              <li>• Configurable sortable fields</li>
              <li>• Custom empty state</li>
              <li>• Bulk action customization</li>
              <li>• Responsive design</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Usage Example */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-800">Usage Example</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <pre className="text-sm text-gray-700 overflow-x-auto">
{`// Define columns
const columns: Column<User>[] = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    render: (user) => <span>{user.name}</span>
  }
]

// Use the table
<DataTable
  data={users}
  columns={columns}
  sortableFields={['name']}
  getItemId={(user) => user.id}
  selectable={true}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>`}
          </pre>
        </div>
      </div>
    </div>
  )
}
