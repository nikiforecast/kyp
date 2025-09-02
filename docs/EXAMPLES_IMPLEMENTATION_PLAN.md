# Examples Content Type Implementation Plan

## Overview

This document outlines the implementation plan for adding a new content type called 'Examples' to the KYP platform. Examples will allow users to document user journey scenarios with actors, goals, actions, errors, and outcomes.

## Requirements

### Core Fields
- **Actor**: User can select from added User Roles or create their own custom actor
- **Goal**: String describing what the actor wants to achieve
- **Entry Point**: String describing how the actor enters the system
- **Actions**: Bullet point list or string describing the steps taken
- **Error**: String describing any errors encountered
- **Outcome**: Bullet point list or string describing the final result

### Relationships
- **Project ID**: Each example must be associated with a Project
- **User Roles**: Optional linking to predefined user roles for better organization

### Audit Data
- **User Created**: Reference to the user who created the example
- **Time and Date of Creation**: Timestamp when the example was created
- **Last Updated**: Timestamp when the example was last modified

## Database Implementation

### Tables Created

#### 1. `examples` Table
```sql
CREATE TABLE examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor text NOT NULL,
  goal text NOT NULL,
  entry_point text NOT NULL,
  actions text NOT NULL,
  error text NOT NULL,
  outcome text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 2. `example_user_roles` Junction Table (Optional)
```sql
CREATE TABLE example_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  example_id uuid NOT NULL REFERENCES examples(id) ON DELETE CASCADE,
  user_role_id uuid NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(example_id, user_role_id)
);
```

### Security Features
- **Row Level Security (RLS)**: Enabled on both tables
- **Workspace-based Access Control**: Users can only access examples from projects in workspaces they belong to
- **User Ownership**: Users can only modify examples they created
- **Project Association**: Examples are tied to specific projects for proper isolation

### Performance Optimizations
- **Indexes**: Created on foreign keys, commonly queried fields, and composite queries
- **Composite Indexes**: For efficient project-based queries with sorting
- **Automatic Timestamps**: Trigger-based `updated_at` field management

## Frontend Implementation

### Components to Create

#### 1. ExamplesSection
- Main container component for listing examples
- Handles filtering, sorting, and pagination
- Integrates with project dashboard

#### 2. ExampleCard
- Compact display of example information
- Shows actor, goal, and key details
- Links to detailed view

#### 3. ExampleForm
- Create/edit form for examples
- Actor selector with role suggestions
- Rich text areas for actions and outcomes
- Validation and error handling

#### 4. ExampleDetail
- Full view of an example
- Editable fields for modification
- Delete functionality
- Related examples suggestions

#### 5. ActorSelector
- Dropdown for selecting existing user roles
- Option to create custom actor names
- Integration with user_roles table

### Integration Points

#### 1. Project Dashboard
- Add Examples section to project overview
- Include examples count in project statistics
- Link to examples from project navigation

#### 2. Navigation
- Add Examples to main navigation menu
- Include in project-specific navigation
- Add to breadcrumb navigation

#### 3. Search & Filtering
- Include examples in global search
- Add actor-based filtering
- Project-based filtering
- Date-based sorting

#### 4. Theme System
- Allow examples to be tagged with themes
- Create `theme_examples` junction table
- Integrate with existing theme management

## API Endpoints

### RESTful Endpoints
```
GET    /api/examples                    # List examples with filtering
POST   /api/examples                    # Create new example
GET    /api/examples/:id                # Get specific example
PUT    /api/examples/:id                # Update example
DELETE /api/examples/:id                # Delete example
GET    /api/projects/:id/examples       # Get examples for specific project
```

### GraphQL Queries (if applicable)
```graphql
query GetExamples($projectId: UUID, $actor: String) {
  examples(projectId: $projectId, actor: $actor) {
    id
    actor
    goal
    entryPoint
    actions
    error
    outcome
    createdAt
    createdBy {
      id
      email
    }
  }
}
```

## Data Flow

### Creating an Example
1. User navigates to project dashboard
2. Clicks "Add Example" button
3. Fills out example form
4. System validates required fields
5. Example is saved to database
6. User is redirected to examples list

### Editing an Example
1. User clicks on example card or edit button
2. Form is populated with existing data
3. User makes modifications
4. Changes are validated and saved
5. Updated example is displayed

### Deleting an Example
1. User clicks delete button
2. Confirmation dialog is shown
3. Upon confirmation, example is removed
4. User is returned to examples list

## Migration Strategy

### Phase 1: Database Setup
1. Run the migration SQL to create tables
2. Verify RLS policies are working correctly
3. Test basic CRUD operations

### Phase 2: Backend API
1. Create database service functions
2. Implement API endpoints
3. Add validation and error handling
4. Write unit tests

### Phase 3: Frontend Components
1. Create basic components
2. Implement form handling
3. Add integration with existing UI
4. Style and polish components

### Phase 4: Testing & Deployment
1. End-to-end testing
2. User acceptance testing
3. Performance testing
4. Production deployment

## Future Enhancements

### Potential Features
- **Example Templates**: Predefined example structures
- **Example Sharing**: Share examples across projects
- **Example Analytics**: Track usage and effectiveness
- **Example Versioning**: Track changes over time
- **Example Export**: Export to various formats (PDF, CSV)
- **Example Import**: Bulk import from external sources

### Integration Opportunities
- **User Journey Mapping**: Link examples to user journey nodes
- **Stakeholder Management**: Associate examples with specific stakeholders
- **Research Notes**: Link examples to relevant research
- **Task Management**: Create tasks from example actions
- **Asset Management**: Link examples to relevant assets

## Success Metrics

### Technical Metrics
- Database query performance
- API response times
- Frontend component load times
- Error rates and user feedback

### User Experience Metrics
- Examples creation rate
- Examples usage frequency
- User engagement with examples
- Feature adoption rate

## Risk Assessment

### Technical Risks
- **Performance**: Large numbers of examples could impact query performance
- **Data Integrity**: Complex relationships between examples and other entities
- **Security**: Ensuring proper access control across workspaces

### Mitigation Strategies
- **Performance**: Implement pagination and efficient indexing
- **Data Integrity**: Use database constraints and validation
- **Security**: Thorough testing of RLS policies and access controls

## Conclusion

The Examples content type will provide users with a powerful way to document and share user journey scenarios. The implementation follows established patterns in the KYP platform and integrates seamlessly with existing functionality while maintaining security and performance standards.

The phased approach ensures a smooth rollout with minimal disruption to existing users while providing immediate value through the new content type.
