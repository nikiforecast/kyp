// Converters between HTML and BlockNote blocks.
// These preserve BlockNote structure including headings, lists, and other block types.

export type BlockNoteBlock = {
  id?: string
  type: 'paragraph' | 'heading' | 'bulletListItem' | 'numberedListItem' | 'checkListItem'
  content: Array<{ type: 'text'; text: string; styles?: Record<string, boolean> }>
  props?: Record<string, any>
}

export function htmlToBlockNoteBlocks(html: string | null | undefined): BlockNoteBlock[] {
  if (!html) return []

  // Extract text and split by block-level tags to create proper BlockNote blocks
  const container = document.createElement('div')
  container.innerHTML = html

  const blocks: BlockNoteBlock[] = []

  // Process each block element
  const blockSelectors = 'p, li, h1, h2, h3, h4, h5, h6, div, pre, ul, ol'
  const nodes = container.querySelectorAll(blockSelectors)
  
  if (nodes.length > 0) {
    nodes.forEach((node) => {
      const text = node.textContent?.trim()
      if (!text) return

      const tagName = node.tagName.toLowerCase()
      
      // Handle headings
      if (tagName.match(/^h[1-6]$/)) {
        const level = parseInt(tagName.charAt(1))
        blocks.push({
          type: 'heading',
          content: [{ type: 'text', text }],
          props: { level }
        })
      }
      // Handle list items
      else if (tagName === 'li') {
        const parent = node.parentElement
        if (parent?.tagName.toLowerCase() === 'ul') {
          blocks.push({
            type: 'bulletListItem',
            content: [{ type: 'text', text }]
          })
        } else if (parent?.tagName.toLowerCase() === 'ol') {
          blocks.push({
            type: 'numberedListItem',
            content: [{ type: 'text', text }]
          })
        } else {
          // Fallback to paragraph
          blocks.push({
            type: 'paragraph',
            content: [{ type: 'text', text }]
          })
        }
      }
      // Handle paragraphs and other block elements
      else {
        blocks.push({
          type: 'paragraph',
          content: [{ type: 'text', text }]
        })
      }
    })
  } else {
    // Fallback to full text content as a single paragraph
    const text = container.textContent?.trim()
    if (text) {
      blocks.push({
        type: 'paragraph',
        content: [{ type: 'text', text }]
      })
    }
  }

  return blocks
}

export function blockNoteBlocksToHtml(blocks: BlockNoteBlock[] | null | undefined): string {
  if (!blocks || blocks.length === 0) return ''
  const safe = (s: string) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  
  return blocks
    .map((block) => {
      const text = (block.content || [])
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('')
      
      if (!text) return ''
      
      switch (block.type) {
        case 'heading':
          const level = block.props?.level || 1
          return `<h${level}>${safe(text)}</h${level}>`
        case 'bulletListItem':
          return `<li>${safe(text)}</li>`
        case 'numberedListItem':
          return `<li>${safe(text)}</li>`
        case 'checkListItem':
          return `<li>${safe(text)}</li>`
        case 'paragraph':
        default:
          return `<p>${safe(text)}</p>`
      }
    })
    .join('')
}
