'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSession, signIn, useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

const loginSchema = z.object({
  tenantSlug: z.string().min(1, 'Slug da organização é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const forceFirstAccess = searchParams.get('firstAccess') === '1'
  const showFirstAccessForm =
    status === 'authenticated' &&
    Boolean(session?.user?.mustChangePassword || forceFirstAccess || mustChangePassword)

  useEffect(() => {
    const message = searchParams.get('message')
    if (message) {
      setSuccessMessage(message)
    }
  }, [searchParams])

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.mustChangePassword) {
      setMustChangePassword(true)
    }

    if (status !== 'authenticated') {
      setMustChangePassword(false)
    }
  }, [session?.user?.mustChangePassword, status])

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      tenantSlug: '',
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        tenantSlug: data.tenantSlug,
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        setError('Credenciais inválidas ou organização não encontrada')
      } else {
        const currentSession = await getSession()
        const mustChange = Boolean(currentSession?.user?.mustChangePassword)

        if (mustChange) {
          setMustChangePassword(true)
          setSuccessMessage('Autenticado. Defina sua nova senha para continuar.')
          return
        }

        router.push('/app/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError('Erro ao fazer login')
    } finally {
      setIsLoading(false)
    }
  }

  async function onMicrosoftSignIn() {
    setError('')

    const tenantSlug = form.getValues('tenantSlug')?.trim()
    if (!tenantSlug) {
      setError('Informe o slug da organização para entrar com Microsoft Entra ID.')
      return
    }

    setIsMicrosoftLoading(true)
    try {
      await signIn('azure-ad', {
        callbackUrl: '/app/dashboard',
        tenantSlug,
      })
    } catch (_error) {
      setError('Não foi possível iniciar o login com Microsoft. Tente novamente.')
      setIsMicrosoftLoading(false)
    }
  }

  async function onSubmitPasswordChange(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    if (status !== 'authenticated') {
      setError('Sua sessão expirou. Faça login novamente com a senha temporária.')
      return
    }

    if (newPassword.length < 8) {
      setError('Senha deve ter no mínimo 8 caracteres')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não conferem')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/change-password-first-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error?.formErrors?.[0] || payload.error || 'Erro ao trocar senha')
      }

      const tenantSlug = session?.user?.tenantSlug
      const email = session?.user?.email

      if (!tenantSlug || !email) {
        throw new Error('Sessao invalida. Faca login novamente.')
      }

      const relogin = await signIn('credentials', {
        tenantSlug,
        email,
        password: newPassword,
        redirect: false,
      })

      if (relogin?.error) {
        throw new Error('Senha alterada, mas não foi possível atualizar a sessão. Entre novamente.')
      }

      setMustChangePassword(false)
      setNewPassword('')
      setConfirmPassword('')
      router.push('/app/dashboard')
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Erro ao trocar senha')
    } finally {
      setIsLoading(false)
    }
  }

  if (showFirstAccessForm) {
    return (
      <Card className="auth-form-card">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center">Troca obrigatória de senha</CardTitle>
          <CardDescription className="text-center">
            Por segurança, defina uma nova senha para acessar o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmitPasswordChange} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nova senha</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmar nova senha</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11 btn-primary" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar nova senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="auth-form-card">
      <CardHeader className="space-y-1">
        <CardTitle className="text-center">Entrar</CardTitle>
        <CardDescription className="text-center">
          Digite suas credenciais para acessar o sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tenantSlug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug da Organização</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="minha-empresa-ltda-abc123"
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="joao@empresa.com"
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {successMessage && (
              <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
                {successMessage}
              </div>
            )}

            {forceFirstAccess && status !== 'authenticated' && (
              <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                Faça login com sua senha temporária para concluir a troca obrigatória de senha.
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11 btn-primary" disabled={isLoading || isMicrosoftLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-neutral-500">ou</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 border-neutral-300"
              onClick={onMicrosoftSignIn}
              disabled={isLoading || isMicrosoftLoading}
            >
              {isMicrosoftLoading ? 'Entrando com Microsoft...' : 'Entrar com Microsoft Entra ID'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
