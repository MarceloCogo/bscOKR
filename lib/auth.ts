import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/db'
import { verifyPassword } from '@/lib/security/password'
import { getClientIpFromHeaders } from '@/lib/security/request-ip'
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
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
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
