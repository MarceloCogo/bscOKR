import { promises as fs } from 'fs'
import path from 'path'
import { DOC_SECTIONS } from '@/lib/docs/sections'

export { DOC_SECTIONS }

const docsDir = path.join(process.cwd(), 'docs')

export async function getDocContentBySlug(slug: string) {
  const section = DOC_SECTIONS.find((item) => item.slug === slug)
  if (!section) {
    return null
  }

  const absolutePath = path.join(docsDir, section.fileName)
  const content = await fs.readFile(absolutePath, 'utf8')
  return {
    ...section,
    content,
  }
}
