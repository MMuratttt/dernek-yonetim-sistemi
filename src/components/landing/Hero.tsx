'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { useSession } from 'next-auth/react'
import { ArrowRight } from 'lucide-react'

export default function Hero() {
  const { data: session, status } = useSession()
  const isAuthed = Boolean(session?.user)
  return (
    <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-lg">
      <div
        className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(white,transparent_85%)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-5xl px-6 py-24 text-center sm:py-32">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          Dernek Yönetimini Kolaylaştırın
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground leading-relaxed">
          Üyeler, aidatlar, kurul/komisyonlar, toplantı ve şablonlar. Hepsi tek
          bir modern arayüzde. Derneğinizi organize etmek hiç bu kadar kolay
          olmamıştı.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4 min-h-[44px] flex-wrap">
          {isAuthed ? (
            <LinkButton
              href="/org"
              className="px-8 h-11 text-base shadow-lg hover:shadow-xl transition-shadow group"
            >
              Dernekler
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </LinkButton>
          ) : (
            <>
              <LinkButton
                href="/auth/signin"
                className="px-8 h-11 text-base shadow-lg hover:shadow-xl transition-shadow group"
              >
                Giriş Yap
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </LinkButton>
              <Link href="/org/new">
                <Button
                  variant="outline"
                  className="px-8 h-11 text-base bg-background/80 backdrop-blur-sm hover:bg-background border-2"
                >
                  Hemen Başlayın
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-24 -z-10 h-48 bg-gradient-to-t from-primary/15 via-primary/5 to-transparent"
      />
    </section>
  )
}
