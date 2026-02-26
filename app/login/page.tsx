import { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Entrar - BSC OKR',
  description: 'Entre em sua conta para acessar o sistema de gestão estratégica',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">BSC OKR</h1>
          <h2 className="text-xl font-semibold text-foreground">
            Entrar em sua conta
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ou{' '}
            <Link
              href="/signup"
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              crie uma nova conta
            </Link>
          </p>
        </div>
        <Suspense fallback={<div className="p-4">Carregando...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}