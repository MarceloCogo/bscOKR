import { prisma } from '@/lib/db'

export async function bootstrapTenantConfig(tenantId: string): Promise<void> {
  // Insert default roles
  await prisma.role.createMany({
    data: [
      {
        tenantId,
        key: 'admin',
        name: 'Administrador',
        permissionsJson: JSON.stringify({
          canManageUsers: true,
          canManageConfig: true,
          canViewAll: true,
          canEditAll: true,
        }),
      },
      {
        tenantId,
        key: 'leader',
        name: 'Líder',
        permissionsJson: JSON.stringify({
          canManageUsers: false,
          canManageConfig: false,
          canViewAll: true,
          canEditAll: true,
        }),
      },
      {
        tenantId,
        key: 'member',
        name: 'Membro',
        permissionsJson: JSON.stringify({
          canManageUsers: false,
          canManageConfig: false,
          canViewAll: true,
          canEditAll: false,
        }),
      },
      {
        tenantId,
        key: 'viewer',
        name: 'Visualizador',
        permissionsJson: JSON.stringify({
          canManageUsers: false,
          canManageConfig: false,
          canViewAll: true,
          canEditAll: false,
        }),
      },
    ],
  })

  // Insert default organizational node types
  await prisma.orgNodeType.createMany({
    data: [
      { tenantId, key: 'company', name: 'Empresa', order: 1 },
      { tenantId, key: 'directorate', name: 'Diretoria', order: 2 },
      { tenantId, key: 'management', name: 'Gerência', order: 3 },
      { tenantId, key: 'coordination', name: 'Coordenação', order: 4 },
      { tenantId, key: 'team', name: 'Equipe', order: 5 },
      { tenantId, key: 'individual', name: 'Individual', order: 6 },
    ],
  })

  // Insert default objective statuses
  await prisma.objectiveStatus.createMany({
    data: [
      { tenantId, key: 'draft', name: 'Rascunho', order: 1, color: '#6b7280' },
      { tenantId, key: 'active', name: 'Ativo', order: 2, color: '#3b82f6' },
      { tenantId, key: 'on_hold', name: 'Em Espera', order: 3, color: '#f59e0b' },
      { tenantId, key: 'completed', name: 'Concluído', order: 4, color: '#10b981' },
      { tenantId, key: 'cancelled', name: 'Cancelado', order: 5, color: '#ef4444' },
    ],
  })

  // Insert default cycle statuses
  await prisma.cycleStatus.createMany({
    data: [
      { tenantId, key: 'planning', name: 'Planejamento', order: 1 },
      { tenantId, key: 'active', name: 'Ativo', order: 2 },
      { tenantId, key: 'review', name: 'Revisão', order: 3 },
      { tenantId, key: 'closed', name: 'Fechado', order: 4 },
    ],
  })

  // Insert default KR statuses
  await prisma.kRStatus.createMany({
    data: [
      { tenantId, key: 'not_started', name: 'Não Iniciado', order: 1, color: '#6b7280' },
      { tenantId, key: 'on_track', name: 'No Prazo', order: 2, color: '#10b981' },
      { tenantId, key: 'at_risk', name: 'Em Risco', order: 3, color: '#f59e0b' },
      { tenantId, key: 'behind', name: 'Atrasado', order: 4, color: '#ef4444' },
      { tenantId, key: 'completed', name: 'Concluído', order: 5, color: '#10b981' },
    ],
  })

  // Insert default KR metric types
  await prisma.kRMetricType.createMany({
    data: [
      { tenantId, key: 'number', name: 'Número', order: 1 },
      { tenantId, key: 'percent', name: 'Percentual', order: 2 },
      { tenantId, key: 'boolean', name: 'Sim/Não', order: 3 },
    ],
  })

  // Insert default responsibility roles
  await prisma.responsibilityRole.createMany({
    data: [
      {
        tenantId,
        key: 'accountable',
        name: 'Responsável',
        semantics: 'Pessoa responsável pelo resultado final',
        order: 1,
      },
      {
        tenantId,
        key: 'owner',
        name: 'Dono',
        semantics: 'Pessoa que executa ou coordena a execução',
        order: 2,
      },
      {
        tenantId,
        key: 'contributor',
        name: 'Contribuidor',
        semantics: 'Pessoa que contribui para o resultado',
        order: 3,
      },
    ],
  })

  // Insert default score rule
  await prisma.scoreRule.create({
    data: {
      tenantId,
      scope: 'global',
      formulaKey: 'linear_progress',
      paramsJson: JSON.stringify({
        minScore: 0,
        maxScore: 100,
        targetValue: 100,
      }),
    },
  })
}