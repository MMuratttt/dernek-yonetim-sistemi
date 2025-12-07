import Link from 'next/link'
import { LinkButton } from '@/components/ui/link-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { ListRow } from '@/components/ui/list-row'
import { getSession } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'
import { ensureOrgAccessBySlug } from '../../../lib/authz'

type TemplateListItem = {
  id: string
  name: string
  slug: string
  description?: string | null
  updatedAt?: string
}

export default async function TemplatesPage({
  params: paramsPromise,
  searchParams,
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

  const q = (searchParams?.q ?? '').toString().trim()
  const where: any = { organizationId: access.org.id }
  if (q)
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
    ]
  const items: TemplateListItem[] = await (prisma as any).template.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      updatedAt: true,
    },
  })

  return (
    <div>
      <Breadcrumbs
        items={[{ label: 'Şablonlar', href: `/${params.org}/templates` }]}
      />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold leading-none tracking-tight">
          Şablonlar
        </h1>
        <LinkButton
          href={`/${params.org}/templates/new`}
          size="sm"
          variant="outline"
        >
          Yeni Şablon
        </LinkButton>
      </div>
      <form
        className="mb-2 flex items-center gap-2"
        role="search"
        aria-label="Şablon arama"
      >
        <Input
          name="q"
          defaultValue={q}
          placeholder="Ara: ad veya slug"
          aria-label="Şablon ara"
          className="flex-1"
        />
        <Button type="submit" variant="outline" aria-label="Ara">
          Ara
        </Button>
        {q && (
          <Link
            href={`/${params.org}/templates`}
            className="text-xs underline"
            aria-label="Sıfırla"
          >
            Sıfırla
          </Link>
        )}
      </form>
      <div className="mb-4 text-xs text-muted-foreground">
        Toplam: {items.length}
      </div>
      <ul className="divide-y rounded-md border bg-card">
        {items.map((t) => (
          <ListRow key={t.id}>
            <div>
              <div className="font-medium">{t.name}</div>
              {t.description && (
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {t.description}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                /{params.org}/templates/{t.slug}
                {t.updatedAt
                  ? ` • Güncellendi: ${new Date(t.updatedAt).toLocaleString()}`
                  : ''}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/${params.org}/templates/${t.slug}`}
                className="text-xs underline"
              >
                Düzenle
              </Link>
              <Link
                href={`/${params.org}/members?tpl=${t.slug}`}
                className="text-xs underline"
              >
                Üyelerle kullan
              </Link>
            </div>
          </ListRow>
        ))}
        {items.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">
            Henüz şablon yok.{' '}
            <Link className="underline" href={`/${params.org}/templates/new`}>
              İlk şablonu ekleyin
            </Link>
            .
          </li>
        )}
      </ul>
    </div>
  )
}
