import React from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'

export interface BlockNoteEditorProps {
  initialContent?: any
  editable?: boolean
  onChange?: (content: any) => void
  onHtmlChange?: (html: string) => void
  className?: string
  placeholder?: string
}

export function BlockNoteEditor({
  initialContent,
  editable = true,
  onChange,
  onHtmlChange,
  className = '',
  placeholder = 'Start writing...'
}: BlockNoteEditorProps) {
  // Normalize initial content to a non-empty array of blocks
  const defaultBlocks = React.useMemo(() => ([{
    type: 'paragraph',
    content: [{ type: 'text', text: '' }]
  }]), [])

  const normalizedInitial = React.useMemo(() => {
    if (Array.isArray(initialContent) && initialContent.length > 0) return initialContent
    return defaultBlocks
  }, [initialContent, defaultBlocks])

  const editor = useCreateBlockNote({
    initialContent: normalizedInitial
  })

  const wrapperRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!onChange && !onHtmlChange) return
    // Subscribe to document changes
    const handler = () => {
      try {
        if (onChange) {
          const blocks = (editor as any)?.topLevelBlocks ?? (editor as any)?.document ?? null
          onChange(blocks)
        }
        if (onHtmlChange && wrapperRef.current) {
          const pm = wrapperRef.current.querySelector('.ProseMirror') as HTMLElement | null
          if (pm) onHtmlChange(pm.innerHTML)
        }
      } catch {
        // no-op
      }
    }
    ;(editor as any)?.onChange?.(handler)
    return () => {
      try { (editor as any)?.offChange?.(handler) } catch { /* no-op */ }
    }
  }, [editor, onChange, onHtmlChange])

  const uiSansStack = 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji"'

  return (
    <div
      ref={wrapperRef}
      className={`font-sans ${className}`}
      style={{
        ['--bn-font-family' as any]: uiSansStack,
        fontFamily: uiSansStack
      }}
    >
      <BlockNoteView editor={editor} editable={editable} />
    </div>
  )
}

export default BlockNoteEditor
