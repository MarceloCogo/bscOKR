import { notFound } from 'next/navigation'
import { MarkdownRenderer } from '@/components/docs/markdown-renderer'
import { getDocContentBySlug } from '@/lib/docs/content'

export default async function DocSectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = await getDocContentBySlug(slug)

  if (!doc) {
    notFound()
  }

  return (
    <article className="space-y-4 rounded-lg border border-neutral-200 bg-white p-5">
      <MarkdownRenderer content={doc.content} />
    </article>
  )
}
