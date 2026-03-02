import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    if (token?.mustChangePassword) {
      const isFirstAccessPage = path.startsWith('/app/account/first-access')
      if (!isFirstAccessPage) {
        const url = req.nextUrl.clone()
        url.pathname = '/app/account/first-access'
        url.search = ''
        return NextResponse.redirect(url)
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ['/app/:path*'],
}
