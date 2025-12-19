import { getSession } from '../../../../lib/auth'
import { ensureOrgAccessBySlug } from '../../../../lib/authz'
import { prisma } from '../../../../lib/prisma'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { GenelKurulDivanEditor } from '@/components/GenelKurulDivanEditor'

export default async function GenelKurulDivanTutanagiPage({
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

  // Get total member count for the organization
  const totalMemberCount = await prisma.member.count({
    where: {
      organizationId: access.org.id,
      status: 'ACTIVE',
    },
  })

  // Get all organization members for the dropdown picker
  const allMembers = await prisma.member.findMany({
    where: {
      organizationId: access.org.id,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  })

  const availableMembers = allMembers.map((m) => ({
    id: m.id,
    name: `${m.firstName} ${m.lastName}`,
  }))

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
            Genel Kurul Divan Tutanağı
          </h1>
        </div>
      </div>

      <GenelKurulDivanEditor
        orgName={org?.name || 'Dernek Adı'}
        orgAddress={org?.address || ''}
        totalMemberCount={totalMemberCount}
        availableMembers={availableMembers}
      />

      <div className="grid grid-cols-1 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Bilgilendirme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Tutanak Hakkında</h4>
              <p className="text-sm text-muted-foreground">
                Genel Kurul Divan Tutanağı, genel kurul toplantısının resmi
                kaydıdır. Yukarıdaki formu kullanarak tutanak içeriğini
                düzenleyebilir ve PDF olarak indirebilirsiniz.
              </p>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">İçerik</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Toplantı tarihi, saati ve yeri</li>
                <li>Katılım durumu ve yoklama</li>
                <li>Divan başkanı ve katip seçimi</li>
                <li>Gündem maddeleri</li>
                <li>Yönetim ve Denetim Kurulu seçimleri</li>
                <li>Yeni kurul üyeleri listesi</li>
              </ul>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Nasıl Kullanılır?</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Yukarıdaki formları doldurun</li>
                <li>Önizleme bölümünden tutanağı kontrol edin</li>
                <li>&quot;PDF İndir&quot; butonuna tıklayın</li>
                <li>İndirilen PDF&apos;i yazdırıp imzalayın</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
