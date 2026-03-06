type MarkdownRendererProps = {
  content: string
}

function renderInline(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^\)]+\))/g)
  return parts.map((part, index) => {
    const match = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/)
    if (!match) {
      return <span key={index}>{part}</span>
    }

    return (
      <a
        key={index}
        href={match[2]}
        className="text-[#E87722] underline underline-offset-4 hover:text-[#cf6111]"
        target={match[2].startsWith('http') ? '_blank' : undefined}
        rel={match[2].startsWith('http') ? 'noreferrer' : undefined}
      >
        {match[1]}
      </a>
    )
  })
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const nodes: React.ReactNode[] = []
  let key = 0
  let inCodeBlock = false
  let codeLines: string[] = []
  let listItems: string[] = []
  let orderedItems: string[] = []

  const flushList = () => {
    if (listItems.length > 0) {
      nodes.push(
        <ul key={`ul-${key++}`} className="list-disc space-y-1 pl-6 text-sm text-neutral-700">
          {listItems.map((item) => (
            <li key={`li-${key++}`}>{renderInline(item)}</li>
          ))}
        </ul>,
      )
      listItems = []
    }
  }

  const flushOrderedList = () => {
    if (orderedItems.length > 0) {
      nodes.push(
        <ol key={`ol-${key++}`} className="list-decimal space-y-1 pl-6 text-sm text-neutral-700">
          {orderedItems.map((item) => (
            <li key={`oli-${key++}`}>{renderInline(item)}</li>
          ))}
        </ol>,
      )
      orderedItems = []
    }
  }

  const flushCode = () => {
    if (codeLines.length > 0) {
      nodes.push(
        <pre key={`pre-${key++}`} className="overflow-x-auto rounded-md border border-neutral-200 bg-neutral-900 p-3 text-xs text-neutral-100">
          <code>{codeLines.join('\n')}</code>
        </pre>,
      )
      codeLines = []
    }
  }

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        flushCode()
        inCodeBlock = false
      } else {
        flushList()
        flushOrderedList()
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    if (!line.trim()) {
      flushList()
      flushOrderedList()
      continue
    }

    if (line.startsWith('# ')) {
      flushList()
      flushOrderedList()
      nodes.push(
        <h1 key={`h1-${key++}`} className="text-2xl font-bold tracking-tight text-neutral-900">
          {line.replace('# ', '')}
        </h1>,
      )
      continue
    }

    if (line.startsWith('## ')) {
      flushList()
      flushOrderedList()
      nodes.push(
        <h2 key={`h2-${key++}`} className="mt-4 text-lg font-semibold text-neutral-900">
          {line.replace('## ', '')}
        </h2>,
      )
      continue
    }

    if (line.startsWith('### ')) {
      flushList()
      flushOrderedList()
      nodes.push(
        <h3 key={`h3-${key++}`} className="mt-3 text-base font-semibold text-neutral-900">
          {line.replace('### ', '')}
        </h3>,
      )
      continue
    }

    if (line.startsWith('- ')) {
      flushOrderedList()
      listItems.push(line.replace('- ', '').trim())
      continue
    }

    if (/^\d+\.\s/.test(line.trim())) {
      flushList()
      orderedItems.push(line.trim().replace(/^\d+\.\s/, ''))
      continue
    }

    flushList()
    flushOrderedList()
    nodes.push(
      <p key={`p-${key++}`} className="text-sm leading-6 text-neutral-700">
        {renderInline(line)}
      </p>,
    )
  }

  flushList()
  flushOrderedList()
  flushCode()

  return <div className="space-y-3">{nodes}</div>
}
