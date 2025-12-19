# Dernek Yönetim Sistemi

Modern, çoklu-kiracı (multi-tenant) dernek yönetim platformu. Türkiye'deki dernekler için üye yönetimi, toplantı organizasyonu, kurul yönetimi, aidat takibi ve iletişim araçlarını tek bir çatı altında sunar.

## ✨ Özellikler

### 🏢 Çoklu Dernek Desteği

- Tek platformda birden fazla dernek yönetimi
- Her dernek için ayrı alan (slug tabanlı yönlendirme)
- Opsiyonel subdomain desteği
- Rol tabanlı yetkilendirme (Superadmin, Admin, Personel, Üye)

### 👥 Üye Yönetimi

- Kapsamlı üye profilleri (TC kimlik, iletişim, meslek, statü)
- Gelişmiş arama, filtreleme ve sıralama
- Etiket ve grup sistemi (AND/OR filtre modları)
- Toplu import/export (CSV, Excel)
- Üye fotoğrafı yönetimi (Local / S3 / MinIO)
- Sonsuz kaydırma ile sayfalama

### 🏛️ Kurul Yönetimi

- Yönetim Kurulu ve Denetim Kurulu modülleri
- Dönem bazlı üyelik takibi
- Görev dağılımı (Başkan, Başkan Yrd., Sekreter, Sayman, Üye)
- Asil ve yedek üye ayrımı
- Kurul kararları ve tutanakları

### 📋 Toplantı Yönetimi

- Olağan ve Olağanüstü Genel Kurul planlama
- Gündem, davetiye ve yoklama takibi
- Vekalet/temsil yönetimi
- Toplantı kararları ve tutanakları
- Belge yükleme ve arşivleme

### 💰 Finans ve Aidat

- Aidat planları ve dönemleri
- Toplu borçlandırma
- Ödeme kaydı ve bakiye takibi
- Kasa yönetimi
- Makbuz PDF üretimi
- Finansal raporlar

### 📄 Şablon ve Belge Üretimi

- Mustache tabanlı dinamik şablonlar
- Değişken desteği (`{{uye.ad}}`, `{{uye.soyad}}`, vb.)
- PDF üretimi (Playwright ile HTML-to-PDF)
- DOCX üretimi
- Hazır şablonlar:
  - Genel Kurul Divan Tutanağı
  - Hazirun Listesi
  - Faaliyet Raporu
  - Denetim Kurulu Raporu
  - Mali Rapor
  - Üyelik Belgesi
  - Üyelik Başvuru Formu

### 📱 İletişim

- Toplu SMS gönderimi
- Toplu e-posta gönderimi
- Kampanya yönetimi ve geçmişi
- Kişiselleştirme placeholder'ları
- Rate limiting ve retry mekanizması

## 🛠️ Teknolojiler

| Katman     | Teknoloji               |
| ---------- | ----------------------- |
| Framework  | Next.js 15 (App Router) |
| Dil        | TypeScript              |
| Stil       | Tailwind CSS            |
| Veritabanı | PostgreSQL              |
| ORM        | Prisma                  |
| Auth       | NextAuth.js             |
| State      | React Query, Zustand    |
| PDF        | Playwright              |
| DOCX       | docx.js                 |
| E-posta    | Nodemailer              |
| SMS        | Twilio (opsiyonel)      |

## 🚀 Kurulum

### Önkoşullar

- Node.js >= 18
- npm veya yarn
- PostgreSQL (veya Docker Desktop)

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. Ortam Değişkenleri

`.env` dosyası oluşturun (örnek için `.env.example`):

```env
# Veritabanı
DATABASE_URL="postgresql://dernek:dernek123@localhost:5432/dernekdb"

# Auth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Opsiyonel: Subdomain Yönlendirme
ENABLE_SUBDOMAIN_ROUTING=0
BASE_DOMAIN=localhost
```

### 3. Veritabanı

Docker ile PostgreSQL başlatın:

```bash
npm run db:up
```

