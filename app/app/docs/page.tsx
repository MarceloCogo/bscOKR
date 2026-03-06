import Link from 'next/link'
import { DOC_SECTIONS } from '@/lib/docs/sections'

export default function DocsHomePage() {
  return (
    <div className="space-y-6">
      <header className="rounded-lg border border-neutral-200 bg-white p-5">
        <h1 className="text-2xl font-bold text-neutral-900">Documentacao da Plataforma</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Este espaco centraliza as regras de negocio e orientacoes de uso do BSC OKR.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {DOC_SECTIONS.map((section) => (
          <Link
            key={section.slug}
            href={`/app/docs/${section.slug}`}
            className="rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-[#E87722]/60 hover:bg-[#E87722]/5"
          >
            <p className="text-base font-semibold text-neutral-900">{section.title}</p>
            <p className="mt-1 text-sm text-neutral-600">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
