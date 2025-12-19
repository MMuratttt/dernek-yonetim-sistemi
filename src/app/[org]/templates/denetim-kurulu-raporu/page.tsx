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
import { DenetimKuruluRaporuEditor } from '@/components/DenetimKuruluRaporuEditor'

export default async function DenetimKuruluRaporuPage({
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
    },
  })

  // Get Denetim Kurulu Başkanı - member with title DENETIM_KURULU_BASKANI
  const denetimKuruluBaskani = await prisma.member.findFirst({
    where: {
      organizationId: access.org.id,
      title: 'DENETIM_KURULU_BASKANI',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  })

  const chairmanData = denetimKuruluBaskani
    ? {
        id: denetimKuruluBaskani.id,
        name: `${denetimKuruluBaskani.firstName} ${denetimKuruluBaskani.lastName}`,
      }
    : null

  // Get Denetim Kurulu Üyeleri (Asil) - members with title DENETIM_KURULU_ASIL
  const denetimKuruluUyeleri = await prisma.member.findMany({
    where: {
      organizationId: access.org.id,
      title: 'DENETIM_KURULU_ASIL',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  })

  const boardMembersData = denetimKuruluUyeleri.map((m) => ({
    id: m.id,
    name: `${m.firstName} ${m.lastName}`,
  }))

  // Get all organization members for the picker
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
            Denetim Kurulu Raporu
          </h1>
        </div>
      </div>

      <DenetimKuruluRaporuEditor
        orgName={org?.name || 'Dernek Adı'}
        chairman={chairmanData}
        members={boardMembersData}
        availableMembers={availableMembers}
      />

      <div className="grid grid-cols-1 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Bilgilendirme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Rapor Hakkında</h4>
              <p className="text-sm text-muted-foreground">
                Denetim Kurulu Raporu, derneğin mali ve idari işlemlerinin
                denetlenmesi sonucu hazırlanır. Yukarıdaki formu kullanarak
                denetim bulgularınızı ve önerilerinizi girebilirsiniz.
              </p>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">İçerik</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Denetim Kurulu Başkanı ve üyeler</li>
                <li>Defter ve belgelerin incelenmesi</li>
                <li>Gelirlerin kontrolü</li>
                <li>3 yıllık mali durum özeti</li>
                <li>Sonuç ve öneriler</li>
                <li>Denetim Kurulu üye imzaları</li>
              </ul>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Nasıl Kullanılır?</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Denetim Kurulu başkan ve üyelerini girin</li>
                <li>Her bölüm için denetim bulgularını ekleyin</li>
                <li>Sonuç ve önerilerinizi yazın</li>
                <li>Önizleme bölümünden raporu kontrol edin</li>
                <li>&quot;PDF İndir&quot; butonuna tıklayın</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
