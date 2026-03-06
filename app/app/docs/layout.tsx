import { DocsSidebar } from '@/components/docs/docs-sidebar'

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[260px_1fr]">
      <div className="lg:sticky lg:top-4 lg:self-start">
        <DocsSidebar />
      </div>
      <section>{children}</section>
    </div>
  )
}
