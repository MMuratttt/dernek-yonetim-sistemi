'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function OrgNav({ org }: { org: string }) {
  const pathname = usePathname()
  const links = [
    { href: `/${org}/members`, label: 'Üyeler' },
    { href: `/${org}/meetings`, label: 'Toplantılar' },
    { href: `/${org}/boards`, label: 'Kurullar' },
    { href: `/${org}/templates`, label: 'Dökümanlar' },
    { href: `/${org}/finance`, label: 'Finans' },
    { href: `/${org}/sms`, label: 'İletişim Geçmişi' },
    { href: `/${org}/settings`, label: 'Ayarlar' },
  ]
  return (
    <nav
      className="relative flex gap-1 overflow-x-auto rounded-lg border border-border/40 bg-card/50 p-1 shadow-sm backdrop-blur-sm"
      role="navigation"
      aria-label="Ana menü"
    >
      {links.map((l) => {
        const active = pathname?.startsWith(l.href)
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`
              relative whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-medium
              transition-all duration-200 ease-in-out
              ${
                active
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                  : 'text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground hover:shadow-sm active:scale-95'
              }
            `}
            aria-current={active ? 'page' : undefined}
          >
            {l.label}
            {active && (
              <span
                className="absolute bottom-0 left-1/2 h-0.5 w-[calc(100%-1rem)] -translate-x-1/2 rounded-t-full bg-primary-foreground/30"
                aria-hidden="true"
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
