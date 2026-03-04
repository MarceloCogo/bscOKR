'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export function EntraConnectionCard() {
  const [isConnecting, setIsConnecting] = useState(false)

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

  return (
    <Card className="border-neutral-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Microsoft Entra ID (SSO + SCIM)</CardTitle>
        <CardDescription>
          Conecte seu tenant Microsoft com consentimento admin. Ao finalizar, o token SCIM será gerado automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleConnect} disabled={isConnecting}>
          {isConnecting ? 'Conectando Microsoft Entra ID...' : 'Conectar Microsoft Entra ID'}
        </Button>
      </CardContent>
    </Card>
  )
}
