import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import AzureADProvider from 'next-auth/providers/azure-ad'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/security/password'
import { getClientIpFromHeaders } from '@/lib/security/request-ip'
import { generateTemporaryPassword } from '@/lib/security/temp-password'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  tenantSlug: z.string().min(1),
})

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        tenantSlug: { label: 'Tenant Slug', type: 'text' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password || !credentials?.tenantSlug) {
          return null
        }

        const { email, password, tenantSlug } = loginSchema.parse(credentials)

        // Find tenant by slug
        const tenant = await prisma.tenant.findUnique({
          where: { slug: tenantSlug },
        })

        if (!tenant) {
          return null
        }

        // Find user by email and tenant
        const user = await prisma.user.findUnique({
          where: {
            tenantId_email: {
              tenantId: tenant.id,
              email: email,
            },
          },
          include: {
            tenant: true,
          },
        })

        if (!user) {
          return null
        }

        if ((user as any).isActive === false) {
          return null
        }

        // Verify password
        const isValidPassword = await verifyPassword(password, user.passwordHash)

        if (!isValidPassword) {
          return null
        }

        try {
          const clientIp = getClientIpFromHeaders((req as any)?.headers)
          const now = new Date()

          await prisma.user.update({
            where: { id: user.id },
            data: {
              lastLoginAt: now,
              lastSeenAt: now,
              lastLoginIp: clientIp,
              lastSeenIp: clientIp,
            } as any,
          })

          const companyNode = await prisma.orgNode.findFirst({
            where: {
              tenantId: tenant.id,
              parentId: null,
              type: { key: 'company' },
            },
            select: { id: true },
          })

          const fallbackRootNode = companyNode
            ? null
            : await prisma.orgNode.findFirst({
                where: {
                  tenantId: tenant.id,
                  parentId: null,
                },
                orderBy: { createdAt: 'asc' },
                select: { id: true },
              })

          const loginContextNodeId = companyNode?.id || fallbackRootNode?.id

          if (loginContextNodeId) {
            await prisma.userPreference.upsert({
              where: {
                tenantId_userId: {
                  tenantId: tenant.id,
                  userId: user.id,
                },
              },
              update: {
                activeOrgNodeId: loginContextNodeId,
              },
              create: {
                tenantId: tenant.id,
                userId: user.id,
                activeOrgNodeId: loginContextNodeId,
              },
            })
          }
        } catch (trackingError) {
          console.error('Auth tracking/context update failed:', trackingError)
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          tenantSlug: user.tenant.slug,
          tenantName: user.tenant.name,
          mustChangePassword: user.mustChangePassword,
        }
      },
    }),
    ...(process.env.ENTRA_CLIENT_ID && process.env.ENTRA_CLIENT_SECRET && process.env.ENTRA_TENANT_ID
      ? [
          AzureADProvider({
            clientId: process.env.ENTRA_CLIENT_ID,
            clientSecret: process.env.ENTRA_CLIENT_SECRET,
            tenantId: process.env.ENTRA_TENANT_ID,
          }),
        ]
      : []),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'azure-ad') {
        return true
      }

      const profileEmail =
        (typeof user.email === 'string' && user.email) ||
        ((profile as any)?.preferred_username as string | undefined) ||
        ((profile as any)?.email as string | undefined)

      if (!profileEmail) {
        return false
      }

      const entraTenantId =
        ((profile as any)?.tid as string | undefined) ||
        ((profile as any)?.tenantId as string | undefined) ||
        null

      const identityProvider = entraTenantId
        ? await (prisma as any).tenantIdentityProvider.findFirst({
            where: {
              provider: 'entra',
              enabled: true,
              entraTenantId,
            },
          })
        : null

      let tenant = identityProvider
        ? await prisma.tenant.findUnique({ where: { id: identityProvider.tenantId } })
        : null

      if (!tenant) {
        const tenantSlug = process.env.ENTRA_DEFAULT_TENANT_SLUG
        if (!tenantSlug) {
          return false
        }

        tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
        if (!tenant) {
          return false
        }

        const fallbackIdentityProvider = await (prisma as any).tenantIdentityProvider.findFirst({
          where: {
            tenantId: tenant.id,
            provider: 'entra',
            enabled: true,
          },
        })

        if (!fallbackIdentityProvider) {
          return false
        }
      }

      const entraObjectId =
        ((profile as any)?.oid as string | undefined) ||
        ((profile as any)?.sub as string | undefined) ||
        null

      const userName =
        (typeof user.name === 'string' && user.name) ||
        ((profile as any)?.name as string | undefined) ||
        profileEmail

      const temporaryPassword = generateTemporaryPassword()
      const passwordHash = await hashPassword(temporaryPassword)

      const existing = await prisma.user.findUnique({
        where: {
          tenantId_email: {
            tenantId: tenant.id,
            email: profileEmail.toLowerCase(),
          },
        },
      })

      const persistedUser = existing
        ? await prisma.user.update({
            where: { id: existing.id },
            data: {
              name: userName,
              isActive: true,
              identityProvider: 'entra',
              ...(entraObjectId ? { entraObjectId } : {}),
            } as any,
          })
        : await prisma.user.create({
            data: {
              tenantId: tenant.id,
              name: userName,
              email: profileEmail.toLowerCase(),
              passwordHash,
              mustChangePassword: false,
              identityProvider: 'entra',
              entraObjectId,
              isActive: true,
            } as any,
          })

      ;(user as any).id = persistedUser.id
      ;(user as any).tenantId = tenant.id
      ;(user as any).tenantSlug = tenant.slug
      ;(user as any).tenantName = tenant.name
      ;(user as any).mustChangePassword = false

      return true
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.tenantId = user.tenantId
        token.tenantSlug = user.tenantSlug
        token.tenantName = user.tenantName
        token.mustChangePassword = Boolean(user.mustChangePassword)
      }

      if (trigger === 'update' && session && 'mustChangePassword' in session) {
        token.mustChangePassword = Boolean((session as any).mustChangePassword)
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.tenantId = token.tenantId as string
        session.user.tenantSlug = token.tenantSlug as string
        session.user.tenantName = token.tenantName as string
        session.user.mustChangePassword = Boolean(token.mustChangePassword)
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/app/dashboard`
    },
  },
  pages: {
    signIn: '/login',
  },
}

declare module 'next-auth' {
  interface User {
    tenantId: string
    tenantSlug: string
    tenantName: string
    mustChangePassword?: boolean
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      tenantId: string
      tenantSlug: string
      tenantName: string
      mustChangePassword?: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    tenantId: string
    tenantSlug: string
    tenantName: string
    mustChangePassword?: boolean
  }
}
