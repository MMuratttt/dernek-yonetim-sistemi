# Dernek Yönetim Sistemi

Modern, çoklu-tenant (çoklu dernek) yönetim platformu.

## Hızlı Başlangıç

Önkoşullar:

- Node.js >= 18
- npm
- (Opsiyonel) Docker Desktop (lokal PostgreSQL için önerilir)

Kurulum:

1. Bağımlılıklar

```powershell
npm install
```

2. Ortam değişkenleri
   .env dosyası zaten eklendi. Örnek için `.env.example` dosyasına bakın.

3. Veritabanı (opsiyonel şimdilik)
   - Docker Desktop çalışıyorsa:

     ```powershell
     npm run db:up
     ```

   - Prisma client üretimi:

     ```powershell
     npm run prisma:generate
     ```

   - Şema migration (DB çalışıyorsa):

     ```powershell
     npm run prisma:migrate
     ```

   - Seed (admin + örnek veriler):

     ```powershell
     npm run db:seed
     ```

4. Geliştirme sunucusu

```powershell
npm run dev
```

Uygulama: http://localhost:3000

Alt alan adı ile yönlendirme (opsiyonel):

- `middleware.ts` ile subdomain -> tenant yönlendirmesi yapılabilir. Etkinleştirmek için `.env` içine:

  ```env
  ENABLE_SUBDOMAIN_ROUTING=1
  BASE_DOMAIN=localhost # veya example.com
  ```

- Örn. `ornek-dernek.localhost:3000` isteği, otomatik olarak `/{org}` rotalarına yönlendirilir.

## Proje Yapısı

- src/app: Next.js App Router
- prisma: Prisma şema ve migration’lar
- src/lib: yardımcı kütüphaneler (ör. prisma client)
- src/components: UI bileşenleri ve sağlayıcılar

## Yol Haritası

Tüm detaylar için ROADMAP.md dosyasını açın.

## Notlar

- Docker kullanmıyorsanız `DATABASE_URL` değerini kendi PostgreSQL sunucunuza göre düzenleyin.
- Windows + PowerShell için komutlar yukarıda verilmiştir.

Varsayılan giriş (seed): admin@example.com / admin123

## Fotoğraf Depolama (Üye Fotoğrafı)

- Varsayılan (ücretsiz): local `public/uploads` klasörü.
- Tamamen ücretsiz ve S3 uyumlu bir alternatif: MinIO (self-hosted). `docker-compose.yml` içinde örnek servis yorum satırında mevcut; açarak kullanabilirsiniz.
- AWS S3 opsiyoneldir ve ücretlendirmeye tabidir (sınırlı da olsa free tier kapsamı vardır). Ücret ödemek istemiyorsanız AWS değişkenlerini boş bırakın ve local/MinIO kullanın.
- S3 uyumlu bir servis kullanacaksanız `.env` dosyanıza şunları ekleyin:
  - `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`
  - (Opsiyonel) `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE=true` (MinIO gibi servisler için)

## E-posta (Yerel ve Ücretsiz)

- MailHog servisi docker-compose içinde tanımlıdır.
- Web UI: http://localhost:8025 — SMTP: localhost:1025
- Varsayılan `.env` değeri gerekmez; isterseniz aşağıdaki değişkenleri ekleyin:
  - `SMTP_HOST=localhost`
  - `SMTP_PORT=1025`
  - `MAIL_FROM=noreply@example.test`
- Test endpoint: POST `/api/mail/test` (oturum gerektirir). MailHog UI’den iletileri görebilirsiniz.

## Commit Mesaj Standardı (Conventional Commits)

Bu projede commit mesajları için **Conventional Commits** formatını kullanıyoruz. Amaç otomatik sürümleme, değişiklik günlüğü (CHANGELOG) üretimi ve okunabilirliktir.

Şablon dosyası: `.gitmessage.txt` (otomatik kullanmak için: `git config commit.template .gitmessage.txt`).

Temel biçim:

```
<type>(opsiyonel-scope): <kısa açıklama>

<gövde - opsiyonel>

BREAKING CHANGE: <açıklama> (opsiyonel)
Closes: #123 (opsiyonel)
```

Geçerli type değerleri:
`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

Örnekler:

```
feat(auth): magic link ile giriş ekle
fix(sms): boş telefon numarası hatasını düzelt
refactor(prisma): ortak sorgu helper'a taşındı
chore(ci): typecheck aşamasını pipeline'a ekle
```

İpuçları:

- 72 karakteri geçmeyen özet satırı kullanın.
- Gövdede "ne" yerine "neden" odaklı açıklama yapın.
- Breaking change için `BREAKING CHANGE:` ile başlayın (semver major üretimine yardımcı olur).

Gerekiyorsa commitlint kurallarını özelleştirmek için `commitlint.config.cjs` güncellenebilir.
