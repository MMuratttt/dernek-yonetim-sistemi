'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useToast } from '../../../../components/ui/toast'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'

const schema = z.object({
  firstName: z.string().min(1, 'Ad zorunludur'),
  lastName: z.string().min(1, 'Soyad zorunludur'),
  email: z
    .string()
    .email('Geçerli bir e-posta adresi girin')
    .optional()
    .or(z.literal('')),
  phone: z.string().min(5, 'Telefon çok kısa').optional().or(z.literal('')),
  nationalId: z
    .string()
    .regex(/^\d{11}$/i, 'TC Kimlik No 11 haneli olmalı')
    .optional()
    .or(z.literal('')),
  address: z.string().min(3, 'Adres çok kısa').optional().or(z.literal('')),
  occupation: z.string().min(2, 'Meslek çok kısa').optional().or(z.literal('')),
  joinedAt: z.string().optional().or(z.literal('')),
  registeredAt: z.string().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'PASSIVE', 'LEFT']).optional(),
  title: z
    .enum([
      'BASKAN',
      'BASKAN_YARDIMCISI',
      'SEKRETER',
      'SAYMAN',
      'YONETIM_KURULU_ASIL',
      'DENETIM_KURULU_BASKANI',
      'DENETIM_KURULU_ASIL',
      'YONETIM_KURULU_YEDEK',
      'DENETIM_KURULU_YEDEK',
      'UYE',
    ])
    .nullable()
    .optional(),
  // --- Initial Finance optional fields (light validation, further checked client-side) ---
  initialFinanceType: z.string().optional(),
  initialFinanceAmount: z.string().optional(), // will parse manually
  initialFinancePlanId: z.string().optional(),
  initialFinancePeriodId: z.string().optional(),
  initialFinancePaymentMethod: z.string().optional(),
  initialFinanceReceiptNo: z.string().optional(),
  initialFinanceReference: z.string().optional(),
  initialFinanceNote: z.string().optional(),
  initialFinanceDonation: z.any().optional(),
})
// No superRefine; finance section validated manually

type FormValues = z.infer<typeof schema>

