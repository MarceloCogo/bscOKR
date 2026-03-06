export type DocSection = {
  slug: string
  title: string
  description: string
  fileName: string
}

export const DOC_SECTIONS: DocSection[] = [
  {
    slug: 'introducao',
    title: 'Introducao',
    description: 'Conceitos do BSC OKR e como navegar no sistema.',
    fileName: 'introducao.md',
  },
  {
    slug: 'objetivos-estrategicos',
    title: 'Objetivos Estrategicos',
    description: 'Regras para criar, editar e acompanhar objetivos.',
    fileName: 'objetivos-estrategicos.md',
  },
  {
    slug: 'key-results',
    title: 'Key Results (KRs)',
    description: 'Tipos de KR, formulas de progresso e operacao diaria.',
    fileName: 'key-results.md',
  },
  {
    slug: 'mapa-estrategico',
    title: 'Mapa Estrategico',
    description: 'Regioes do mapa, ambicao estrategica e boas praticas.',
    fileName: 'mapa-estrategico.md',
  },
  {
    slug: 'organizacao',
    title: 'Organizacao',
    description: 'Estrutura organizacional, contexto ativo e visibilidade.',
    fileName: 'organizacao.md',
  },
  {
    slug: 'permissoes-e-roles',
    title: 'Permissoes e Roles',
    description: 'Quem pode ver, editar e administrar cada recurso.',
    fileName: 'permissoes-e-roles.md',
  },
  {
    slug: 'ciclos-e-metodos',
    title: 'Ciclos e Metodos',
    description: 'Cadencia de acompanhamento e governanca de resultados.',
    fileName: 'ciclos-e-metodos.md',
  },
  {
    slug: 'integracao-entra-scim',
    title: 'Integracao Entra e SCIM',
    description: 'SSO Microsoft Entra ID e provisionamento automatico.',
    fileName: 'integracao-entra-scim.md',
  },
  {
    slug: 'faq',
    title: 'FAQ',
    description: 'Perguntas frequentes e resolucao de problemas comuns.',
    fileName: 'faq.md',
  },
]
