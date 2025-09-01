# BlockNote Editor Integration

## Overview
BlockNote is a free, open-source block-based rich text editor that provides a powerful alternative to traditional rich text editors. It's built with TypeScript and React, offering a modern editing experience with real-time collaboration capabilities.

## Installation
The required packages have been installed:
```bash
npm install @blocknote/core @blocknote/react
```

## Components

### 1. BlockNoteEditor
The main editor component that can be used throughout the application.

**Props:**
- `initialContent?: any` - Initial content to load in the editor
- `editable?: boolean` - Whether the editor is editable (default: true)
- `onChange?: (content: any) => void` - Callback when content changes
- `className?: string` - Additional CSS classes
- `placeholder?: string` - Placeholder text when editor is empty

**Basic Usage:**
```tsx
import { BlockNoteEditor } from './DesignSystem'

function MyComponent() {
  const [content, setContent] = useState(null)

  return (
    <BlockNoteEditor
      onChange={setContent}
      placeholder="Start writing..."
      className="min-h-[300px]"
    />
  )
}
```

### 2. BlockNoteShowcase
A demonstration component showing the editor's capabilities.

### 3. BlockNoteUsageExample
A practical example of how to integrate the editor in a real application.

## Features

### Core Features
- **Block-based editing** - Content is organized into blocks (paragraphs, headings, lists, etc.)
- **Rich text formatting** - Bold, italic, underline, strikethrough
- **Headings** - Multiple heading levels (H1, H2, H3, etc.)
- **Lists** - Ordered and unordered lists with nesting
- **Code blocks** - Syntax highlighting for code
- **Tables** - Create and edit tables
- **Images** - Insert and manage images
- **Real-time collaboration** - Multiple users can edit simultaneously

### Advanced Features
- **Custom blocks** - Create your own block types
- **Slash commands** - Quick access to block types and formatting
- **Keyboard shortcuts** - Efficient editing with keyboard
- **Drag and drop** - Reorder blocks by dragging
- **Markdown support** - Import/export markdown
- **HTML export** - Convert to HTML for display

## Content Storage

### Content Format
BlockNote stores content as a JSON structure representing blocks:

```json
[
  {
    "id": "block1",
    "type": "paragraph",
    "content": [
      {
        "type": "text",
        "text": "Hello, ",
        "styles": {}
      },
      {
        "type": "text",
        "text": "world!",
        "styles": { "bold": true }
      }
    ]
  },
  {
    "id": "block2",
    "type": "heading",
    "content": [
      {
        "type": "text",
        "text": "Section Title",
        "styles": {}
      }
    ],
    "props": { "level": 2 }
  }
]
```

### Saving Content
```tsx
const handleSave = (content) => {
  // Save to database
  const contentJson = JSON.stringify(content)
  // Store in your database
  saveToDatabase(contentJson)
}
```

### Loading Content
```tsx
const [content, setContent] = useState(null)

useEffect(() => {
  // Load from database
  const savedContent = loadFromDatabase()
  if (savedContent) {
    setContent(JSON.parse(savedContent))
  }
}, [])

return (
  <BlockNoteEditor
    initialContent={content}
    onChange={setContent}
  />
)
```

## Integration Examples

### 1. Note Taking App
```tsx
function NoteEditor({ noteId, initialContent }) {
  const [content, setContent] = useState(initialContent)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await saveNote(noteId, content)
      toast.success('Note saved successfully!')
    } catch (error) {
      toast.error('Failed to save note')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <BlockNoteEditor
        initialContent={content}
        onChange={setContent}
        placeholder="Write your note here..."
      />
      <button onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Note'}
      </button>
    </div>
  )
}
```

### 2. Project Description Editor
```tsx
function ProjectDescriptionEditor({ project, onUpdate }) {
  const [description, setDescription] = useState(project.description)

  const handleUpdate = (newDescription) => {
    setDescription(newDescription)
    onUpdate({ ...project, description: newDescription })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Project Description</h3>
      <BlockNoteEditor
        initialContent={description}
        onChange={handleUpdate}
        placeholder="Describe your project..."
        className="min-h-[400px]"
      />
    </div>
  )
}
```

### 3. Read-Only Display
```tsx
function NoteViewer({ note }) {
  return (
    <div>
      <h2>{note.title}</h2>
      <BlockNoteEditor
        initialContent={note.content}
        editable={false}
        className="bg-gray-50 p-4 rounded-lg"
      />
    </div>
  )
}
```

## Styling

### Custom CSS Classes
```tsx
<BlockNoteEditor
  className="my-custom-editor border-2 border-blue-200 rounded-lg"
/>
```

### Global Styles
BlockNote includes its own CSS that you can customize:
```css
/* Override default styles */
.blocknote-editor {
  --bn-color-primary: #3b82f6;
  --bn-color-primary-hover: #2563eb;
  --bn-border-radius: 8px;
}
```

## Best Practices

### 1. Content Management
- Always validate content before saving
- Implement auto-save functionality
- Handle content versioning if needed
- Provide fallback for empty content

### 2. Performance
- Debounce onChange callbacks for large content
- Lazy load editor for better initial page load
- Consider content size limits

### 3. User Experience
- Provide clear save indicators
- Handle loading states gracefully
- Offer keyboard shortcuts help
- Implement undo/redo functionality

### 4. Accessibility
- Ensure proper ARIA labels
- Test with screen readers
- Provide keyboard navigation alternatives

## Troubleshooting

### Common Issues

1. **Content not loading**: Check if `initialContent` is properly formatted
2. **Styling conflicts**: Ensure BlockNote CSS is imported
3. **Performance issues**: Debounce onChange callbacks for large content
4. **Type errors**: Use proper TypeScript types for content

### Debug Mode
Enable debug logging:
```tsx
const editor = useBlockNote({
  onEditorContentChange: (editor) => {
    console.log('Editor state:', editor)
    console.log('Content:', editor.topLevelBlocks)
  }
})
```

## Resources

- [BlockNote Documentation](https://www.blocknote.dev/)
- [GitHub Repository](https://github.com/TypeCellOS/BlockNote)
- [Examples and Demos](https://www.blocknote.dev/examples)
- [API Reference](https://www.blocknote.dev/api-reference)

## Support

For issues or questions:
- Check the [BlockNote GitHub issues](https://github.com/TypeCellOS/BlockNote/issues)
- Review the [documentation](https://www.blocknote.dev/)
- Join the [Discord community](https://discord.gg/8wM5e5bKjq)
