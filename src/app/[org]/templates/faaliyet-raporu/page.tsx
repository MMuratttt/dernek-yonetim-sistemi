import { getSession } from '../../../../lib/auth'
import { ensureOrgAccessBySlug } from '../../../../lib/authz'
import { prisma } from '../../../../lib/prisma'
import { getBoardPresident } from '../../../../lib/boardSync'
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
import { FaaliyetRaporuEditor } from '@/components/FaaliyetRaporuEditor'

export default async function FaaliyetRaporuPage({
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

  // Get board president (with fallback to member title)
  const president = await getBoardPresident(prisma, access.org.id)

  const presidentName = president
    ? `${president.firstName} ${president.lastName}`
    : 'Başkan atanmamış'

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
            Faaliyet Raporu
          </h1>
        </div>
      </div>

      <FaaliyetRaporuEditor
        orgName={org?.name || 'Dernek Adı'}
        presidentName={presidentName}
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
                Faaliyet Raporu, derneğin belirli bir dönemdeki tüm
                çalışmalarını özetler. Yukarıdaki formu kullanarak yıl bazında
                faaliyetlerinizi ekleyebilirsiniz.
              </p>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">İçerik</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Yıl bazında gerçekleştirilen faaliyetler</li>
                <li>Bakım ve onarım çalışmaları</li>
                <li>Sosyal sorumluluk projeleri</li>
                <li>Mali durum değerlendirmesi</li>
              </ul>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Nasıl Kullanılır?</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Her yıl için faaliyetleri ekleyin</li>
                <li>Gerekirse yeni yıl ekleyebilir veya silebilirsiniz</li>
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
