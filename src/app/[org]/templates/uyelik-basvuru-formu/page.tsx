import { getSession } from '../../../../lib/auth'
import { ensureOrgAccessBySlug } from '../../../../lib/authz'
import { prisma } from '../../../../lib/prisma'
import { getBoardPresident } from '../../../../lib/boardSync'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import FormEditor from './FormEditor'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function UyelikBasvuruFormuPage({
  params: paramsPromise,
}: any) {
  const params = await paramsPromise
  const session = await getSession()
  if (!session?.user) return <div>Giriş gerekli</div>
  const access = await ensureOrgAccessBySlug(
    session.user.id as string,
    params.org
  )
  if (access.notFound) return <div>Dernek bulunamadı</div>
  if (!access.allowed) return <div>Erişim yok</div>

  const org = await prisma.organization.findUnique({
    where: { id: access.org.id },
    select: {
      name: true,
      address: true,
    },
  })

  // Get current board chairman (with fallback to member title)
  const president = await getBoardPresident(prisma, access.org.id)
  const chairmanName = president
    ? `${president.firstName} ${president.lastName}`
    : null

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/${params.org}/templates`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold leading-none tracking-tight mb-1">
            Üyelik Başvuru Formu
          </h1>
        </div>
      </div>

      <FormEditor
        orgName={org?.name || 'DERNEK ADI'}
        orgAddress={org?.address || null}
        chairmanName={chairmanName}
      />
    </div>
  )
}
