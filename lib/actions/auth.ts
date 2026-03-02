import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function getPostLoginRedirect() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    return '/login'
  }

  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      tenantId: session.user.tenantId,
    },
    select: {
      mustChangePassword: true,
    },
  })

  if (user?.mustChangePassword) {
    return '/app/account/first-access'
  }

  // Always go to Dashboard - it will show appropriate state
  return '/app/dashboard'
}
