'use client'

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

// Regex pattern for website validation (with or without protocol)
const websitePattern =
  /^(https?:\/\/)?(www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+\/?.*$/

const schema = z.object({
  name: z.string().min(3, 'En az 3 karakter'),
  description: z.string().optional(),
  email: z.string().email('Geçerli e‑posta girin').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z
    .string()
    .regex(websitePattern, 'Geçerli web adresi girin')
    .optional()
    .or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

interface Organization {
  id: string
  name: string
  slug: string
  description?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  logoUrl?: string | null
  createdAt: string
  updatedAt: string
}

interface SettingsClientProps {
  org: string
  initialData: Organization
  canWrite: boolean
}

export function SettingsClient({
  org,
  initialData,
  canWrite,
}: SettingsClientProps) {
  const router = useRouter()
  const toast = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(
    initialData.logoUrl || null
  )
  const [removeLogo, setRemoveLogo] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialData.name,
      description: initialData.description || '',
      email: initialData.email || '',
      phone: initialData.phone || '',
      address: initialData.address || '',
      website: initialData.website || '',
    },
  })

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      setRemoveLogo(false)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    setRemoveLogo(true)
  }

  const handleCancel = () => {
    reset({
      name: initialData.name,
      description: initialData.description || '',
      email: initialData.email || '',
      phone: initialData.phone || '',
      address: initialData.address || '',
      website: initialData.website || '',
    })
    setLogoFile(null)
    setLogoPreview(initialData.logoUrl || null)
    setRemoveLogo(false)
    setIsEditing(false)
  }

  const onSubmit = async (values: FormValues) => {
    const formData = new FormData()
    formData.append('name', values.name)
    if (values.description) formData.append('description', values.description)
    if (values.email) formData.append('email', values.email)
    if (values.phone) formData.append('phone', values.phone)
    if (values.address) formData.append('address', values.address)
    if (values.website) formData.append('website', values.website)
    if (logoFile) formData.append('logo', logoFile)
    if (removeLogo) formData.append('removeLogo', 'true')

    const res = await fetch(`/api/org/${org}`, {
      method: 'PATCH',
      body: formData,
    })

    if (res.ok) {
      toast.add({ variant: 'success', title: 'Dernek bilgileri güncellendi' })
      setIsEditing(false)
      router.refresh()
    } else {
      const data = await res.json().catch(() => null)
      const issues =
        (data?.details as
          | Array<{ path?: (string | number)[]; message?: string }>
          | undefined) ?? []
      if (Array.isArray(issues) && issues.length > 0) {
        issues.forEach((i) => {
          const name = Array.isArray(i.path)
            ? (i.path.join('.') as keyof FormValues)
            : undefined
          if (name && i.message) {
            setError(name, { type: 'server', message: i.message })
          }
        })
      }
      toast.add({
        variant: 'error',
        title: 'Hata',
        description: data?.error ?? 'Kaydetme hatası',
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            {initialData.logoUrl ? (
              <img
                src={initialData.logoUrl}
                alt={`${initialData.name} logosu`}
                className="h-24 w-24 object-contain rounded-lg border bg-white shadow-sm"
              />
            ) : (
              <div className="h-24 w-24 rounded-lg border bg-muted flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold">{initialData.name}</h2>
              {initialData.description && (
                <p className="text-muted-foreground mt-1">
                  {initialData.description}
                </p>
              )}
            </div>
          </div>
          {canWrite && (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <svg
                className="w-4 h-4 mr-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Düzenle
            </Button>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              E-posta
            </div>
            <p className="text-foreground">
              {initialData.email || (
                <span className="text-muted-foreground italic">
                  Belirtilmemiş
                </span>
              )}
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              Telefon
            </div>
            <p className="text-foreground">
              {initialData.phone || (
                <span className="text-muted-foreground italic">
                  Belirtilmemiş
                </span>
              )}
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
              Website
            </div>
            <p className="text-foreground">
              {initialData.website ? (
                <a
                  href={initialData.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {initialData.website}
                </a>
              ) : (
                <span className="text-muted-foreground italic">
                  Belirtilmemiş
                </span>
              )}
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4 shadow-sm sm:col-span-2 lg:col-span-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Adres
            </div>
            <p className="text-foreground">
              {initialData.address || (
                <span className="text-muted-foreground italic">
                  Belirtilmemiş
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="border-t pt-4 mt-6">
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">Oluşturulma:</span>{' '}
              {formatDate(initialData.createdAt)}
            </div>
            <div>
              <span className="font-medium">Son Güncelleme:</span>{' '}
              {formatDate(initialData.updatedAt)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Dernek Bilgilerini Düzenle</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium">Dernek Adı *</label>
          <Input
            className="mt-1"
            {...register('name')}
            placeholder="Örn: İstanbul Yazılım Derneği"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">
              {errors.name.message as string}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">E‑posta</label>
          <Input
            className="mt-1"
            {...register('email')}
            placeholder="info@ornek.org"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">
              {errors.email.message as string}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">Telefon</label>
          <Input
            className="mt-1"
            {...register('phone')}
            placeholder="(5xx) xxx xx xx"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Website</label>
          <Input
            className="mt-1"
            {...register('website')}
            placeholder="https://ornek.org"
          />
          {errors.website && (
            <p className="mt-1 text-sm text-red-600">
              {errors.website.message as string}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">Adres</label>
          <Input
            className="mt-1"
            {...register('address')}
            placeholder="Açık adres"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Logo</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleLogoChange}
          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
        />
        {logoPreview && (
          <div className="mt-3 relative inline-block group">
            <img
              src={logoPreview}
              alt="Logo önizleme"
              className="h-20 w-20 object-contain rounded border"
            />
            <button
              type="button"
              onClick={handleRemoveLogo}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md"
              aria-label="Logoyu kaldır"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium">Açıklama</label>
        <textarea
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
          rows={4}
          {...register('description')}
          placeholder="Kısa açıklama (opsiyonel)"
        />
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          İptal
        </Button>
      </div>
    </form>
  )
}
