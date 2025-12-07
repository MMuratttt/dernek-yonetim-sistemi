import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { LinkButton } from '@/components/ui/link-button'
import { Suspense } from 'react'
import { SendSmsButton } from './send-sms-button'
import { TakePaymentButton } from './take-payment-button'
import { MemberPayments } from './member-payments'
import { prisma } from '@/lib/prisma'
import { ensureOrgAccessBySlug } from '@/lib/authz'

function translateMemberStatus(status: string): string {
  const translations: Record<string, string> = {
    ACTIVE: 'Aktif',
    PASSIVE: 'Pasif',
    LEFT: 'Ayrıldı',
  }
  return translations[status] || status
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ org: string; id: string }>
}) {
  const { org, id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const { redirect } = await import('next/navigation')
    redirect('/auth/signin')
    return null // TypeScript doesn't know redirect never returns
  }

  // Check organization access
  const access = await ensureOrgAccessBySlug(session.user.id, org)
  if (access.notFound || !access.allowed) {
    return <div className="p-6">Dernek bulunamadı.</div>
  }

  // Get member directly from database
  const member = await prisma.member.findFirst({
    where: { id, organizationId: access.org.id },
  })

  if (!member) return <div className="p-6">Üye bulunamadı.</div>

  // Calculate dues
  const txns = await prisma.financeTransaction.findMany({
    where: { organizationId: access.org.id, memberId: member.id },
    select: { type: true, amount: true, planId: true, reference: true },
  })

  let borc = 0
  let odenen = 0
  let bagis = 0

  for (const t of txns) {
    const amt = Number(t.amount)
    const isDonation =
      t.reference?.toLowerCase().includes('bagis') ||
      t.reference?.toLowerCase().includes('bağış') ||
      t.reference?.toLowerCase().includes('donation')

    switch (t.type) {
      case 'CHARGE':
        borc += amt
        break
      case 'PAYMENT':
        if (!t.planId && isDonation) {
          bagis += amt
        } else {
          odenen += amt
        }
        break
      case 'REFUND':
        odenen -= amt
        break
      case 'ADJUSTMENT':
        if (amt >= 0) odenen += amt
        else borc += Math.abs(amt)
        break
    }
  }

  const kalan = borc - odenen
  const dues = { borc, odenen, kalan, bagis }

  const item = member

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
          { label: 'Üyeler', href: `/${org}/members` },
          { label: item.firstName + ' ' + item.lastName },
        ]}
      />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold leading-none tracking-tight">
          {item.firstName} {item.lastName}
        </h1>
        <div className="flex items-center gap-2">
          <LinkButton
            href={`/${org}/members/${id}/edit`}
            size="sm"
            variant="outline"
          >
            Düzenle
          </LinkButton>
          <LinkButton href={`/${org}/members`} size="sm" variant="outline">
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
                  href={`/${org}/members/${id}/edit`}
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
                <div className="text-muted-foreground">Statü</div>
                <div className="col-span-2">
                  {(item as any).title
                    ? (item as any).title === 'BASKAN'
                      ? 'Yönetim Kurulu Başkanı'
                      : (item as any).title === 'BASKAN_YARDIMCISI'
                        ? 'Yönetim Kurulu Başkan Yardımcısı'
                        : (item as any).title === 'SEKRETER'
                          ? 'Sekreter'
                          : (item as any).title === 'SAYMAN'
                            ? 'Sayman'
                            : (item as any).title === 'YONETIM_KURULU_ASIL'
                              ? 'Yönetim Kurulu Üyesi (Asil)'
                              : (item as any).title === 'DENETIM_KURULU_BASKANI'
                                ? 'Denetim Kurulu Başkanı'
                                : (item as any).title === 'DENETIM_KURULU_ASIL'
                                  ? 'Denetim Kurulu Üyesi (Asil)'
                                  : (item as any).title ===
                                      'YONETIM_KURULU_YEDEK'
                                    ? 'Yönetim Kurulu Üyesi (Yedek)'
                                    : (item as any).title ===
                                        'DENETIM_KURULU_YEDEK'
                                      ? 'Denetim Kurulu Üyesi (Yedek)'
                                      : (item as any).title === 'UYE'
                                        ? 'Üye'
                                        : (item as any).title
                    : '-'}
                </div>
                <div className="text-muted-foreground">Giriş Tarihi</div>
                <div className="col-span-2">
                  {item.joinedAt
                    ? new Date(item.joinedAt).toLocaleDateString('tr-TR')
                    : '-'}
                </div>
                <div className="text-muted-foreground">Kayıt Tarihi</div>
                <div className="col-span-2">
                  {(item as any).registeredAt
                    ? new Date((item as any).registeredAt).toLocaleDateString(
                        'tr-TR'
                      )
                    : '-'}
                </div>
              </div>
            </div>
          </section>
          <section className="rounded border bg-card text-sm">
            <header className="flex items-center justify-between border-b px-3 py-2 bg-muted/40">
              <h2 className="font-medium">İletişim Bilgileri</h2>
              <div className="flex gap-2">
                <Suspense>
                  <SendSmsButton org={org} memberId={id} phone={item.phone} />
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
              <div className="text-muted-foreground">Üye Durumu</div>
              <div className="col-span-3">
                {translateMemberStatus(item.status)}
              </div>
            </div>
          </section>
          <section className="rounded border bg-card text-sm">
            <header className="flex items-center justify-between border-b px-3 py-2 bg-muted/40">
              <h2 className="font-medium">Ödeme Geçmişi</h2>
            </header>
            <div className="p-3">
              <MemberPayments org={org} memberId={id} />
            </div>
          </section>
        </div>
        <div className="space-y-6">
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
          <section className="rounded border bg-card text-sm">
            <header className="flex items-center justify-between border-b px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <h2 className="font-medium flex items-center gap-2">
                💰 Aidat Bilgileri
              </h2>
              <div className="flex gap-2">
                <TakePaymentButton
                  org={org}
                  memberId={id}
                  refreshPath={`/${org}/members/${id}`}
                />
              </div>
            </header>
            <div className="p-4">
              {dues ? (
                <div className="space-y-4">
                  {/* Balance Summary Card */}
                  <div
                    className={`rounded-lg p-4 ${dues.kalan > 0 ? 'bg-red-50 border border-red-200' : dues.kalan < 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}
                  >
                    <div className="text-xs text-gray-600 mb-1">
                      Güncel Bakiye
                    </div>
                    <div
                      className={`text-3xl font-bold ${dues.kalan > 0 ? 'text-red-600' : dues.kalan < 0 ? 'text-green-600' : 'text-gray-600'}`}
                    >
                      {money(dues.kalan)} ₺
                    </div>
                    <div className="text-sm mt-2">
                      {dues.kalan > 0 ? (
                        <span className="inline-flex items-center gap-1 text-red-700">
                          💳 Borçlu
                        </span>
                      ) : dues.kalan < 0 ? (
                        <span className="inline-flex items-center gap-1 text-green-700">
                          ✅ Fazla Ödeme ({money(Math.abs(dues.kalan))} ₺)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-700">
                          ⚖️ Dengede
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Detailed Breakdown */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                      <div className="text-xs text-gray-600 mb-1">
                        Toplam Borç
                      </div>
                      <div className="text-lg font-semibold text-red-600">
                        {money(dues.borc)} ₺
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                      <div className="text-xs text-gray-600 mb-1">
                        Toplam Ödeme
                      </div>
                      <div className="text-lg font-semibold text-green-600">
                        {money(dues.odenen)} ₺
                      </div>
                    </div>
                  </div>

                  {dues.bagis > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <div className="text-xs text-gray-600 mb-1">
                        💝 Yaptığı Bağış
                      </div>
                      <div className="text-lg font-semibold text-blue-600">
                        {money(dues.bagis)} ₺
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground">Aidat verisi yok</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
