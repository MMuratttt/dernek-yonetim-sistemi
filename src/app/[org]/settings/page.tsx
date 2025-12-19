import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ensureOrgAccessBySlug } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ org: string }>
}) {
  const { org } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  const access = await ensureOrgAccessBySlug(session.user.id as string, org)
  if (access.notFound) return <div>Dernek bulunamadı.</div>
  if (!access.allowed)
    return <div className="p-6">Bu derneğe erişiminiz yok.</div>

  const role = access.role as 'SUPERADMIN' | 'ADMIN' | null
  const canWrite = role === 'SUPERADMIN' || role === 'ADMIN'

  // Fetch full organization details
  const organization = await prisma.organization.findUnique({
    where: { slug: org },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      address: true,
      phone: true,
      email: true,
      website: true,
      logoUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!organization) {
    return <div>Dernek bulunamadı.</div>
  }

  return (
    <main>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dernek Ayarları</h1>
        <p className="text-muted-foreground mt-1">
          Dernek bilgilerini görüntüleyin ve düzenleyin
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <SettingsClient
          org={org}
          initialData={{
            ...organization,
            createdAt: organization.createdAt.toISOString(),
            updatedAt: organization.updatedAt.toISOString(),
          }}
          canWrite={canWrite}
        />
      </div>
    </main>
  )
}
