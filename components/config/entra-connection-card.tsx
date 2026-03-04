'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

type EntraConfig = {
  enabled: boolean
  entraTenantId: string | null
  entraClientId: string | null
  scimTokenConfigured: boolean
  scimTokenCreatedAt: string | null
}

export function EntraConnectionCard() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [isRotatingToken, setIsRotatingToken] = useState(false)
  const [config, setConfig] = useState<EntraConfig | null>(null)
  const [newScimToken, setNewScimToken] = useState<string | null>(null)

  const loadConfig = async () => {
    setIsLoadingConfig(true)
    try {
      const response = await fetch('/api/admin/identity/entra', { method: 'GET' })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || 'Não foi possível carregar o status do Entra ID')
      }

      setConfig(payload as EntraConfig)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao carregar status do Entra ID')
    } finally {
      setIsLoadingConfig(false)
    }
  }

  useEffect(() => {
    void loadConfig()
  }, [])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const response = await fetch('/api/auth/entra/admin-consent/start', {
        method: 'POST',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.consentUrl) {
        throw new Error(payload?.error || 'Não foi possível iniciar a conexão com Microsoft Entra ID')
      }

      window.location.href = payload.consentUrl
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao conectar Microsoft Entra ID')
      setIsConnecting(false)
    }
  }

  const handleRotateScimToken = async () => {
    const confirmed = window.confirm('Gerar novo token SCIM? O token atual deixará de funcionar.')
    if (!confirmed) {
      return
    }

    setIsRotatingToken(true)
    try {
      const response = await fetch('/api/admin/identity/entra', {
        method: 'POST',
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !payload?.scimToken) {
        throw new Error(payload?.error || 'Não foi possível gerar novo token SCIM')
      }

      setNewScimToken(String(payload.scimToken))
      toast.success('Novo token SCIM gerado com sucesso')
      await loadConfig()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao gerar novo token SCIM')
    } finally {
      setIsRotatingToken(false)
    }
  }

  const isConnected = Boolean(config?.enabled && config?.entraTenantId)

  return (
    <Card className="border-neutral-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">Microsoft Entra ID (SSO + SCIM)</CardTitle>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
              isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {isConnected ? 'Conectado' : 'Não conectado'}
          </span>
        </div>
        <CardDescription>
          {isConnected
            ? 'Seu tenant já está conectado ao Entra ID. Você pode reconectar ou rotacionar o token SCIM.'
            : 'Conecte seu tenant Microsoft com consentimento admin. Ao finalizar, o token SCIM será gerado automaticamente.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingConfig ? (
          <p className="text-sm text-neutral-500">Carregando status da integração...</p>
        ) : (
          <div className="space-y-2 text-sm text-neutral-700">
            <p>
              <span className="font-semibold">Tenant ID:</span> {config?.entraTenantId || 'Não conectado'}
            </p>
            <p>
              <span className="font-semibold">Token SCIM:</span>{' '}
              {config?.scimTokenConfigured ? 'Configurado' : 'Ainda não gerado'}
            </p>
            {config?.scimTokenCreatedAt && (
              <p>
                <span className="font-semibold">Última geração do token:</span>{' '}
                {new Date(config.scimTokenCreatedAt).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleConnect} disabled={isConnecting || isLoadingConfig}>
            {isConnecting
              ? 'Conectando Microsoft Entra ID...'
              : isConnected
                ? 'Reconectar Microsoft Entra ID'
                : 'Conectar Microsoft Entra ID'}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleRotateScimToken}
            disabled={isRotatingToken || isLoadingConfig}
          >
            {isRotatingToken ? 'Gerando token...' : 'Gerar novo token SCIM'}
          </Button>
        </div>

        {newScimToken && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900">Novo token SCIM (exibido uma única vez)</p>
            <code className="mt-2 block break-all rounded bg-neutral-900 p-2 text-xs text-neutral-100">{newScimToken}</code>
            <Button
              type="button"
              variant="ghost"
              className="mt-2 h-8 px-2 text-xs"
              onClick={() => {
                navigator.clipboard.writeText(newScimToken)
                toast.success('Token copiado para a área de transferência')
              }}
            >
              Copiar token
            </Button>
          </div>
        )}

        <p className="text-xs text-neutral-500">
          Endpoint SCIM: <span className="font-medium">/api/scim/v2</span>
        </p>
      </CardContent>
    </Card>
  )
}
