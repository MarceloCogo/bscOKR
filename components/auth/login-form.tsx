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

function mapAuthError(errorCode: string) {
  switch (errorCode) {
    case 'Callback':
      return 'Falha na autenticação Microsoft. Verifique a configuração do Entra ID e tente novamente.'
    case 'AccessDenied':
      return 'Acesso negado pelo provedor Microsoft Entra ID.'
    case 'OAuthSignin':
    case 'OAuthCallback':
    case 'OAuthCreateAccount':
      return 'Não foi possível concluir o login com Microsoft Entra ID.'
    default:
      return 'Falha de autenticação. Tente novamente.'
  }
}

export function LoginForm() {
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false)
  const [showLocalLogin, setShowLocalLogin] = useState(false)
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

  useEffect(() => {
    const tenantSlug = searchParams.get('tenantSlug')
    if (tenantSlug) {
      form.setValue('tenantSlug', tenantSlug.trim().toLowerCase())
      setShowLocalLogin(true)
    } else if (typeof window !== 'undefined') {
      const rememberedTenantSlug = window.localStorage.getItem('bscokr:lastTenantSlug')
      if (rememberedTenantSlug) {
        form.setValue('tenantSlug', rememberedTenantSlug)
      }
    }

    const authError = searchParams.get('error')
    if (authError) {
      setError(mapAuthError(authError))
    }
  }, [form, searchParams])

  useEffect(() => {
    if (forceFirstAccess) {
      setShowLocalLogin(true)
    }
  }, [forceFirstAccess])

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        tenantSlug: data.tenantSlug.trim().toLowerCase(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        setShowLocalLogin(true)
        setError('Credenciais inválidas ou organização não encontrada')
      } else {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('bscokr:lastTenantSlug', data.tenantSlug.trim().toLowerCase())
        }

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

    setIsMicrosoftLoading(true)
    try {
      await signIn('azure-ad', {
        callbackUrl: '/app/dashboard',
        scope: 'openid profile email offline_access User.Read',
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
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full border border-neutral-300 bg-white text-neutral-900 shadow-sm hover:bg-neutral-50"
              onClick={onMicrosoftSignIn}
              disabled={isLoading || isMicrosoftLoading}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="mr-2"
              >
                <rect x="0.5" y="0.5" width="7" height="7" fill="#F25022" />
                <rect x="8.5" y="0.5" width="7" height="7" fill="#7FBA00" />
                <rect x="0.5" y="8.5" width="7" height="7" fill="#00A4EF" />
                <rect x="8.5" y="8.5" width="7" height="7" fill="#FFB900" />
              </svg>
              {isMicrosoftLoading ? 'Entrando com Microsoft...' : 'Continuar com Microsoft'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowLocalLogin((current) => !current)}
                className="text-[11px] font-medium text-neutral-500 hover:text-neutral-800"
                aria-expanded={showLocalLogin}
              >
                {showLocalLogin ? 'Ocultar login local' : 'ou usar email e senha'}
              </button>
            </div>

            {showLocalLogin && (
              <div className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50/60 p-4 transition-all">
                <FormField
                  control={form.control}
                  name="tenantSlug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug da Organização</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="minha-empresa-ltda-abc123"
                          className="h-11 bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-neutral-500">Obrigatório apenas para login local com email e senha.</p>
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
                          className="h-11 bg-white"
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
                          className="h-11 bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full h-11" disabled={isLoading || isMicrosoftLoading}>
                  {isLoading ? 'Entrando...' : 'Entrar com email e senha'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-9 text-xs"
                  onClick={() => {
                    form.setValue('tenantSlug', '')
                    if (typeof window !== 'undefined') {
                      window.localStorage.removeItem('bscokr:lastTenantSlug')
                    }
                  }}
                  disabled={isLoading || isMicrosoftLoading}
                >
                  Trocar organização salva
                </Button>
              </div>
            )}

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

            <p className="text-xs text-center text-neutral-500">
              A conexão do Microsoft Entra ID deve ser habilitada por um administrador em
              <span className="font-medium"> Admin &gt; Configuração</span>.
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
