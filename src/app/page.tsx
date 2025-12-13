import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Hero from '@/components/landing/Hero'
import FeatureCard from '@/components/landing/FeatureCard'
import Footer from '@/components/landing/Footer'
import Showcase from '@/components/landing/Showcase'
import CTA from '@/components/landing/CTA'
import Reveal from '@/components/landing/Reveal'
import {
  Users,
  CreditCard,
  PieChart,
  FileText,
  Settings,
  CalendarDays,
} from 'lucide-react'

export default async function HomePage() {
  // We no longer redirect logged-in users away; landing page should be viewable even when authenticated.
  // (Session retrieved only if future personalization needed.)
  await getServerSession(authOptions)

  const features = [
    {
      icon: Users,
      title: 'Üye Yönetimi',
      description:
        'Kapsamlı arama, toplu işlemler, etiket ve gruplar. Üyeleri kolayca organize edin ve yönetin.',
    },
    {
      icon: CreditCard,
      title: 'Aidat ve Tahsilat',
      description:
        'Esnek dönemler, otomatik borçlandırma ve raporlar. Ödeme süreçlerini otomatikleştirin.',
    },
    {
      icon: PieChart,
      title: 'Gelir/Gider',
      description:
        'Kasa, banka, kategori bazlı izleme ve özet panolar. Mali durumunuzu tek bakışta görün.',
    },
    {
      icon: CalendarDays,
      title: 'Toplantılar',
      description:
        'Gündem, yoklama, karar ve imza süreçleri. Toplantılarınızı dijital ortamda yönetin.',
    },
    {
      icon: FileText,
      title: 'Şablonlar',
      description:
        'Word/Docx çıktı, e‑posta ve PDF şablon desteği. Belgelerinizi hızlıca oluşturun.',
    },
    {
      icon: Settings,
      title: 'Yetkilendirme',
      description:
        'Rol bazlı erişim, çoklu dernek ve organizasyonlar. Güvenli ve esnek yetki yönetimi.',
    },
  ]

  return (
    <div className="space-y-12">
      <Reveal>
        <Hero />
      </Reveal>

      <section className="rounded-2xl border bg-gradient-to-br from-background to-muted/20 p-8 shadow-sm">
        <Reveal>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-2">
              Öne Çıkan Özellikler
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Derneğinizi yönetmek için ihtiyacınız olan her şey, modern ve
              kullanıcı dostu bir arayüzde.
            </p>
          </div>
        </Reveal>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 80}>
              <FeatureCard
                icon={f.icon}
                title={f.title}
                description={f.description}
              />
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal delay={100}>
        <Showcase />
      </Reveal>

      <Reveal delay={100}>
        <CTA />
      </Reveal>

      <Footer />
    </div>
  )
}
