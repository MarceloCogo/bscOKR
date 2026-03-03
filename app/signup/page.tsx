import { Metadata } from 'next'
import { SignupForm } from '@/components/auth/signup-form'
import { AuthShell } from '@/components/auth/auth-shell'

export const metadata: Metadata = {
  title: 'Criar Conta - BSC OKR',
  description: 'Crie sua conta para começar a gerenciar seus objetivos estratégicos',
}

export default function SignupPage() {
  return (
    <AuthShell
      title="Criar sua conta"
      subtitle="Configure sua organizacao e comece rapido"
      ctaText="Ja tem conta?"
      ctaLabel="Entrar"
      ctaHref="/login"
    >
        <SignupForm />
    </AuthShell>
  )
}
