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

export default async function UyelikBelgesiPage({
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

  // Get organization details
  const org = await prisma.organization.findUnique({
    where: { id: access.org.id },
    select: {
      name: true,
      address: true,
    },
  })

  // Get board president (with fallback to member title)
  const president = await getBoardPresident(prisma, access.org.id)

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/${params.org}/templates`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight mb-1">
            Üyelik Belgesi
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Önizleme</CardTitle>
            <CardDescription>Belge bu şekilde oluşturulacaktır</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-8 bg-white dark:bg-gray-900 min-h-[500px] print:border-0">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">
                  {org?.name || 'DERNEK ADI'}
                </h2>
                <h3 className="text-xl font-semibold">ÜYELİK BELGESİ</h3>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="mb-4">
                    Bu belge, aşağıda adı ve soyadı yazılı kişinin derneğimize
                    kayıtlı üye olduğunu gösterir.
                  </p>
                </div>

                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-semibold">Adı Soyadı:</p>
                      <p className="text-muted-foreground">
                        [Üye adı buraya gelecek]
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold">T.C. Kimlik No:</p>
                      <p className="text-muted-foreground">
                        [TC No buraya gelecek]
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold">Kayıt Tarihi:</p>
                      <p className="text-muted-foreground">
                        [Tarih buraya gelecek]
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold">Üyelik Durumu:</p>
                      <p className="text-muted-foreground">Aktif</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6 mt-8">
                  <div className="text-right">
                    <p className="mb-1">Yönetim Kurulu Başkanı</p>
                    <p className="font-semibold">
                      {president
                        ? `${president.firstName} ${president.lastName}`
                        : '[Başkan adı]'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">İmza</p>
                  </div>
                </div>

                <div className="border-t pt-4 mt-6 text-xs text-center text-muted-foreground">
                  <p>{org?.address || 'Dernek adresi'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info & Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kullanım</CardTitle>
              <CardDescription>Bu belge nasıl oluşturulur?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">
                  Üyeler Sayfasından Oluşturma
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Üyeler listesinde her üye için &quot;Üyelik Belgesi
                  Oluştur&quot; butonu bulunur. Bu butona tıklayarak seçili üye
                  için belge PDF olarak oluşturulur.
                </p>
                <Link href={`/${params.org}/members`}>
                  <Button variant="outline" className="w-full">
                    Üyeler Sayfasına Git
                  </Button>
                </Link>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Belge İçeriği</h4>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                  <li>Üye adı ve soyadı</li>
                  <li>T.C. Kimlik Numarası</li>
                  <li>Kayıt tarihi</li>
                  <li>Üyelik durumu</li>
                  <li>Yönetim Kurulu Başkanı imzası</li>
                  <li>Dernek logosu (varsa)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {president ? (
            <Card>
              <CardHeader>
                <CardTitle>İmza Yetkisi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <p className="mb-2">
                    <span className="font-semibold">
                      Yönetim Kurulu Başkanı:
                    </span>
                  </p>
                  <p className="text-lg font-semibold text-primary">
                    {president.firstName} {president.lastName}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-yellow-200 dark:border-yellow-800">
              <CardHeader>
                <CardTitle className="text-yellow-600 dark:text-yellow-400">
                  Uyarı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Yönetim Kurulu Başkanı bulunamadı. Belgelerde imza
                  gösterilmeyecektir. Lütfen Kurullar sayfasından Yönetim Kurulu
                  Başkanını atayın.
                </p>
                <Link href={`/${params.org}/boards`}>
                  <Button variant="outline" className="w-full mt-3">
                    Kurullar Sayfasına Git
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
