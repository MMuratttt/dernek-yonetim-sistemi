'use client'

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
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

const addAdminSchema = z.object({
  firstName: z.string().min(2, 'En az 2 karakter'),
  lastName: z.string().min(2, 'En az 2 karakter'),
  email: z.string().email('Geçerli e-posta girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
})

const updatePasswordSchema = z.object({
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
})

type FormValues = z.infer<typeof schema>
type AddAdminFormValues = z.infer<typeof addAdminSchema>
type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>

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

interface AdminUser {
  id: string
  membershipId: string
  firstName: string
  lastName: string
  email: string
  role: string
}

interface SettingsClientProps {
  org: string
  initialData: Organization
  adminUsers: AdminUser[]
  canWrite: boolean
}

export function SettingsClient({
  org,
  initialData,
  adminUsers,
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

  // Admin management state
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [isAddingAdmin, setIsAddingAdmin] = useState(false)
  const [passwordEditUserId, setPasswordEditUserId] = useState<string | null>(
    null
  )
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

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

  // Add admin form
  const {
    register: registerAddAdmin,
    handleSubmit: handleSubmitAddAdmin,
    reset: resetAddAdmin,
    formState: { errors: addAdminErrors },
  } = useForm<AddAdminFormValues>({
    resolver: zodResolver(addAdminSchema),
  })

  // Update password form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
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

  // Add admin handler
  const onAddAdmin = async (values: AddAdminFormValues) => {
    setIsAddingAdmin(true)
    try {
      const res = await fetch(`/api/${org}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (res.ok) {
        toast.add({ variant: 'success', title: 'Yönetici eklendi' })
        resetAddAdmin()
        setShowAddAdmin(false)
        router.refresh()
      } else {
        const data = await res.json().catch(() => null)
        toast.add({
          variant: 'error',
          title: 'Hata',
          description: data?.error ?? 'Yönetici eklenemedi',
        })
      }
    } finally {
      setIsAddingAdmin(false)
    }
  }

  // Update password handler
  const onUpdatePassword = async (values: UpdatePasswordFormValues) => {
    if (!passwordEditUserId) return
    setIsUpdatingPassword(true)
    try {
      const res = await fetch(`/api/${org}/admins`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: passwordEditUserId,
          password: values.password,
        }),
      })

      if (res.ok) {
        toast.add({ variant: 'success', title: 'Şifre güncellendi' })
        resetPassword()
        setPasswordEditUserId(null)
      } else {
        const data = await res.json().catch(() => null)
        toast.add({
          variant: 'error',
          title: 'Hata',
          description: data?.error ?? 'Şifre güncellenemedi',
        })
      }
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  // Delete admin handler
  const onDeleteAdmin = async (userId: string) => {
    setDeletingUserId(userId)
    try {
      const res = await fetch(`/api/${org}/admins`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (res.ok) {
        toast.add({ variant: 'success', title: 'Yönetici kaldırıldı' })
        router.refresh()
      } else {
        const data = await res.json().catch(() => null)
        toast.add({
          variant: 'error',
          title: 'Hata',
          description: data?.error ?? 'Yönetici kaldırılamadı',
        })
      }
    } finally {
      setDeletingUserId(null)
    }
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
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
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

        {/* Admin Users Section */}
        <div className="border-t pt-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                <svg
                  className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Yöneticiler</h3>
                <p className="text-sm text-muted-foreground">
                  Dernek yönetim yetkisine sahip kullanıcılar
                </p>
              </div>
            </div>
            {canWrite && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddAdmin(true)}
              >
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Yönetici Ekle
              </Button>
            )}
          </div>

          {/* Add Admin Form */}
          {showAddAdmin && (
            <div className="mb-6 p-4 rounded-lg border bg-muted/50">
              <h4 className="font-medium mb-4">Yeni Yönetici Ekle</h4>
              <form
                onSubmit={handleSubmitAddAdmin(onAddAdmin)}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Ad <span className="text-red-500">*</span>
                    </label>
                    <Input
                      {...registerAddAdmin('firstName')}
                      placeholder="Ad"
                    />
                    {addAdminErrors.firstName && (
                      <p className="mt-1 text-sm text-red-600">
                        {addAdminErrors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Soyad <span className="text-red-500">*</span>
                    </label>
                    <Input
                      {...registerAddAdmin('lastName')}
                      placeholder="Soyad"
                    />
                    {addAdminErrors.lastName && (
                      <p className="mt-1 text-sm text-red-600">
                        {addAdminErrors.lastName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      E-posta <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      {...registerAddAdmin('email')}
                      placeholder="ornek@email.com"
                    />
                    {addAdminErrors.email && (
                      <p className="mt-1 text-sm text-red-600">
                        {addAdminErrors.email.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Şifre <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="password"
                      {...registerAddAdmin('password')}
                      placeholder="En az 6 karakter"
                    />
                    {addAdminErrors.password && (
                      <p className="mt-1 text-sm text-red-600">
                        {addAdminErrors.password.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isAddingAdmin} size="sm">
                    {isAddingAdmin ? 'Ekleniyor…' : 'Ekle'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      resetAddAdmin()
                      setShowAddAdmin(false)
                    }}
                    disabled={isAddingAdmin}
                  >
                    İptal
                  </Button>
                </div>
              </form>
            </div>
          )}

          {adminUsers.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {adminUsers.map((admin) => (
                <div
                  key={admin.id}
                  className="rounded-lg border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        {(admin.firstName?.[0] || '') +
                          (admin.lastName?.[0] || '')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {admin.firstName} {admin.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {admin.email}
                      </p>
                    </div>
                  </div>

                  {/* Password Edit Form */}
                  {passwordEditUserId === admin.id ? (
                    <form
                      onSubmit={handleSubmitPassword(onUpdatePassword)}
                      className="mt-3 space-y-2"
                    >
                      <div>
                        <Input
                          type="password"
                          {...registerPassword('password')}
                          placeholder="Yeni şifre (en az 6 karakter)"
                          className="h-9 text-sm"
                        />
                        {passwordErrors.password && (
                          <p className="mt-1 text-xs text-red-600">
                            {passwordErrors.password.message}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={isUpdatingPassword}
                          className="h-8 text-xs"
                        >
                          {isUpdatingPassword ? 'Kaydediliyor…' : 'Kaydet'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            resetPassword()
                            setPasswordEditUserId(null)
                          }}
                          disabled={isUpdatingPassword}
                        >
                          İptal
                        </Button>
                      </div>
                    </form>
                  ) : (
                    canWrite && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            resetPassword()
                            setPasswordEditUserId(admin.id)
                          }}
                        >
                          <svg
                            className="w-3 h-3 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                            />
                          </svg>
                          Şifre Değiştir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => {
                            if (
                              confirm(
                                'Bu yöneticiyi kaldırmak istediğinize emin misiniz?'
                              )
                            ) {
                              onDeleteAdmin(admin.id)
                            }
                          }}
                          disabled={deletingUserId === admin.id}
                        >
                          {deletingUserId === admin.id ? (
                            'Siliniyor…'
                          ) : (
                            <>
                              <svg
                                className="w-3 h-3 mr-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              Kaldır
                            </>
                          )}
                        </Button>
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <svg
                className="w-12 h-12 mx-auto mb-3 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p>Henüz yönetici eklenmemiş</p>
              {canWrite && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowAddAdmin(true)}
                >
                  İlk Yöneticiyi Ekle
                </Button>
              )}
            </div>
          )}
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
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
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
