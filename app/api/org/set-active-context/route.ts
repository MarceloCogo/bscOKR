import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { setActiveOrgNode } from '@/lib/actions/org'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orgNodeId } = body

    if (!orgNodeId || typeof orgNodeId !== 'string') {
      return NextResponse.json(
        { error: 'orgNodeId is required' },
        { status: 400 }
      )
    }

    await setActiveOrgNode(orgNodeId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error setting active context:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}