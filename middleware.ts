import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    if (token?.mustChangePassword) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('firstAccess', '1')
      return NextResponse.redirect(url)
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
