'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, ArrowRight } from 'lucide-react'

interface OrgOnboardingWizardProps {
  onComplete?: () => void
}

export function OrgOnboardingWizard({ onComplete }: OrgOnboardingWizardProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !type) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/org/create-first', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim(), type }),
      })

      if (!response.ok) {
        throw new Error('Failed to create organization')
      }

      // Redirect to strategy map
      router.push('/app/strategy/map')
      onComplete?.()
    } catch (error) {
      console.error('Error creating organization:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Bem-vindo ao BSC OKR!</CardTitle>
          <CardDescription className="text-base">
            Vamos começar criando a estrutura da sua organização.
            Isso permitirá que você organize seus objetivos estratégicos.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Unidade</Label>
              <Input
                id="name"
                type="text"
                placeholder="Ex: Minha Empresa"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Unidade</Label>
              <Select value={type} onValueChange={setType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Empresa</SelectItem>
                  <SelectItem value="directorate">Diretoria</SelectItem>
                  <SelectItem value="management">Gerência</SelectItem>
                  <SelectItem value="coordination">Coordenação</SelectItem>
                  <SelectItem value="team">Equipe</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Selecione "Empresa" se esta é a unidade principal da sua organização.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !name.trim() || !type}
            >
              {isLoading ? 'Criando...' : 'Criar e Continuar'}
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}