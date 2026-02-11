# Coolify Deploy Runbook (Backend + Frontend + DB)

Bu doküman, projeyi Coolify üzerinde 2 app + 1 database yapısında canlıya alma adımlarını içerir.

## 1) Hedef Mimari

- Frontend app: `app.<domain>`
- Backend app: `api.<domain>`
- PostgreSQL: Coolify managed DB (public kapalı, internal network)

## 2) Repository Stratejisi

- Tek GitHub repo ile devam et (monorepo).
- Coolify üzerinde aynı repodan iki ayrı app oluştur:
  - Backend app
  - Frontend app

## 3) Coolify - Database

1. Coolify'da PostgreSQL resource oluştur.
2. DB credential ve internal bağlantı bilgisini al.
3. `DATABASE_URL` değerini backend app environment'a ekle.

## 4) Coolify - Backend App

Önerilen ayarlar:

- Source: GitHub repo
- Branch: `main`
- Dockerfile path: `/Dockerfile` (repo root)
- Exposed Port: `3000`
- Domain: `api.<domain>`

Environment değişkenleri:

- `NODE_ENV=production`
- `PORT=3000`
- `FRONTEND_URL=https://app.<domain>`
- `DATABASE_URL=...`
- `JWT_SECRET=...`

Deploy sonrası doğrulama:

- `https://api.<domain>/api/health` => `status: OK`

## 5) Coolify - Frontend App

Önerilen ayarlar:

- Source: GitHub repo
- Base Directory: `frontend`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Domain: `app.<domain>`

Environment değişkenleri:

- `VITE_API_BASE_URL=https://api.<domain>/api`
- `VITE_BACKEND_URL=https://api.<domain>`

## 6) İlk Canlı Geçiş Checklist

1. Backend app deploy et.
2. Backend health endpoint kontrol et.
3. Frontend app deploy et.
4. Login + temel akış smoke test yap:
   - Login
   - Sipariş liste
   - Statü geçişi
   - Dosya yükleme/görüntüleme

## 7) Migration Notu

Canlıda migration için önerilen komut:

```bash
npx prisma migrate deploy
```

Not:
- İlk kurulumda schema drift varsa kontrollü şekilde `prisma db push` kullanılabilir.
- Tercih edilen yöntem migration dosyalarıyla `migrate deploy`dur.

## 8) Kalıcı Dosya (Uploads) Notu

- Backend tarafında `public/uploads` klasörüne yükleme yapılıyor.
- Eğer container ephemeral ise deploy sonrası dosyalar kaybolur.
- Coolify'da backend app için persistent volume bağla.

## 9) CI/CD Akışı

- GitHub `main` branch push -> Coolify auto deploy
- Opsiyonel: GitHub Actions ile test/build geçmeden deploy tetikleme

