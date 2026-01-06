'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

export function HeaderActions() {
  const { data, status } = useSession()
  const [isSuper, setIsSuper] = useState<boolean | null>(null)
  const [firstOrg, setFirstOrg] = useState<{
    slug: string
    name: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (!data?.user?.id) {
        if (!cancelled) {
          setIsSuper(null)
          setFirstOrg(null)
        }
        return
      }
      try {
        const res = await fetch('/api/me/role', { cache: 'no-store' })
        if (!res.ok) {
          if (!cancelled) {
            setIsSuper(null)
            setFirstOrg(null)
          }
          return
        }
        const json = await res.json()
        if (!cancelled) {
          setIsSuper(Boolean(json?.isSuper))
          setFirstOrg(json?.firstOrg || null)
        }
      } catch {
        if (!cancelled) {
          setIsSuper(null)
          setFirstOrg(null)
        }
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [data?.user?.id])

  return (
    <div className="flex items-center gap-2 min-h-[32px]">
      {data?.user ? (
        <>
          {isSuper === null ? (
            // Placeholder skeleton width to keep layout stable
            <span className="h-6 w-16 animate-pulse rounded bg-muted/60" />
          ) : isSuper ? (
            <Badge variant="secondary">SUPERADMIN</Badge>
          ) : null}
          {isSuper ? (
            <Link href="/org">
              <Button size="sm">Dernekler</Button>
            </Link>
          ) : firstOrg ? (
            <Link href={`/${firstOrg.slug}`}>
              <Button size="sm">Derneğim</Button>
            </Link>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            Çıkış
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => signIn(undefined, { callbackUrl: '/org' })}
        >
          Giriş
        </Button>
      )}
    </div>
  )
}
