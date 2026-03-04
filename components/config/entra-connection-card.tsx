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

type ScimSummary = {
  successCount24h: number
  errorCount24h: number
  lastSuccessAt: string | null
  lastSuccessOperation: string | null
  lastErrorAt: string | null
  lastErrorOperation: string | null
  lastErrorDetail: string | null
  lastErrorStatus: number | null
}

type ScimEvent = {
  id: string
  operation: string
  status: 'success' | 'error'
  httpStatus: number
  targetEmail: string | null
  detail: string | null
  createdAt: string
}

export function EntraConnectionCard() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [isRotatingToken, setIsRotatingToken] = useState(false)
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)
  const [config, setConfig] = useState<EntraConfig | null>(null)
  const [newScimToken, setNewScimToken] = useState<string | null>(null)
  const [events, setEvents] = useState<ScimEvent[]>([])
  const [summary, setSummary] = useState<ScimSummary | null>(null)

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

  const loadEvents = async () => {
    setIsLoadingEvents(true)
    try {
      const response = await fetch('/api/admin/identity/entra/events', { method: 'GET' })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || 'Não foi possível carregar os eventos de SCIM')
      }

      setSummary(payload?.summary || null)
      setEvents(Array.isArray(payload?.events) ? payload.events : [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao carregar eventos de SCIM')
    } finally {
      setIsLoadingEvents(false)
    }
  }

  useEffect(() => {
    void loadConfig()
    void loadEvents()
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
      await loadEvents()
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

        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-900">Monitoramento de Provisionamento (SCIM)</p>
            <Button type="button" variant="ghost" className="h-7 px-2 text-xs" onClick={() => void loadEvents()} disabled={isLoadingEvents}>
              {isLoadingEvents ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>

          {isLoadingEvents ? (
            <p className="text-sm text-neutral-500">Carregando eventos de SCIM...</p>
          ) : (
            <>
              <div className="grid gap-2 text-sm text-neutral-700 sm:grid-cols-2 lg:grid-cols-4">
                <p>
                  <span className="font-semibold">Sucessos (24h):</span> {summary?.successCount24h ?? 0}
                </p>
                <p>
                  <span className="font-semibold">Falhas (24h):</span> {summary?.errorCount24h ?? 0}
                </p>
                <p>
                  <span className="font-semibold">Último sucesso:</span>{' '}
                  {summary?.lastSuccessAt ? new Date(summary.lastSuccessAt).toLocaleString('pt-BR') : '—'}
                </p>
                <p>
                  <span className="font-semibold">Última falha:</span>{' '}
                  {summary?.lastErrorAt ? new Date(summary.lastErrorAt).toLocaleString('pt-BR') : '—'}
                </p>
              </div>

              {summary?.lastErrorDetail && (
                <p className="mt-2 text-xs text-red-700">
                  Último erro: {summary.lastErrorOperation || 'scim'} ({summary.lastErrorStatus || 500}) - {summary.lastErrorDetail}
                </p>
              )}

              <div className="mt-3 overflow-x-auto rounded border border-neutral-200 bg-white">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Data/Hora</th>
                      <th className="px-3 py-2 font-semibold">Operação</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Usuário</th>
                      <th className="px-3 py-2 font-semibold">Detalhe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-3 text-neutral-500">
                          Nenhum evento SCIM registrado ainda.
                        </td>
                      </tr>
                    ) : (
                      events.map((event) => (
                        <tr key={event.id} className="border-b border-neutral-100 last:border-b-0">
                          <td className="px-3 py-2 text-neutral-700">{new Date(event.createdAt).toLocaleString('pt-BR')}</td>
                          <td className="px-3 py-2 text-neutral-700">{event.operation}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${
                                event.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {event.status} ({event.httpStatus})
                            </span>
                          </td>
                          <td className="px-3 py-2 text-neutral-700">{event.targetEmail || '—'}</td>
                          <td className="max-w-[260px] truncate px-3 py-2 text-neutral-500" title={event.detail || ''}>
                            {event.detail || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
