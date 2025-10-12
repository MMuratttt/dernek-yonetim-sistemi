# Dernek Yönetim Sistemi – Yol Haritası (Roadmap)

Bu dosya geliştirme sırasını ve kapsamı belirler. İş paketleri milestone’lara ayrılmıştır. Her adım tamamlandıkça işaretleyin.

## M0 – Proje Kurulumu ve Altyapı

- [x] Proje iskeleti (Next.js 14/15 App Router, TypeScript, TailwindCSS, ESLint, Prettier)
- [x] UI Kit: temel atomlar genişletildi (Button, Input, Select, Checkbox, Badge, Card, Separator, Skeleton, Toast) – token tabanlı tema ile
- [x] State & data: React Query
- [x] ORM: Prisma + PostgreSQL (Docker Compose ile lokal) – migration/seed çalıştırıldı
- [x] .env yönetimi (.env, .env.local, .env.example)
- [x] Temel layout, tema (açık/koyu), responsive grid (temel)
- [x] Komponent mimarisi, UI rehberi (Providers başlangıcı)
- [x] Husky + Lint-Staged + Prettier (commit kalite hattı)
- [x] CI (GitHub Actions) – lint, typecheck, build (workflow mevcut)

Notlar:

- Lint-staged Node 20 gereksinimi için geçici olarak ^15.x sürümü sabitlendi (Node 18 uyumlu).
- Docker Compose komutları için Docker Desktop kurulu ve çalışır olmalı.

## M1 – Kimlik Doğrulama ve Çoklu-Tenant Mimarisi

- [x] Auth: NextAuth temel kurulum (Credentials) – Prisma Adapter
- [x] Rol & Yetki: Superadmin, Dernek Yöneticisi, Personel, Üye (auth helpers + endpoint guard’ları; yazma işlemleri WRITE_ROLES ile sınırlı)
- [x] Tenant modeli ve guard’lar (slug tabanlı) – API ve layout katmanında erişim kontrolü
- [~] Domain/subdomain yönlendirme (middleware ile opsiyonel; ENABLE_SUBDOMAIN_ROUTING=1 ile etkin)

## M2 – Üye Yönetimi

- [x] Üye modeli (kimlik, iletişim, adres, meslek, kayıt tarihi, durum)
- [x] Üye ekleme/çıkarma/düzenleme (API edit/delete eklendi)
- [x] Arama, filtreleme, sıralama, sayfalama (API + UI; çoklu etiket filtresi ve chip tıklama ile filtreleme; AND/OR etiket modu UI eklendi, sonsuz kaydırma bu moda göre çalışır)
- [~] Toplu import (Excel/CSV) ve export (Excel/CSV) – CSV/XLSX import & export tamam; export geliştirildi (Etiketler ve Gruplar sütunu, aktif filtrelere göre dışa aktarım). Import API geliştirildi: dry-run, create/update tespiti, yinelenen satır atlama, detaylı sonuçlar. UI önizleme ve sonuç banner’ı mevcut; ek iyileştirmeler sürecek.
- [x] Etiketler (model + API + UI başlangıcı), çoklu etiket filtresi ve chip’ler
- [x] Gruplar, komisyonlar – Model + API eklendi (Group, MemberGroup). Üye listesinde grup filtresi (OR/AND) ve chip tıklama ile filtreleme, export'ta “Gruplar” sütunu ve filtre desteği eklendi. Yönetim UI’si eklendi: oluştur/düzenle/sil (/[org]/groups).
- [x] Üye fotoğrafı/dosya yönetimi (Varsayılan: local/ücretsiz; Opsiyonel: S3/MinIO)

## M3 – Evrak/Şablon ve PDF/Word Üretimi

