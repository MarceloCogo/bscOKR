import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      session: session ? {
        authenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          tenantId: session.user.tenantId,
          tenantSlug: session.user.tenantSlug,
          tenantName: session.user.tenantName,
        }
      } : {
        authenticated: false,
      },
      database: {
        connected: true,
      },
      auth: {
        secretConfigured: !!process.env.AUTH_SECRET || !!process.env.NEXTAUTH_SECRET,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        nodeEnv: process.env.NODE_ENV,
      },
    }

    return NextResponse.json(health, { status: 200 })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      session: {
        authenticated: false,
      },
      database: {
        connected: false,
      },
    }, { status: 500 })
  }
}