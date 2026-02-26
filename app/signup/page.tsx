import { Metadata } from 'next'
import Link from 'next/link'
import { SignupForm } from '@/components/auth/signup-form'

export const metadata: Metadata = {
  title: 'Criar Conta - BSC OKR',
  description: 'Crie sua conta para começar a gerenciar seus objetivos estratégicos',
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">BSC OKR</h1>
          <h2 className="text-xl font-semibold text-foreground">
            Criar sua conta
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ou{' '}
            <Link
              href="/login"
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              entre com sua conta existente
            </Link>
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  )
}