- [x] Şablon motoru: değişkenlerle (örn. {{uye.ad}}) dinamik evrak (Mustache ile temel kurulum, tenant başına şablon CRUD ve render API)
- [x] Hazirun listesi (çoklu seçimle şablon üretimi) – Üye listesinden şablon seçip PDF oluşturma eklendi (/api/[org]/members/render)
- [x] Genel Kurul evrak şablonları (seed ile örnek: genel-kurul-daveti)
- [x] Yönetim/Denetim Kurulu listeleri şablonları (seed ile örnek: kurul-listesi)
- [x] PDF üretimi (HTML-to-PDF via Playwright)
- [x] DOCX üretimi (temel, docx kütüphanesi ile)
- [ ] Şablon sürümleme ve paylaşımlar

## M4 – Kurullar ve Organizasyon Şeması

- [x] Yönetim Kurulu ve Denetim Kurulu modelleri (Prisma: Board, BoardTerm, BoardMember, BoardDecision; enum: BoardType, BoardMemberRole)
- [x] Görev dağılımı, dönem bilgileri (Model+API: /api/[org]/boards, /boards/terms, /boards/members; UI: /[org]/boards liste + detay sayfasında dönem oluşturma/aktif etme ve üye atama/rol/sıra yönetimi tamamlandı)
- [~] Şema/diagram görünümü (basit liste görünümü eklendi; görsel şema için kütüphane seçim/entegrasyon sonraya)
- [x] Kurul kararları ve tutanakları (API: /api/[org]/boards/decisions – CRUD; UI: detay sayfasında karar ekleme/silme)

## M5 – Toplantılar ve Genel Kurul Süreçleri

- [x] Toplantı planlama, gündem, davetiye, yoklama (Model + API: /api/[org]/meetings, /meetings/agendas, /meetings/invites, /meetings/attendance; UI: /[org]/meetings liste & oluşturma)
- [~] Vekalet/temsil, hazirun doğrulama (Model + API: /meetings/proxies; yoklama üzerinden temel doğrulama – ek kurallar ve raporlar sonraya)
- [~] Karar ve tutanak üretimi (Model + API: /meetings/decisions, /meetings/minutes; PDF/DOCX çıktı ve şablon entegrasyonu sonraki iterasyonda)

## M6 – Üyelik Aidat/Finans

- [x] Aidat planları, dönemler, ödeme kaydı (CRUD başlangıç API’leri ve basit UI)
- [x] Makbuz PDF (tek işlem için basit Playwright çıktısı)
- [ ] Borç (otomatik borçlandırma) ve bakiye hesaplama, raporlar

## M7 – İletişim (Toplu SMS / WhatsApp / E-posta)

- [ ] SMS sağlayıcı entegrasyonu (free)
- [ ] İzin yönetimi (KVKK/GDPR uyumlu onaylar)
- [ ] Kampanya istatistikleri, başarısız gönderimler

## M8 – İçerik ve Duyurular

- [ ] Dernek sayfası (her dernek için mini site): Haberler, etkinlikler
- [ ] Duyurular, doküman paylaşımı, medya yönetimi
- [ ] SEO ve sosyal önizlemeler

## M9 – Denetim, Loglama, İzlenebilirlik

- [ ] Audit log (kim ne yaptı?)
- [ ] Gelişmiş yetkilendirme politikaları (row-level checks)
- [ ] Rate limiting ve güvenlik katmanları
- [x] Üyelik rolü sorgu endpoint’i: /api/[org]/me

## M10 – Raporlama ve Analitik

- [ ] Üyelik istatistikleri (büyüme, terk)
- [ ] Katılım oranları, iletişim performansı
- [ ] Dışa aktarım (PDF/CSV/Excel)

## M11 – Kullanılabilirlik ve Mobil

- [ ] PWA
- [ ] Mobil uyumlu arayüzler (liste/karte görünüm)
- [ ] Karanlık/Açık tema ve erişilebilirlik (a11y)

## M12 – Dağıtım ve Operasyon

- [ ] Prod veritabanı ve yedekleme stratejisi
- [ ] Gözlemleme (logs, metrics, tracing)

---

# Detaylı Görev Listesi (İlk Sprint’ler)

### Sprint 1 – Kurulum

