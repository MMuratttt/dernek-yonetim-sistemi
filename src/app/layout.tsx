import './globals.css'
import type { Metadata } from 'next'
import { Providers } from '../components/providers'
import Link from 'next/link'
import { Button } from '../components/ui/button'
import { ThemeToggle } from '../components/ThemeToggle'
import { HeaderActions } from '../components/HeaderActions'
import { DerneklerLink } from '@/components/DerneklerLink'
// If ThemeToggle exists elsewhere, update the path accordingly, for example:
// import { ThemeToggle } from '../components/ui/ThemeToggle'

export const metadata: Metadata = {
  title: 'Dernek Yönetim Sistemi',
  description: 'Çoklu dernek yönetimi için modern web uygulaması.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>
        <Providers>
          <header className="sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden">
            <nav className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-4">
              <Link
                href="/"
                aria-label="Anasayfa"
                className="font-semibold tracking-tight"
              >
                ANASAYFA
              </Link>
              <div className="ml-auto flex items-center gap-2 text-sm">
                <DerneklerLink />
                <HeaderActions />
                <ThemeToggle />
              </div>
            </nav>
          </header>
          <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
        </Providers>
      </body>
    </html>
  )
}
