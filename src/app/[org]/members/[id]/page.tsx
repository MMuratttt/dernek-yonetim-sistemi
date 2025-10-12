import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { LinkButton } from '@/components/ui/link-button'
import { Suspense } from 'react'
import { SendSmsButton } from './send-sms-button'
import { TakePaymentButton } from './take-payment-button'
import { MemberPayments } from './member-payments'

export default async function MemberDetailPage({
  params,
}: {
  params: { org: string; id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) {
    const { redirect } = await import('next/navigation')
    redirect('/auth/signin')
  }

  async function getMember() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/${params.org}/members/${params.id}`,
        { cache: 'no-store' }
      )
      if (!res.ok) return null as any
      const data = await res.json()
      return data as any
    } catch {
      return null as any
    }
  }

  const detail = await getMember()
  if (!detail?.item) return <div className="p-6">Üye bulunamadı.</div>
  const item = detail.item
  const dues = detail.dues as
    | { borc: number; odenen: number; kalan: number; bagis: number }
    | undefined

  function money(v: number | null | undefined) {
    if (v === null || v === undefined || isNaN(v)) return '-'
    return v.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  return (
    <main>
      <Breadcrumbs
        items={[
          { label: 'Üyeler', href: `/${params.org}/members` },
          { label: item.firstName + ' ' + item.lastName },
        ]}
      />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold leading-none tracking-tight">
          {item.firstName} {item.lastName}
        </h1>
        <div className="flex items-center gap-2">
          <LinkButton
            href={`/${params.org}/members/${params.id}/edit`}
            size="sm"
            variant="outline"
          >
            Düzenle
          </LinkButton>
          <LinkButton
            href={`/${params.org}/members`}
            size="sm"
            variant="outline"
          >
            Listeye Dön
          </LinkButton>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="rounded border bg-card text-sm">
            <header className="flex items-center justify-between border-b px-3 py-2 bg-muted/40">
              <h2 className="font-medium">Üye Bilgileri</h2>
              <div className="flex gap-2">
                <LinkButton
                  href={`/${params.org}/members/${params.id}/edit`}
                  size="sm"
                  variant="ghost"
                >
                  Düzenle
                </LinkButton>
              </div>
            </header>
            <div className="p-3">
              <div className="grid grid-cols-3 gap-y-2">
                <div className="text-muted-foreground">Ad</div>
                <div className="col-span-2">{item.firstName}</div>
                <div className="text-muted-foreground">Soyad</div>
                <div className="col-span-2">{item.lastName}</div>
                <div className="text-muted-foreground">TC</div>
                <div className="col-span-2">{item.nationalId || '-'}</div>
                <div className="text-muted-foreground">Ünvan</div>
                <div className="col-span-2">
                  {/* placeholder for future title field */}-
                </div>
                <div className="text-muted-foreground">Giriş Tarihi</div>
                <div className="col-span-2">
                  {item.joinedAt
                    ? new Date(item.joinedAt).toLocaleDateString('tr-TR')
                    : '-'}
                </div>
              </div>
            </div>
          </section>
          <section className="rounded border bg-card text-sm">
            <header className="flex items-center justify-between border-b px-3 py-2 bg-amber-500/90 text-white">
              <h2 className="font-medium">Aidat Bilgileri</h2>
              <div className="flex gap-2">
                <TakePaymentButton
                  org={params.org}
                  memberId={params.id}
                  refreshPath={`/${params.org}/members/${params.id}`}
                />
              </div>
            </header>
            <div className="p-3">
              {dues ? (
                <div className="grid grid-cols-4 gap-y-2">
                  <div className="text-muted-foreground col-span-1">Borç</div>
                  <div className="col-span-3">{money(dues.borc)}</div>
                  <div className="text-muted-foreground col-span-1">Ödenen</div>
                  <div className="col-span-3">{money(dues.odenen)}</div>
                  <div className={`text-muted-foreground col-span-1`}>
                    Kalan
                  </div>
                  <div
                    className={`col-span-3 ${dues.kalan < 0 ? 'text-green-600 font-semibold' : ''}`}
                  >
                    {money(dues.kalan)}
                  </div>
                  <div className="text-muted-foreground col-span-1">
                    Yaptığı Bağış
                  </div>
                  <div className="col-span-3">{money(dues.bagis)}</div>
                </div>
              ) : (
                <div className="text-muted-foreground">Aidat verisi yok</div>
              )}
            </div>
          </section>
          <section className="rounded border bg-card text-sm">
            <header className="flex items-center justify-between border-b px-3 py-2 bg-muted/40">
              <h2 className="font-medium">İletişim Bilgileri</h2>
              <div className="flex gap-2">
                <Suspense>
                  <SendSmsButton
                    org={params.org}
                    memberId={params.id}
                    phone={item.phone}
                  />
                </Suspense>
              </div>
            </header>
            <div className="p-3 grid grid-cols-4 gap-y-2">
              <div className="text-muted-foreground">E-posta</div>
              <div className="col-span-3">{item.email || '-'}</div>
              <div className="text-muted-foreground">Telefon</div>
              <div className="col-span-3">{item.phone || '-'}</div>
              <div className="text-muted-foreground">Adres</div>
              <div className="col-span-3 whitespace-pre-wrap">
                {item.address || '-'}
              </div>
              <div className="text-muted-foreground">Meslek</div>
              <div className="col-span-3">{item.occupation || '-'}</div>
            </div>
          </section>
          <section className="rounded border bg-card text-sm">
            <header className="flex items-center justify-between border-b px-3 py-2 bg-muted/40">
              <h2 className="font-medium">Ödeme Geçmişi</h2>
            </header>
            <div className="p-3">
              <MemberPayments org={params.org} memberId={params.id} />
            </div>
          </section>
        </div>
        <div className="space-y-6">
          <section className="rounded border bg-card text-sm">
            <header className="flex items-center justify-between border-b px-3 py-2 bg-muted/40">
              <h2 className="font-medium">Üyelik Durumu</h2>
            </header>
            <div className="p-3 grid grid-cols-2 gap-y-2">
              <div className="text-muted-foreground">Üye Durumu</div>
              <div>{item.status}</div>
              <div className="text-muted-foreground">Üye Grubu</div>
              <div>-</div>
              <div className="text-muted-foreground">Üye Görevi</div>
              <div>-</div>
              <div className="text-muted-foreground">Karar No</div>
              <div>-</div>
              <div className="text-muted-foreground">Karar Tarihi</div>
              <div>-</div>
            </div>
          </section>
          <section className="rounded border bg-card text-sm">
            <header className="flex items-center justify-between border-b px-3 py-2 bg-muted/40">
              <h2 className="font-medium">Çıkış Durumu</h2>
            </header>
            <div className="p-3 grid grid-cols-2 gap-y-2">
              <div className="text-muted-foreground">Çıkış Karar No</div>
              <div>-</div>
              <div className="text-muted-foreground">Çıkış Tarihi</div>
              <div>
                {item.leftAt
                  ? new Date(item.leftAt).toLocaleDateString('tr-TR')
                  : '-'}
              </div>
              <div className="text-muted-foreground">Çıkış Nedeni</div>
              <div>-</div>
            </div>
          </section>
          <section className="rounded border bg-card p-3 text-sm">
            <div className="text-muted-foreground mb-2">Fotoğraf</div>
            {item.photoUrl ? (
              <img
                src={item.photoUrl}
                alt="Üye fotoğrafı"
                className="mt-2 w-56 h-56 object-cover rounded border"
              />
            ) : (
              <div className="mt-2 text-muted-foreground">Fotoğraf yok</div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
