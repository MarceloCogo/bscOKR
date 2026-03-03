import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getClientIpFromHeaders } from '@/lib/security/request-ip'

const MIN_UPDATE_INTERVAL_MS = 45_000

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: {
        id: session.user.id,
        tenantId: session.user.tenantId,
      },
      select: {
        id: true,
        lastSeenAt: true as any,
      } as any,
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const now = new Date()
    const lastSeen = (user as any).lastSeenAt ? new Date((user as any).lastSeenAt).getTime() : 0
    if (lastSeen && now.getTime() - lastSeen < MIN_UPDATE_INTERVAL_MS) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const clientIp = getClientIpFromHeaders(request.headers)

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        lastSeenAt: now,
        lastSeenIp: clientIp,
      } as any,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating user presence:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
