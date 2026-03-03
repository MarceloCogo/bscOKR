import Link from 'next/link'

export default function Home() {
  return (
    <main className="auth-shell min-h-screen px-4 py-10 md:px-8">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="auth-hero rounded-2xl border border-neutral-200/70 bg-white/70 p-7 shadow-sm backdrop-blur-sm md:p-10">
          <div className="mb-5 inline-flex items-center rounded-full border border-[#E87722]/20 bg-[#E87722]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#B45309]">
            BSC OKR
          </div>
          <h1 className="text-3xl font-bold leading-tight text-neutral-900 md:text-4xl">Estrategia clara, execucao consistente</h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-neutral-600 md:text-base">
            Organize objetivos por estrutura, acompanhe resultados e alinhe equipes em um unico fluxo de gestao.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-white p-3">
              <p className="text-xs text-neutral-500">Mapa estrategico</p>
              <p className="mt-1 text-sm font-semibold text-neutral-800">Visao por niveis</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-3">
              <p className="text-xs text-neutral-500">Objetivos e KRs</p>
              <p className="mt-1 text-sm font-semibold text-neutral-800">Execucao por ciclo</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-3">
              <p className="text-xs text-neutral-500">Governanca</p>
              <p className="mt-1 text-sm font-semibold text-neutral-800">Permissao por estrutura</p>
            </div>
          </div>
        </section>

        <section className="auth-form-panel rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-2xl font-bold text-neutral-900">Comece agora</h2>
          <p className="mt-1 text-sm text-neutral-600">Escolha como deseja acessar a plataforma.</p>

          <div className="mt-6 space-y-3">
            <Link
              href="/login"
              className="group block rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-[#E87722]/40 hover:bg-orange-50/40"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">Entrar</h3>
                  <p className="text-sm text-neutral-600">Acesse seu ambiente estrategico.</p>
                </div>
                <span className="text-[#E87722] transition-transform group-hover:translate-x-1">-&gt;</span>
              </div>
            </Link>

            <Link
              href="/signup"
              className="group block rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-[#E87722]/40 hover:bg-orange-50/40"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">Criar conta</h3>
                  <p className="text-sm text-neutral-600">Cadastre sua organização e inicie em minutos.</p>
                </div>
                <span className="text-[#E87722] transition-transform group-hover:translate-x-1">-&gt;</span>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
