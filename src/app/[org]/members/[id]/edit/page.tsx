'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useToast } from '../../../../../components/ui/toast'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'

const schema = z.object({
  firstName: z.string().min(1, 'Ad zorunludur').optional(),
  lastName: z.string().min(1, 'Soyad zorunludur').optional(),
  email: z.string().email('Geçerli e-posta').nullable().optional(),
  phone: z.string().min(5, 'Telefon çok kısa').nullable().optional(),
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
  nationalId: z
    .string()
    .regex(/^\d{11}$/, 'TC Kimlik No 11 haneli olmalı')
    .nullable()
    .optional(),
  address: z.string().min(3, 'Adres çok kısa').nullable().optional(),
  occupation: z.string().min(2, 'Meslek çok kısa').nullable().optional(),
  joinedAt: z.string().optional(),
  registeredAt: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function EditMemberPage(props: any) {
  const params = use(props.params)
  const router = useRouter()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })
  const [loading, setLoading] = useState(true)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const { add } = useToast()

  useEffect(() => {
    async function load() {
      const sess = await fetch('/api/auth/session')
        .then((r) => r.json())
        .catch(() => null)
      if (!sess?.user) return router.replace('/auth/signin')
      const res = await fetch(`/api/${params.org}/members/${params.id}`)
      if (!res.ok) return router.replace(`/${params.org}/members`)
      const data = await res.json()
      const item = data.item
      reset({
        firstName: item.firstName,
        lastName: item.lastName,
        email: item.email,
        phone: item.phone,
        status: item.status,
        title: item.title ?? null,
        nationalId: item.nationalId ?? null,
        address: item.address ?? null,
        occupation: item.occupation ?? null,
        joinedAt: item.joinedAt ? String(item.joinedAt).slice(0, 10) : '',
        registeredAt: item.registeredAt
          ? String(item.registeredAt).slice(0, 10)
          : '',
      })
      setPhotoUrl(item.photoUrl ?? null)
      setLoading(false)
    }
    load()
  }, [params.org, params.id, reset, router])

  return (
    <main className="p-6 max-w-xl">
      <Breadcrumbs
        items={[
          { label: 'Üyeler', href: `/${params.org}/members` },
          { label: 'Düzenle' },
        ]}
      />
      <h1 className="text-2xl font-semibold">Üye Düzenle</h1>
      {loading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={handleSubmit(async (values) => {
            const res = await fetch(`/api/${params.org}/members/${params.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...values,
                // normalize blanks to null for optional nullable fields
                email: values.email === '' ? null : values.email,
                phone: values.phone === '' ? null : values.phone,
                nationalId: values.nationalId === '' ? null : values.nationalId,
                address: values.address === '' ? null : values.address,
                occupation: values.occupation === '' ? null : values.occupation,
                title: values.title,
                joinedAt:
                  values.joinedAt && values.joinedAt.length
                    ? new Date(values.joinedAt)
                    : undefined,
                registeredAt:
                  values.registeredAt && values.registeredAt.length
                    ? new Date(values.registeredAt)
                    : undefined,
              }),
            })
            if (res.ok) {
              add({ variant: 'success', title: 'Üye güncellendi' })
              router.push(`/${params.org}/members`)
              router.refresh()
            } else {
              const data = await res.json().catch(() => null)
              add({
                variant: 'error',
                title: 'Güncelleme hatası',
                description: data?.error ?? undefined,
              })
            }
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
            {photoUrl ? (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={photoUrl}
                  alt="Üye fotoğrafı"
                  className="w-16 h-16 rounded object-cover border"
                />
                <button
                  type="button"
                  className="px-3 py-1.5 rounded border"
                  onClick={async () => {
                    if (!confirm('Fotoğraf kaldırılsın mı?')) return
                    const res = await fetch(
                      `/api/${params.org}/members/${params.id}/photo`,
                      { method: 'DELETE' }
                    )
                    if (res.ok) {
                      setPhotoUrl(null)
                      add({ variant: 'success', title: 'Fotoğraf kaldırıldı' })
                    } else {
                      const data = await res.json().catch(() => null)
                      add({
                        variant: 'error',
                        title: 'Fotoğraf kaldırılamadı',
                        description: data?.error ?? undefined,
                      })
                    }
                  }}
                >
                  Kaldır (görsel)
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept="image/*"
                className="mt-2"
                onChange={async (e) => {
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
                  const fd = new FormData()
                  fd.append('file', file)
                  const res = await fetch(
                    `/api/${params.org}/members/${params.id}/photo`,
                    { method: 'POST', body: fd }
                  )
                  const data = await res.json().catch(() => null)
                  if (res.ok) {
                    setPhotoUrl(data.photoUrl as string)
                    add({ variant: 'success', title: 'Fotoğraf yüklendi' })
                  } else {
                    add({
                      variant: 'error',
                      title: 'Fotoğraf yüklenemedi',
                      description: data?.error ?? undefined,
                    })
                  }
                }}
              />
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              disabled={isSubmitting}
              className="mt-2 px-4 py-2 rounded bg-black text-white disabled:opacity-60"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!confirm('Silmek istediğinize emin misiniz?')) return
                const res = await fetch(
                  `/api/${params.org}/members/${params.id}`,
                  { method: 'DELETE' }
                )
                if (res.ok) {
                  add({ variant: 'success', title: 'Üye silindi' })
                  router.push(`/${params.org}/members`)
                  router.refresh()
                } else {
                  const data = await res.json().catch(() => null)
                  add({
                    variant: 'error',
                    title: 'Silme hatası',
                    description: data?.error ?? undefined,
                  })
                }
              }}
              className="mt-2 px-4 py-2 rounded border border-red-600 text-red-600"
            >
              Sil
            </button>
          </div>
        </form>
      )}
    </main>
  )
}