- [x] Next.js + TS + Tailwind iskelet
- [x] ESLint + Prettier + Husky
- [~] shadcn/ui kurulumu, temel tema (hafif shadcn benzeri UI kit projeye eklendi; generator entegrasyonu opsiyonel olarak sonraya bırakıldı)
- [x] Docker Compose ile PostgreSQL (config eklendi)
- [x] Prisma init ve temel modellerin taslağı (Organization, Member)
- [x] .env.example hazırlığı
- [x] Migration çalıştırma ve Seed (npm run prisma:migrate, npm run db:seed)

### Sprint 2 – Auth + Tenant

- [x] NextAuth kurulum
- [x] Organization (Dernek) oluşturma sihirbazı (temel)
- [x] Tenantlı yönlendirme: /[org]/... (layout guard ile)
- [x] Yetkilendirme guard’ları (API ve sayfa düzeyi)

### Sprint 3 – Üye Yönetimi (MVP)

- [x] Üye CRUD (oluşturma başlangıcı, API edit/delete eklendi; PATCH/DELETE sadece WRITE_ROLES)
- [x] Arama/filtre/sayfalama (arama başlangıcı)
- [x] Çoklu seçim ve “Hazirun” CSV dışa aktarım (MVP)
- [x] CSV export endpoint guard’ları (tenant + membership)

### Sprint 4 – Şablonlar ve PDF

- [x] Şablon yönetimi sayfası (listele/ekle/düzenle)
- [x] HTML-to-PDF servis katmanı (Playwright)
- [x] Genel Kurul örnek şablonları (seed: genel-kurul-daveti, kurul-listesi, üyelik-belgesi)

### Sprint 5 – Kurullar ve Şema

- [x] Group/MemberGroup veri modeli, API list/create/update/delete, üye-grup atama endpoint’i
- [x] Üye listesinde grup filtresi (OR/AND), chip tıklama ile filtreleme, export’ta Gruplar sütunu
- [x] Basit grup yönetim UI’si (create/edit/delete)
- [x] Üyeleri gruptan yönetim (liste içinde atama) – Çoklu seçimle assign/unassign API ve UI eklendi

### Sprint 6 – Mesajlaşma

- [x] SMS/WhatsApp sağlayıcı adaptör katmanı (Dummy + Twilio provider; kampanya & log modelleri, bulk send API: POST /api/[org]/sms/send)
- [x] Kişiselleştirme placeholder'ları: {{firstName}}, {{lastName}}, {{fullName}}
- [x] Dakikalık rate limit (ENV: ORG_SMS_PER_MIN, varsayılan 60)
- [x] Retry mekanizması (ENV: SMS_RETRY_LIMIT, varsayılan 2)
- [ ] Kampanya oluşturma ve raporlar (UI & gelişmiş istatistikler beklemede)

ENV Değişkenleri (SMS):

- SMS_PROVIDER=dummy|twilio
- TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM
- ORG_SMS_PER_MIN=60
- SMS_RETRY_LIMIT=2

---

# “Güzel Olur” Özellikleri (Öneriler)

- [ ] Etkinlik yönetimi ve biletleme
- [ ] Webhook/Events ile dış entegrasyonlar
- [ ] Yapay zeka destekli şablon önerileri ve metin düzeltme
- [ ] Gelişmiş raporlar için BI entegrasyonu (Metabase/Redash)

---

Not: 2025-08-17 UI İyileştirmeleri

- Üye listesi, gruplar ve şablon sayfaları token tabanlı UI atomları ile güncellendi (Button, Input, Select, Checkbox, Badge, Card).
- Filtre alanları modernleştirildi; rozet/etiket görünümleri sadeleştirildi; toast ve modal bileşenleri tema ile uyumlu hale getirildi.
- Breadcrumbs şablonlar ve gruplar sayfasına eklendi; editör sayfasında mevcut.
- App Router loading bileşenleri eklendi: üyeler, gruplar, şablonlar.