Prisma migration ve seed:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
```

### 4. Geliştirme Sunucusu

```bash
npm run dev
```

Uygulama: http://localhost:3000

**Varsayılan Giriş:** `admin@example.com` / `admin123`

## 📁 Proje Yapısı

```
├── prisma/                 # Prisma şema ve migration'lar
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.js
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── [org]/          # Tenant sayfaları
│   │   │   ├── boards/     # Kurul yönetimi
│   │   │   ├── finance/    # Finans ve aidat
│   │   │   ├── groups/     # Grup yönetimi
│   │   │   ├── meetings/   # Toplantı yönetimi
│   │   │   ├── members/    # Üye yönetimi
│   │   │   ├── settings/   # Dernek ayarları
│   │   │   ├── sms/        # SMS yönetimi
│   │   │   └── templates/  # Şablon yönetimi
│   │   ├── api/            # API route'ları
│   │   ├── auth/           # Auth sayfaları
│   │   └── org/            # Dernek oluşturma
│   ├── components/         # React bileşenleri
│   │   ├── ui/             # Temel UI atomları
│   │   └── landing/        # Landing page bileşenleri
│   ├── lib/                # Yardımcı kütüphaneler
│   │   ├── email/          # E-posta servisi
│   │   ├── sms/            # SMS servisi
│   │   ├── auth.ts         # Auth yapılandırması
│   │   ├── authz.ts        # Yetkilendirme
│   │   └── prisma.ts       # Prisma client
│   └── types/              # TypeScript tanımları
├── public/                 # Statik dosyalar
└── scripts/                # Yardımcı scriptler
```

## 🔧 Scriptler

| Komut                     | Açıklama                     |
| ------------------------- | ---------------------------- |
| `npm run dev`             | Geliştirme sunucusu          |
| `npm run build`           | Production build             |
| `npm run start`           | Production sunucusu          |
| `npm run lint`            | ESLint kontrolü              |
| `npm run typecheck`       | TypeScript kontrolü          |
| `npm run test`            | Vitest testleri              |
| `npm run db:up`           | Docker ile PostgreSQL başlat |
| `npm run db:down`         | Docker PostgreSQL durdur     |
| `npm run prisma:generate` | Prisma client oluştur        |
| `npm run prisma:migrate`  | Migration uygula             |
| `npm run prisma:studio`   | Prisma Studio aç             |
| `npm run db:seed`         | Örnek veri yükle             |

## ⚙️ Opsiyonel Yapılandırma

### Fotoğraf Depolama

**Varsayılan:** Local (`public/uploads`)

**S3 / MinIO için:**

```env
S3_BUCKET=dernek-uploads
S3_REGION=eu-central-1
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
S3_PUBLIC_BASE_URL=https://your-bucket.s3.amazonaws.com

# MinIO için ek:
S3_ENDPOINT=http://localhost:9000
S3_FORCE_PATH_STYLE=true
```

### E-posta (Geliştirme)

Docker Compose içinde MailHog servisi mevcuttur:

- Web UI: http://localhost:8025
- SMTP: `localhost:1025`

```env
SMTP_HOST=localhost
SMTP_PORT=1025
MAIL_FROM=noreply@example.test
```

### SMS

```env
SMS_PROVIDER=dummy|twilio
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_FROM=+1234567890
ORG_SMS_PER_MIN=60
SMS_RETRY_LIMIT=2
```

### Subdomain Yönlendirme

```env
ENABLE_SUBDOMAIN_ROUTING=1
BASE_DOMAIN=example.com
```

Örnek: `ornek-dernek.example.com` → `/ornek-dernek/...`

## 🧪 Test

```bash
npm run test
```

Testler Vitest ile yazılmıştır. `src/tests/` klasöründe API ve servis testleri bulunur.

## 📝 Commit Standardı

[Conventional Commits](https://www.conventionalcommits.org/) formatı kullanılır:

```
<type>(scope): kısa açıklama

[gövde]

[BREAKING CHANGE: açıklama]
```

**Type'lar:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Örnekler:**

```
feat(members): toplu import özelliği eklendi
fix(finance): bakiye hesaplama hatası düzeltildi
docs(readme): kurulum adımları güncellendi
```

## 🗺️ Yol Haritası

Detaylı geliştirme planı için [ROADMAP.md](./ROADMAP.md) dosyasına bakın.

## 📄 Lisans

Bu proje özel kullanım için geliştirilmiştir.
