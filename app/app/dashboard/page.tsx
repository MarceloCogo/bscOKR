import Link from 'next/link'
import { StatCard } from '@/components/layout/stat-card'
import { Button } from '@/components/ui/button'
import { Target, TrendingUp, Calendar, Users, Map, Network } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Bem-vindo ao sistema BSC OKR
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Objetivos Ativos"
          value="0"
          description="Objetivos em andamento"
          icon={Target}
          trend={{ value: 0, label: "vs. mês anterior" }}
        />

        <StatCard
          title="Key Results"
          value="0"
          description="Resultados-chave ativos"
          icon={TrendingUp}
          trend={{ value: 0, label: "vs. mês anterior" }}
        />

        <StatCard
          title="Ciclos Ativos"
          value="0"
          description="Ciclos OKR em andamento"
          icon={Calendar}
          trend={{ value: 0, label: "vs. mês anterior" }}
        />

        <StatCard
          title="Usuários Ativos"
          value="1"
          description="Usuários no sistema"
          icon={Users}
          trend={{ value: 100, label: "vs. mês anterior" }}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/app/strategy/map">
          <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center space-y-2">
            <Map className="h-6 w-6" />
            <span>Ver Mapa Estratégico</span>
          </Button>
        </Link>

        <Link href="/app/strategy/objectives">
          <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center space-y-2">
            <Target className="h-6 w-6" />
            <span>Gerenciar Objetivos</span>
          </Button>
        </Link>

        <Link href="/app/organization">
          <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center space-y-2">
            <Network className="h-6 w-6" />
            <span>Estrutura Organizacional</span>
          </Button>
        </Link>

        <Link href="/app/admin/config">
          <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center space-y-2">
            <Users className="h-6 w-6" />
            <span>Configurações</span>
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="stat-card">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Atividades Recentes
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Sistema configurado com sucesso
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Todas as configurações padrão foram aplicadas
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Estrutura organizacional configurada
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Defina unidades e equipes para segmentação de objetivos
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-primary rounded-lg">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Mapa estratégico pronto
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Visualize e crie objetivos por perspectivas BSC
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Status do Sistema
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Configurações</span>
                <span className="text-sm font-medium text-green-600">Completo</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Banco de Dados</span>
                <span className="text-sm font-medium text-green-600">Conectado</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Usuários</span>
                <span className="text-sm font-medium text-blue-600">1 Admin</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Objetivos</span>
                <span className="text-sm font-medium text-muted-foreground">Aguardando</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}