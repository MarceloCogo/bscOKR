'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DOC_SECTIONS } from '@/lib/docs/sections'

export function DocsSidebar() {
  const pathname = usePathname()

  return (
    <aside className="rounded-lg border border-neutral-200 bg-white p-3">
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Documentacao</p>
      <nav className="space-y-1">
        {DOC_SECTIONS.map((section) => {
          const href = `/app/docs/${section.slug}`
          const isActive = pathname === href

          return (
            <Link
              key={section.slug}
              href={href}
              className={`block rounded-md px-2 py-2 text-sm transition-colors ${
                isActive ? 'bg-[#E87722]/10 text-[#E87722] font-medium' : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              {section.title}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
