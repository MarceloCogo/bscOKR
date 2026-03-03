import { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'
import { AuthShell } from '@/components/auth/auth-shell'

export const metadata: Metadata = {
  title: 'Entrar - BSC OKR',
  description: 'Entre em sua conta para acessar o sistema de gestão estratégica',
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Entrar em sua conta"
      subtitle="Acesse seu ambiente estrategico com seguranca"
      ctaText="Primeiro acesso?"
      ctaLabel="Crie uma conta"
      ctaHref="/signup"
    >
        <Suspense fallback={<div className="p-4">Carregando...</div>}>
          <LoginForm />
        </Suspense>
    </AuthShell>
  )
}
