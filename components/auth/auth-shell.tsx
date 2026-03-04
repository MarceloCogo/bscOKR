import Link from 'next/link'

interface AuthShellProps {
  title: string
  subtitle: string
  ctaLabel: string
  ctaHref: string
  ctaText: string
  children: React.ReactNode
}

export function AuthShell({ title, subtitle, ctaLabel, ctaHref, ctaText, children }: AuthShellProps) {
  return (
    <div className="auth-shell flex min-h-[100svh] items-center px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="auth-hero rounded-2xl border border-neutral-200/70 bg-white/70 p-7 shadow-sm backdrop-blur-sm md:p-10">
          <div className="mb-5 inline-flex items-center rounded-full border border-[#E87722]/20 bg-[#E87722]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#B45309]">
            BSC OKR Platform
          </div>
          <h1 className="text-3xl font-bold leading-tight text-neutral-900 md:text-4xl">Gestão estratégica com foco em execução</h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-neutral-600 md:text-base">
            Conecte estrategia, objetivos e resultados em um fluxo unico. Acompanhe progresso, alinhe prioridades e simplifique a gestao entre equipes.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-white p-3">
              <p className="text-xs text-neutral-500">Clareza</p>
              <p className="mt-1 text-sm font-semibold text-neutral-800">Mapa estrategico visual</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-3">
              <p className="text-xs text-neutral-500">Ritmo</p>
              <p className="mt-1 text-sm font-semibold text-neutral-800">Ciclos e indicadores</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-3">
              <p className="text-xs text-neutral-500">Governanca</p>
              <p className="mt-1 text-sm font-semibold text-neutral-800">Permissoes por estrutura</p>
            </div>
          </div>
        </section>

        <section className="auth-form-panel self-center rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-5 text-center">
            <h2 className="text-2xl font-bold text-neutral-900">{title}</h2>
            <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>
            <p className="mt-2 text-sm text-neutral-600">
              {ctaText}{' '}
              <Link href={ctaHref} className="font-semibold text-[#E87722] transition-colors hover:text-[#CF6111]">
                {ctaLabel}
              </Link>
            </p>
          </div>
          {children}
        </section>
      </div>
    </div>
  )
}
