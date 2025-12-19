'use client'

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/toast'

// Regex pattern for website validation (with or without protocol)
const websitePattern =
  /^(https?:\/\/)?(www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+\/?.*$/

const schema = z.object({
  name: z.string().min(3, 'En az 3 karakter'),
  responsibleFirstName: z.string().min(2, 'En az 2 karakter'),
  responsibleLastName: z.string().min(2, 'En az 2 karakter'),
  description: z.string().optional(),
  email: z.string().email('Geçerli e‑posta girin').optional().or(z.literal('')),
  password: z
    .string()
    .min(6, 'Şifre en az 6 karakter olmalıdır')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z
    .string()
    .regex(websitePattern, 'Geçerli web adresi girin')
    .optional()
    .or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

export default function NewOrganizationForm() {
  const router = useRouter()
  const toast = useToast()
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setLogoFile(null)
      setLogoPreview(null)
    }
  }

  return (
    <form
      className="mt-6 space-y-6"
      onSubmit={handleSubmit(async (values) => {
        const formData = new FormData()
        formData.append('name', values.name)
        formData.append('responsibleFirstName', values.responsibleFirstName)
        formData.append('responsibleLastName', values.responsibleLastName)
        if (values.description)
          formData.append('description', values.description)
        if (values.email) formData.append('email', values.email)
        if (values.password) formData.append('password', values.password)
        if (values.phone) formData.append('phone', values.phone)
        if (values.address) formData.append('address', values.address)
        if (values.website) formData.append('website', values.website)
        if (logoFile) formData.append('logo', logoFile)

        const res = await fetch('/api/org', {
          method: 'POST',
          body: formData,
        })
        if (res.ok) {
          const json = await res.json().catch(() => null)
          const slug = json?.item?.slug as string | undefined
          toast.add({ variant: 'success', title: 'Dernek oluşturuldu' })
          if (slug) {
            router.push(`/${slug}/members`)
          } else {
            router.push('/org')
          }
          router.refresh()
        } else {
          const data = await res.json().catch(() => null)
          // Try to map validation issues to fields
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
                // @ts-ignore react-hook-form name typing
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
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium">Ad</label>
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
        <div className="sm:col-span-1">
          <label className="block text-sm font-medium">Sorumlu Kişi Adı</label>
          <Input
            className="mt-1"
            {...register('responsibleFirstName')}
            placeholder="Ad"
          />
          {errors.responsibleFirstName && (
            <p className="mt-1 text-sm text-red-600">
              {errors.responsibleFirstName.message as string}
            </p>
          )}
        </div>
        <div className="sm:col-span-1">
          <label className="block text-sm font-medium">
            Sorumlu Kişi Soyadı
          </label>
          <Input
            className="mt-1"
            {...register('responsibleLastName')}
            placeholder="Soyad"
          />
          {errors.responsibleLastName && (
            <p className="mt-1 text-sm text-red-600">
              {errors.responsibleLastName.message as string}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-1">
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
        <div className="sm:col-span-1">
          <label className="block text-sm font-medium">Şifre</label>
          <Input
            className="mt-1"
            {...register('password')}
            placeholder="En az 6 karakter"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">
              {errors.password.message as string}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <label className="block text-sm font-medium">Telefon</label>
          <Input
            className="mt-1"
            {...register('phone')}
            placeholder="(5xx) xxx xx xx"
          />
        </div>
        <div className="sm:col-span-1"></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-1">
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
        <div className="sm:col-span-1">
          <label className="block text-sm font-medium">Adres</label>
          <Input
            className="mt-1"
            {...register('address')}
            placeholder="Açık adres"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
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
                onClick={() => {
                  setLogoFile(null)
                  setLogoPreview(null)
                }}
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

      <Separator />

      <div className="flex gap-2">
        <Button disabled={isSubmitting}>
          {isSubmitting ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      </div>
    </form>
  )
}
