# BSC OKR - Sistema de Gestão Estratégica

Sistema SaaS para gestão de mapa estratégico e execução por ciclos OKR (Objectives and Key Results).

## Tecnologias

- **Next.js 16** (App Router)
- **TypeScript**
- **Prisma ORM** + PostgreSQL
- **NextAuth.js** (autenticação)
- **Tailwind CSS** + shadcn/ui
- **Zod** (validação)
- **bcryptjs** (hash de senhas)

## Pré-requisitos

- Node.js 20+
- PostgreSQL
- npm ou yarn

## Instalação (macOS)

1. Clone o repositório:
```bash
git clone <repository-url>
cd bscokr
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite .env com suas configurações do banco PostgreSQL
```

4. Configure o banco de dados:
```bash
# Gera o cliente Prisma
npm run db:generate

# Executa as migrações
npm run db:migrate

# Executa o seed para criar usuário admin (APENAS DESENVOLVIMENTO)
npm run db:seed
```

5. Execute o projeto:
```bash
npm run dev
```

## Acesso Inicial

Após executar o seed, você pode fazer login com:

- **Email**: `admin@local.dev`
- **Slug da Organização**: `local-dev`
- **Senha**: Verificar no terminal após executar `npm run db:seed`

## Funcionalidades da Etapa 2

✅ **Seed de Desenvolvimento**: Cria tenant e usuário admin automaticamente
✅ **CRUD Completo**: Interface para gerenciar todas as configurações
✅ **Permissões**: Apenas admins acessam configuração
✅ **Multi-tenant**: Isolamento completo por organização
✅ **Validação**: Zod em todas as entradas
✅ **UI Responsiva**: Interface moderna com shadcn/ui

## Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Banco de dados
DATABASE_URL="postgresql://username:password@localhost:5432/bscokr"

# NextAuth
AUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Ambiente (opcional)
APP_ENV="development"
```

### Geração da AUTH_SECRET

```bash
openssl rand -base64 32
```

## Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Executar em produção
npm start

# Linting
npm run lint

# Banco de dados
npm run db:generate    # Gera cliente Prisma
npm run db:push        # Aplica schema no banco
npm run db:migrate     # Executa migrações
npm run db:studio      # Abre Prisma Studio
```

## Deploy no Vercel

### 1. Criar Banco no Neon

1. Acesse [Neon](https://neon.tech) e crie uma conta gratuita
2. Crie um novo projeto PostgreSQL
3. Copie a **Connection String** (terá formato: `postgresql://user:pass@host/db?sslmode=require`)

### 2. Configurar Vercel

1. Conecte seu repositório no Vercel
2. Vá em **Settings** → **Environment Variables** e adicione:

```env
# Database (do Neon)
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Auth (gerar com: openssl rand -base64 32)
AUTH_SECRET="bWuWUs1od3oawUQbr1lTX5QUvrBwTdj7Nh5WyQ91P7w="

# URL do app (SUBSTITUA pelo seu domínio Vercel)
NEXTAUTH_URL="https://seu-projeto.vercel.app"

# Ambiente
NODE_ENV="production"
```

3. Deploy será automático após push

### 3. Executar Migrações

Após o primeiro deploy, execute as migrações no banco Neon:

```bash
# Localmente, configure o DATABASE_URL com a string do Neon
export DATABASE_URL="postgresql://..."

# Execute as migrações
npm run db:migrate
```

Ou via dashboard do Neon:
1. Vá em **Query Editor** no Neon
2. Execute o SQL gerado pelo Prisma

### Configurações do Vercel

- **Framework Preset**: Next.js
- **Node Version**: 20.x
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

## Estrutura do Banco

O sistema utiliza multi-tenant com as seguintes tabelas principais:

- **Tenant**: Organizações
- **User**: Usuários (vinculados a tenant)
- **Role**: Funções de usuário
- **OrgNodeType**: Tipos de estrutura organizacional
- **Perspective/Pillar**: Perspectivas e pilares BSC
- **ObjectiveStatus/CycleStatus/KRStatus**: Status dos elementos
- **ResponsibilityRole**: Papéis de responsabilidade
- **ScoreRule**: Regras de pontuação

## Funcionalidades da Etapa 1

✅ Autenticação completa (signup/login)
✅ Multi-tenant básico
✅ Bootstrap automático de configurações
✅ Interface administrativa básica
✅ Middleware de proteção de rotas
✅ Estrutura preparada para OKRs

## Desenvolvimento

### Arquitetura

```
app/
├── api/auth/          # Rotas de autenticação
├── app/               # Área logada
│   ├── admin/         # Administração
│   ├── dashboard/     # Dashboard principal
│   └── layout.tsx     # Layout protegido
├── login/             # Página de login
├── signup/            # Página de signup
└── layout.tsx         # Layout raiz

lib/
├── auth.ts            # Config NextAuth
├── db.ts              # Cliente Prisma
├── bootstrap/         # Bootstrap de tenant
├── security/          # Utilitários de segurança
└── utils/             # Utilitários gerais

components/
├── ui/                # Componentes shadcn/ui
├── auth/              # Formulários de auth
└── app/               # Componentes da app

prisma/
└── schema.prisma      # Schema do banco
```

### Convenções

- **Slug Generation**: Slugs são gerados automaticamente via slugify
- **Validação**: Todas as entradas validadas com Zod
- **Tipos**: TypeScript strict mode
- **Segurança**: Senhas hasheadas com bcrypt
- **Multi-tenant**: Tenant ID associado a todas as operações

## Próximas Etapas

1. **Configuração Dinâmica**: Permitir edição das configurações via UI
2. **Gestão de Usuários**: CRUD de usuários e roles
3. **Objetivos OKR**: Criação e gestão de objetivos
4. **Key Results**: Implementação dos KR's
5. **Ciclos**: Gestão de ciclos OKR
6. **Dashboards**: Relatórios e analytics
7. **Notificações**: Sistema de alertas

## Suporte

Para questões técnicas, crie uma issue no repositório.