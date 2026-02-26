import type { Metadata } from 'next'
import { Nunito } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-nunito',
})

export const metadata: Metadata = {
  title: 'BSC OKR',
  description: 'Sistema de gestão estratégica e execução por ciclos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${nunito.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}