// Accept loose props to satisfy Next.js PageProps (params may be a Promise in generated types)
export default function NewMemberPage({ params: paramsPromise }: any) {
  const params = React.use(paramsPromise)
  const router = useRouter()
  useEffect(() => {
    async function guard() {
      const s = await fetch('/api/auth/session')
        .then((r) => r.json())
        .catch(() => null)
      if (!s?.user) return router.replace('/auth/signin')
      const me = await fetch(`/api/${params.org}/me`)
        .then((r) => r.json())
        .catch(() => null)
      const role = me?.role as
        | 'SUPERADMIN'
        | 'ADMIN'
        | 'STAFF'
        | 'MEMBER'
        | undefined
      const canWrite =
        role === 'SUPERADMIN' || role === 'ADMIN' || role === 'STAFF'
      if (!canWrite) router.replace(`/${params.org}/members`)
    }
    guard()
  }, [router, params.org])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })
  const watchType = watch('initialFinanceType')
  const watchPlanId = watch('initialFinancePlanId')
  const { add } = useToast()
  // Local state for plans / periods
  const [plans, setPlans] = React.useState<Array<{ id: string; name: string }>>(
    []
  )
  const [periods, setPeriods] = React.useState<
    Array<{ id: string; name: string; planId: string }>
  >([])
  const [financeOpen, setFinanceOpen] = React.useState(false)
  const [photoFile, setPhotoFile] = React.useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null)

  // Load plans when finance section opened
  React.useEffect(() => {
    if (!financeOpen) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(`/api/${params.org}/finance/plans`)
        if (r.ok) {
          const data = await r.json()
          cancelled || setPlans(data.items || [])
        }
      } catch {}
    })()
    return () => {
      cancelled = true
    }
  }, [financeOpen, params.org])

  // Load periods when plan changes
  React.useEffect(() => {
    if (!financeOpen || !watchPlanId) {
      setPeriods([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(
          `/api/${params.org}/finance/periods?planId=${watchPlanId}`
        )
        if (r.ok) {
          const data = await r.json()
          cancelled || setPeriods(data.items || [])
        }
      } catch {}
    })()
    return () => {
      cancelled = true
    }
  }, [watchPlanId, financeOpen, params.org])

  return (
    <main className="p-6 max-w-xl">
      <Breadcrumbs
        items={[
          { label: 'Üyeler', href: `/${params.org}/members` },
          { label: 'Yeni' },
        ]}
      />
      <h1 className="text-2xl font-semibold">Yeni Üye</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={handleSubmit(async (values) => {
          // Extract finance fields
          const {
            initialFinanceType,
            initialFinanceAmount,
            initialFinancePlanId,
            initialFinancePeriodId,
            initialFinancePaymentMethod,
            initialFinanceReceiptNo,
            initialFinanceReference,
            initialFinanceNote,
            initialFinanceDonation,
            ...memberPayload
          } = values as any

          // Manual validation for finance section
          const hasFinance =
            initialFinanceType ||
            initialFinanceAmount ||
            initialFinancePlanId ||
            initialFinancePeriodId
          let parsedAmount: number | undefined
          if (initialFinanceAmount) {
            parsedAmount = parseFloat(
              String(initialFinanceAmount).replace(',', '.')
            )
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
              add({
                variant: 'error',
                title: 'Tutar geçersiz',
                description: 'Pozitif sayı giriniz',
              })
              return
            }
          }
          if (parsedAmount && !initialFinanceType) {
            add({
              variant: 'error',
              title: 'Tür gerekli',
              description: 'Tutar girdiğiniz için tür seçin (CHARGE/PAYMENT)',
            })
            return
          }
          if (initialFinanceType && !parsedAmount) {
            add({
              variant: 'error',
              title: 'Tutar gerekli',
              description: 'Tür seçtiğiniz için tutar girin',
            })
            return
          }
          if (
            (initialFinancePlanId && !initialFinancePeriodId) ||
            (!initialFinancePlanId && initialFinancePeriodId)
          ) {
            add({
              variant: 'error',
              title: 'Plan/Dönem uyumsuz',
              description: 'Plan ve dönem birlikte seçilmeli',
            })
            return
          }
          if (
            initialFinanceDonation &&
            initialFinanceType &&
            initialFinanceType !== 'PAYMENT'
          ) {
            add({
              variant: 'error',
              title: 'Bağış hatası',
              description: 'Bağış sadece PAYMENT ile kullanılabilir',
            })
            return
          }

          // Create member first
          const res = await fetch(`/api/${params.org}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(memberPayload),
          })
          if (!res.ok) {
            const data = await res.json().catch(() => null)
            add({
              variant: 'error',
              title: 'Kaydetme hatası',
              description: data?.error ?? undefined,
            })
            return
          }
          const created = await res.json()
          const memberId = created?.item?.id

          // Upload photo if provided
          if (memberId && photoFile) {
            const fd = new FormData()
            fd.append('file', photoFile)
            const photoRes = await fetch(
              `/api/${params.org}/members/${memberId}/photo`,
              {
                method: 'POST',
                body: fd,
              }
            )
            if (!photoRes.ok) {
              const d = await photoRes.json().catch(() => null)
              add({
                variant: 'error',
                title: 'Fotoğraf yüklenemedi',
                description: d?.error,
              })
            }
          }

          if (memberId && parsedAmount && initialFinanceType) {
            // Post finance transaction
            const finRes = await fetch(
              `/api/${params.org}/finance/transactions`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  memberId,
                  type: initialFinanceType,
                  amount: parsedAmount,
                  currency: 'TRY',
                  planId: initialFinancePlanId || undefined,
                  periodId: initialFinancePeriodId || undefined,
                  paymentMethod:
                    initialFinanceType === 'PAYMENT'
                      ? initialFinancePaymentMethod || undefined
                      : undefined,
                  receiptNo: initialFinanceReceiptNo || undefined,
                  reference:
                    (initialFinanceDonation ? 'BAGIS ' : '') +
                    (initialFinanceReference || ''),
                  note: initialFinanceNote || undefined,
                }),
              }
            )
            if (!finRes.ok) {
              const d = await finRes.json().catch(() => null)
              add({
                variant: 'error',
                title: 'Finans kaydı hatası',
                description: d?.error,
              })
            }
          }
          add({ variant: 'success', title: 'Üye oluşturuldu' })
          router.push(`/${params.org}/members`)
          router.refresh()
        })}
      >
        <div>
          <label className="block text-sm font-medium">Ad</label>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            {...register('firstName')}
          />
          {errors.firstName && (
            <p className="text-sm text-red-600">
              {errors.firstName.message as string}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">Soyad</label>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            {...register('lastName')}
          />
          {errors.lastName && (
            <p className="text-sm text-red-600">
              {errors.lastName.message as string}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">E-posta</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-red-600">
                {errors.email.message as string}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium">Telefon</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-sm text-red-600">
                {errors.phone.message as string}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">TC Kimlik No</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              {...register('nationalId')}
            />
            {errors.nationalId && (
              <p className="text-sm text-red-600">
                {errors.nationalId.message as string}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium">Giriş Tarihi</label>
            <input
              type="date"
              className="mt-1 w-full border rounded px-3 py-2"
              {...register('joinedAt')}
            />
            {errors.joinedAt && (
              <p className="text-sm text-red-600">
                {String(errors.joinedAt.message)}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Kayıt Tarihi</label>
            <input
              type="date"
              className="mt-1 w-full border rounded px-3 py-2"
              {...register('registeredAt')}
            />
            {errors.registeredAt && (
              <p className="text-sm text-red-600">
                {String(errors.registeredAt.message)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium">Statü</label>
            <select
              className="mt-1 w-full border rounded px-3 py-2"
              {...register('title')}
            >
              <option value="">Seçiniz</option>
              <option value="BASKAN">Yönetim Kurulu Başkanı</option>
              <option value="BASKAN_YARDIMCISI">
                Yönetim Kurulu Başkan Yardımcısı
              </option>
              <option value="SEKRETER">Sekreter</option>
              <option value="SAYMAN">Sayman</option>
              <option value="YONETIM_KURULU_ASIL">
                Yönetim Kurulu Üyesi (Asil)
              </option>
              <option value="DENETIM_KURULU_BASKANI">
                Denetim Kurulu Başkanı
              </option>
              <option value="DENETIM_KURULU_ASIL">
                Denetim Kurulu Üyesi (Asil)
              </option>
              <option value="YONETIM_KURULU_YEDEK">
                Yönetim Kurulu Üyesi (Yedek)
              </option>
              <option value="DENETIM_KURULU_YEDEK">
                Denetim Kurulu Üyesi (Yedek)
              </option>
              <option value="UYE">Üye</option>
            </select>
            {errors.title && (
              <p className="text-sm text-red-600">
                {errors.title.message as string}
              </p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">Adres</label>
          <textarea
            className="mt-1 w-full border rounded px-3 py-2"
            rows={3}
            {...register('address')}
          />
          {errors.address && (
            <p className="text-sm text-red-600">
              {errors.address.message as string}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Meslek</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              {...register('occupation')}
            />
            {errors.occupation && (
              <p className="text-sm text-red-600">
                {errors.occupation.message as string}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium">Durum</label>
            <select
              className="mt-1 w-full border rounded px-3 py-2"
              {...register('status')}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="PASSIVE">PASSIVE</option>
              <option value="LEFT">LEFT</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">Fotoğraf</label>
          {photoPreview ? (
            <div className="mt-2 flex items-center gap-3">
              <img
                src={photoPreview}
                alt="Üye fotoğrafı"
                className="w-16 h-16 rounded object-cover border"
              />
              <button
                type="button"
                className="px-3 py-1.5 rounded border"
                onClick={() => {
                  setPhotoFile(null)
                  setPhotoPreview(null)
                }}
              >
                Dosya seçilmedi
              </button>
            </div>
          ) : (
            <input
              type="file"
              accept="image/*"
              className="mt-2"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (!file.type.startsWith('image/')) {
                  add({
                    variant: 'error',
                    title: 'Sadece resim dosyaları yüklenebilir',
                  })
                  return
                }
                const max = 5 * 1024 * 1024 // 5MB
                if (file.size > max) {
                  add({
                    variant: 'error',
                    title: 'Dosya çok büyük',
                    description: 'Maksimum 5MB yükleyebilirsiniz.',
                  })
                  return
                }
                setPhotoFile(file)
                const reader = new FileReader()
                reader.onloadend = () => {
                  setPhotoPreview(reader.result as string)
                }
                reader.readAsDataURL(file)
              }}
            />
          )}
        </div>
        <div className="pt-4 border-t mt-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium text-lg">
              Başlangıç Finans Kaydı (Opsiyonel)
            </h2>
            <button
              type="button"
              onClick={() => setFinanceOpen((o) => !o)}
              className="text-xs text-blue-600 hover:underline"
            >
              {financeOpen ? 'Gizle' : 'Göster'}
            </button>
          </div>
          {financeOpen && (
            <div className="space-y-4 bg-muted/30 p-4 rounded border">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium">Tür</label>
                  <select
                    className="mt-1 w-full border rounded px-3 py-2"
                    {...register('initialFinanceType')}
                  >
                    <option value="">(Seçim yok)</option>
                    <option value="CHARGE">CHARGE (Borç)</option>
                    <option value="PAYMENT">PAYMENT (Ödeme)</option>
                  </select>
                  {errors.initialFinanceType && (
                    <p className="text-xs text-red-600">
                      {String(errors.initialFinanceType.message)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium">Tutar</label>
                  <input
                    className="mt-1 w-full border rounded px-3 py-2"
                    placeholder="0,00"
                    {...register('initialFinanceAmount')}
                  />
                  {errors.initialFinanceAmount && (
                    <p className="text-xs text-red-600">
                      {String(errors.initialFinanceAmount.message)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Ödeme Yöntemi
                  </label>
                  <select
                    className="mt-1 w-full border rounded px-3 py-2"
                    disabled={watchType !== 'PAYMENT'}
                    {...register('initialFinancePaymentMethod')}
                  >
                    <option value="">(Seçim yok)</option>
                    <option value="CASH">Nakit</option>
                    <option value="BANK_TRANSFER">Havale/EFT</option>
                    <option value="CREDIT_CARD">Kredi Kartı</option>
                    <option value="OTHER">Diğer</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium">Plan</label>
                  <select
                    className="mt-1 w-full border rounded px-3 py-2"
                    {...register('initialFinancePlanId')}
                  >
                    <option value="">(Seçim yok)</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Dönem</label>
                  <select
                    className="mt-1 w-full border rounded px-3 py-2"
                    disabled={!watchPlanId || periods.length === 0}
                    {...register('initialFinancePeriodId')}
                  >
                    <option value="">
                      {watchPlanId
                        ? periods.length
                          ? '(Seçiniz)'
                          : 'Dönem yok'
                        : 'Önce plan'}
                    </option>
                    {periods.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="initialFinanceDonation"
                    disabled={watchType !== 'PAYMENT'}
                    {...register('initialFinanceDonation')}
                  />
                  <label htmlFor="initialFinanceDonation" className="text-sm">
                    Bağış
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium">Makbuz No</label>
                  <input
                    className="mt-1 w-full border rounded px-3 py-2"
                    {...register('initialFinanceReceiptNo')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Referans</label>
                  <input
                    className="mt-1 w-full border rounded px-3 py-2"
                    placeholder="örn: BAGIS"
                    {...register('initialFinanceReference')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Not</label>
                  <input
                    className="mt-1 w-full border rounded px-3 py-2"
                    {...register('initialFinanceNote')}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <button
          disabled={isSubmitting}
          className="mt-6 px-4 py-2 rounded bg-black text-white disabled:opacity-60"
        >
          {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </form>
    </main>
  )
}
