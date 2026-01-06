import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import NewOrganizationForm from '@/app/org/new/ui'
import { canCreateOrg } from '@/lib/authz'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

export default async function NewOrganizationPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/auth/signin')

  // Only users who can create orgs (superadmins or first user) can access this page
  const canCreate = await canCreateOrg(session.user.id)
  if (!canCreate) redirect('/org')

  return (
    <main className="min-h-screen">
      {/* Decorative Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <Link
            href="/org"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Derneklere Dön
          </Link>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7 text-white"
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
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Yeni Dernek Oluştur
              </h1>
              <p className="text-muted-foreground mt-1">
                Dernek bilgilerini girerek yeni bir dernek oluşturun.
              </p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <Card className="shadow-xl shadow-primary/5">
          <CardContent className="p-6 sm:p-8">
            <NewOrganizationForm />
          </CardContent>
        </Card>

        {/* Info Notice */}
        <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-amber-600 dark:text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                Bilgi
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Dernek yöneticisi için şifre belirlediğinizde, e-posta ve şifre
                bilgileri otomatik olarak derneğe kaydedilir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
