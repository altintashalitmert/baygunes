# Epics & User Stories
# Şehir İçi Reklam ve Direk Yönetim Sistemi

**Tarih:** 03 Şubat 2026  
**Sprint Duration:** 15 gün (3 Feb - 18 Feb 2026)  
**Team Size:** Solo/Small team  

---

## 📋 Epic Overview

Bu proje 8 ana epic'e bölünmüştür. Her epic bir feature domain'i temsil eder.

| Epic ID | Epic Name | Priority | Stories | Estimated Days |
|---------|-----------|----------|---------|----------------|
| E1 | Authentication & User Management | P0 | 5 | 2 |
| E2 | Pole & Map Management | P0 | 6 | 2 |
| E3 | Order & Workflow System | P0 | 8 | 3 |
| E4 | File Management | P0 | 4 | 1 |
| E5 | Notification System | P1 | 3 | 1 |
| E6 | Reporting & Analytics | P1 | 4 | 2 |
| E7 | Variable Pricing Configuration | P1 | 3 | 1 |
| E8 | Landing Page | P2 | 2 | 1 |

**Total Stories:** 35  
**Total Estimated Days:** 13 gün (2 gün buffer)

---

## Epic 1: Authentication & User Management

**Priority:** P0 (Blocker)  
**Description:** Kullanıcı kimlik doğrulama, authorization ve kullanıcı yönetimi sistemi.  
**Business Value:** Sistem güvenliği ve rol tabanlı erişim kontrolü için kritik.
**Status:** ✅ COMPLETED

### Story 1.1: Backend Project Setup
**As a** developer  
**I want** backend projesinin temel yapısını kurmak  
**So that** geliştirmeye başlayabilirim

**Acceptance Criteria:**
- [ ] Node.js + Express.js projesi başlatıldı
- [ ] Prisma ORM kuruldu ve config edildi
- [ ] PostgreSQL bağlantısı çalışıyor
- [ ] Environment variables (.env) setup
- [ ] Folder structure (controllers, services, routes, middleware)
- [ ] ESLint + Prettier configured
- [ ] Basic error handling middleware

**Technical Notes:**
```bash
npm init -y
npm install express prisma @prisma/client bcryptjs jsonwebtoken
npm install -D typescript @types/node @types/express nodemon
```

**Estimated:** 4 hours

---

### Story 1.2: Database Schema Implementation
**As a** developer  
**I want** veritabanı şemasını Prisma ile implement etmek  
**So that** veri modellerim hazır olsun

**Acceptance Criteria:**
- [ ] `schema.prisma` dosyası architecture'daki ERD'ye göre oluşturuldu
- [ ] 6 model tanımlandı: User, Pole, Order, WorkflowHistory, PricingConfig, File
- [ ] Enum'lar tanımlandı (UserRole, PoleStatus, OrderStatus, FileType)
- [ ] Foreign key ilişkileri doğru
- [ ] Index'ler eklendi (performance için)
- [ ] `prisma migrate dev` başarıyla çalıştı
- [ ] Seed data eklendi (test için 1 admin user)

**Prisma Schema Example:**
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  role      UserRole
  name      String
  phone     String?
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  createdOrders Order[] @relation("CreatedOrders")
  printerOrders Order[] @relation("PrinterOrders")
  fieldOrders   Order[] @relation("FieldOrders")
  
  @@index([role])
  @@index([email])
}

enum UserRole {
  SUPER_ADMIN
  OPERATOR
  PRINTER
  FIELD
}
```

**Estimated:** 3 hours

---

### Story 1.3: JWT Authentication Implementation
**As a** user  
**I want** email ve şifre ile giriş yapabilmek  
**So that** sisteme güvenli erişebilirim

**Acceptance Criteria:**
- [ ] POST `/api/auth/login` endpoint çalışıyor
- [ ] Email + password validation (Zod schema)
- [ ] Password bcrypt ile hash'lenmiş ve doğrulanıyor
- [ ] JWT token generate ediliyor (8 saat expiration)
- [ ] Response: `{token, user: {id, email, name, role}}`
- [ ] Yanlış şifre durumunda 401 error
- [ ] Kullanıcı bulunamadığında 404 error
- [ ] Rate limiting (5 attempt/minute)

**API Contract:**
```javascript
// Request
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "securepass123"
}

// Response 200
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "admin@example.com",
      "name": "Admin User",
      "role": "SUPER_ADMIN"
    }
  }
}

// Response 401
{
  "success": false,
  "error": "Invalid credentials"
}
```

**Estimated:** 4 hours

---

### Story 1.4: Authorization Middleware
**As a** developer  
**I want** role-based authorization middleware'i  
**So that** endpoint'leri koruyabilirim

**Acceptance Criteria:**
- [ ] `authMiddleware` JWT token'ı verify ediyor
- [ ] `req.user` objesine user bilgileri ekleniyor
- [ ] `roleMiddleware(['SUPER_ADMIN', 'OPERATOR'])` role check yapıyor
- [ ] Yetkisiz erişimde 403 error dönüyor
- [ ] Token expire olduğunda 401 error
- [ ] Token yoksa 401 error

**Middleware Implementation:**
```javascript
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    
    if (!user || !user.active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};
```

**Estimated:** 3 hours

---

### Story 1.5: User CRUD Endpoints
**As a** super admin  
**I want** kullanıcı oluşturup yönetebilmek  
**So that** sisteme yeni kullanıcılar ekleyebilirim

**Acceptance Criteria:**
- [ ] GET `/api/users` - Liste (sadece SUPER_ADMIN)
- [ ] GET `/api/users/:id` - Detay (sadece SUPER_ADMIN)
- [ ] POST `/api/users` - Yeni kullanıcı (sadece SUPER_ADMIN)
- [ ] PATCH `/api/users/:id` - Güncelleme (sadece SUPER_ADMIN)
- [ ] DELETE `/api/users/:id` - Soft delete (sadece SUPER_ADMIN)
- [ ] GET `/api/users/printers` - Baskıcı listesi (OPERATOR, SUPER_ADMIN)
- [ ] GET `/api/users/field-teams` - Saha ekibi listesi (OPERATOR, SUPER_ADMIN)
- [ ] Password create sırasında hash'leniyor
- [ ] Email unique constraint validation

**Estimated:** 5 hours

---

## Epic 2: Pole & Map Management

**Priority:** P0 (Blocker)  
**Description:** Harita entegrasyonu ve direk yönetimi.  
**Business Value:** Core feature - direk seçimi ve rezervasyon için gerekli.
**Status:** ✅ COMPLETED

### Additional Completed Features:
- ✅ Reverse geocoding (Nominatim API)
- ✅ Automatic address extraction from coordinates
- ✅ Soft delete for poles
- ✅ Pole restore functionality

### Story 2.1: Frontend Project Setup
**As a** developer  
**I want** React frontend projesini kurmak  
**So that** UI geliştirmeye başlayabilirim

**Acceptance Criteria:**
- [ ] Vite + React projesi oluşturuldu
- [ ] Tailwind CSS kuruldu ve config edildi
- [ ] React Router v6 kuruldu
- [ ] Zustand state management kuruldu
- [ ] TanStack Query (React Query) kuruldu
- [ ] Axios API client config edildi
- [ ] Folder structure (pages, components, hooks, services, utils)
- [ ] ESLint + Prettier configured
- [ ] Base layout component (Header, Sidebar, Content)

**Tech Stack:**
```bash
npm create vite@latest frontend -- --template react
npm install tailwindcss postcss autoprefixer
npm install react-router-dom zustand @tanstack/react-query axios
npm install lucide-react react-hook-form zod
```

**Estimated:** 4 hours

---

### Story 2.2: Leaflet Map Integration
**As a** user  
**I want** harita üzerinde direkleri görebilmek  
**So that** hangi direklerin boş/dolu olduğunu takip edebilirim

**Acceptance Criteria:**
- [ ] React Leaflet kuruldu ve çalışıyor
- [ ] OpenStreetMap tile layer gösteriliyor
- [ ] Map center: İstanbul (varsayılan)
- [ ] Zoom controls çalışıyor
- [ ] Responsive map container
- [ ] Map height: viewport - header height
- [ ] Custom marker icons (yeşil/kırmızı pin)

**Component Example:**
```jsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

function PoleMap() {
  return (
    <MapContainer
      center={[41.0082, 28.9784]} // İstanbul
      zoom={12}
      className="h-full w-full"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />
    </MapContainer>
  );
}
```

**Estimated:** 3 hours

---

### Story 2.3: Pole Backend CRUD API
**As a** operator  
**I want** direk oluşturup düzenleyebilmek  
**So that** yeni direkleri sisteme ekleyebilirim

**Acceptance Criteria:**
- [ ] POST `/api/poles` - Yeni direk oluştur
- [ ] GET `/api/poles` - Tüm direkleri listele
- [ ] GET `/api/poles/:id` - Direk detay
- [ ] PATCH `/api/poles/:id` - Direk güncelle
- [ ] DELETE `/api/poles/:id` - Direk sil (soft delete)
- [ ] GET `/api/poles/available` - Sadece boş direkler
- [ ] Pole ID otomatik generate (TOGUBBC4 formatı)
- [ ] Lat/lng validation (-90 to 90, -180 to 180)
- [ ] Status default "AVAILABLE"

**Pole ID Algorithm:**
```javascript
async function generatePoleCode(latitude, longitude, street, sequenceNo) {
  // Reverse geocoding (Nominatim API)
  const location = await reverseGeocode(latitude, longitude);
  
  const cityCode = location.city.substring(0, 2).toUpperCase(); // TO
  const districtCode = location.district.substring(0, 2).toUpperCase(); // GU
  const neighborhoodCode = location.neighborhood?.substring(0, 1).toUpperCase() || 'X'; // B
  const streetCode = street?.substring(0, 1).toUpperCase() || 'X'; // B
  const seq = String(sequenceNo).padStart(2, '0'); // 04
  
  return `${cityCode}${districtCode}${neighborhoodCode}${streetCode}${seq}`;
}
```

**Estimated:** 5 hours

---

### Story 2.4: Pole Frontend UI
**As a** operator  
**I want** haritadan direk ekleyebilmek  
**So that** yeni direkleri kolayca oluşturabilirim

**Acceptance Criteria:**
- [ ] Haritaya tıklandığında "Yeni Direk Ekle" modal açılıyor
- [ ] Modal fields: Lat/Lng (auto-filled), Cadde, Sıra No
- [ ] Form validation (React Hook Form + Zod)
- [ ] Submit edince backend'e POST request
- [ ] Başarılı olunca haritaya marker ekleniyor
- [ ] Hata durumunda toast notification
- [ ] Var olan direk tıklanınca detay sidebar açılıyor
- [ ] Detay sidebar: Pole ID, Adres, Durum, Düzenle butonu

**Estimated:** 6 hours

---

### Story 2.5: Pole Status Color Coding
**As a** operator  
**I want** direklerin durumunu renklerle görmek  
**So that** hangi direklerin boş olduğunu hızlıca anlayabilyim

**Acceptance Criteria:**
- [ ] Yeşil marker: AVAILABLE (boş)
- [ ] Kırmızı marker: OCCUPIED (dolu)
- [ ] Turuncu marker: end_date < 7 gün (yakında boşalacak) - opsiyonel
- [ ] Custom SVG icon'lar veya Leaflet divIcon
- [ ] Marker cluster (100+ direk olursa)
- [ ] Click on marker → sidebar açılıyor

**Custom Marker:**
```jsx
const getMarkerColor = (status, endDate) => {
  if (status === 'AVAILABLE') return 'green';
  if (status === 'OCCUPIED') {
    const daysUntilExpire = dayjs(endDate).diff(dayjs(), 'day');
    return daysUntilExpire <= 7 ? 'orange' : 'red';
  }
  return 'gray';
};
```

**Estimated:** 3 hours

---

### Story 2.6: Pole Filtering & Search
**As a** operator  
**I want** direkleri filtreleyebilmek  
**So that** aradığım direği hızlıca bulabiliyim

**Acceptance Criteria:**
- [ ] Search bar: Pole ID veya adres arama
- [ ] Filter by status (Tümü / Boş / Dolu)
- [ ] Filter by city/district (dropdown)
- [ ] Search sonuçları haritada highlight
- [ ] Filtre apply edilince marker'lar güncelleniyor
- [ ] URL query params ile filtre state persist

**Estimated:** 4 hours

---

## Epic 3: Order & Workflow System

**Priority:** P0 (Blocker)  
**Description:** Sipariş oluşturma ve 6-state workflow yönetimi.  
**Business Value:** Core feature - işin akışı bu sistem üzerinden.
**Status:** ✅ COMPLETED

### Additional Completed Features:
- ✅ Order cancellation (soft delete)
- ✅ Order edit (PENDING status only)
- ✅ Workflow rollback (Super Admin only)
- ✅ Rollback audit logging

### Story 3.1: Order Creation Backend
**As a** operator  
**I want** sipariş oluşturabilmek  
**So that** müşterilere direk kiralayabilirim

**Acceptance Criteria:**
- [ ] POST `/api/orders` endpoint
- [ ] Request validation: pole_id, client_name, start_date, end_date (required)
- [ ] Tarih çakışma kontrolü (overlap check)
- [ ] Aynı direk için aynı tarih aralığında sipariş varsa 409 error
- [ ] start_date < end_date validation
- [ ] start_date >= today validation
- [ ] Sipariş oluşturulunca pole status "OCCUPIED" olmalı
- [ ] Order status default "PENDING"
- [ ] created_by user ID'si kaydedilmeli

**Overlap Check Logic:**
```sql
SELECT COUNT(*) FROM orders
WHERE pole_id = $1
AND status NOT IN ('COMPLETED', 'EXPIRED')
AND (
  (start_date <= $2 AND end_date >= $2) OR -- overlap with start
  (start_date <= $3 AND end_date >= $3) OR -- overlap with end
  (start_date >= $2 AND end_date <= $3)    -- completely inside
);
```

**Estimated:** 5 hours

---

### Story 3.2: Order Creation Frontend
**As a** operator  
**I want** sipariş formu doldurup submit edebilmek  
**So that** hızlıca sipariş oluşturabilirim

**Acceptance Criteria:**
- [ ] "Yeni Sipariş" butonu (harita üzerinde)
- [ ] Modal form: Direk seç (dropdown veya haritadan seçili), Müşteri adı, İletişim, Başlangıç/Bitiş tarihi
- [ ] Date picker component (react-datepicker)
- [ ] Form validation (tüm alanlar required)
- [ ] Submit edince loading state
- [ ] Başarılı: Modal kapanır, success toast, harita refresh
- [ ] Hata (çakışma): Error message göster

**Estimated:** 6 hours

---

### Story 3.3: Workflow State Machine Backend
**As a** system  
**I want** sipariş durumlarını transition rules'a göre değiştirmek  
**So that** iş akışı kontrollü ilerlesin

**Acceptance Criteria:**
- [ ] POST `/api/workflow/:orderId/transition` endpoint
- [ ] Request body: `{newStatus, notes?}`
- [ ] State transition validation (WORKFLOW_TRANSITIONS rules)
- [ ] User role validation (her transition için allowed roles)
- [ ] Required data validation (örn: AWAITING_MOUNT → LIVE için proof_photo gerekli)
- [ ] WorkflowHistory tablosuna kayıt
- [ ] Order update (status + updated_at)
- [ ] Invalid transition attempt için 400 error

**Transition Middleware:**
```javascript
const WORKFLOW_TRANSITIONS = {
  PENDING: {
    allowedNext: ['PRINTING'],
    roles: ['SUPER_ADMIN'],
    required: ['assigned_printer']
  },
  PRINTING: {
    allowedNext: ['AWAITING_MOUNT'],
    roles: ['PRINTER', 'SUPER_ADMIN'],
    required: ['assigned_field']
  },
  // ...
};
```

**Estimated:** 6 hours

---

### Story 3.4: Workflow UI & Status Badges
**As a** user  
**I want** sipariş durumunu görebilmek ve ilerletebilmek  
**So that** işi bir sonraki aşamaya taşıyabiliyim

**Acceptance Criteria:**
- [ ] Order detail sayfası (modal veya full page)
- [ ] Status badge (renk kodlu): PENDING (gray), PRINTING (blue), LIVE (green), vb.
- [ ] Workflow timeline (vertical stepper component)
- [ ] Her step: Durum adı, tarih/saat, kim değiştirdi
- [ ] Role-based action button: "Baskıcı Ata", "Montaj Tamamlandı", vb.
- [ ] Button click → confirmation modal
- [ ] Gerekli data (örn: fotoğraf) yoksa button disabled

**Estimated:** 7 hours

---

### Story 3.5: Assign Printer/Field Team
**As a** admin  
**I want** baskıcı ve saha ekibi atayabilmek  
**So that** iş doğru kişilere gitsin

**Acceptance Criteria:**
- [ ] "Baskıcı Ata" modal (PENDING → PRINTING transition sırasında)
- [ ] Dropdown: PRINTER rolündeki kullanıcılar listeleniyor
- [ ] Seçilince PATCH `/api/orders/:id/assign-printer` request
- [ ] Backend: assigned_printer update edilir
- [ ] Aynı şekilde "Saha Ekibi Ata" modal (PRINTING → AWAITING_MOUNT)
- [ ] Dropdown: FIELD rolündeki kullanıcılar
- [ ] Backend: assigned_field update edilir

**Estimated:** 4 hours

---

### Story 3.6: Order List View (Role-based)
**As a** user  
**I want** rolüme göre siparişleri görebilmek  
**So that** hangi işlerin bana ait olduğunu bileyim

**Acceptance Criteria:**
- [ ] GET `/api/orders` - Role-based filtering:
  - SUPER_ADMIN / OPERATOR: Tüm siparişler
  - PRINTER: Sadece assigned_printer = kendisi olanlar
  - FIELD: Sadece assigned_field = kendisi olanlar
- [ ] Table view: Order ID, Müşteri, Pole ID, Tarihler, Durum, Aksiyonlar
- [ ] Pagination (10 per page)
- [ ] Sort by status, date
- [ ] Click row → detay modal

**Estimated:** 5 hours

---

### Story 3.7: Order Cancel/Delete
**As a** super admin  
**I want** siparişleri iptal edebilmek  
**So that** yanlış oluşturulan işleri kaldırabilirim

**Acceptance Criteria:**
- [ ] DELETE `/api/orders/:id` endpoint (sadece SUPER_ADMIN)
- [ ] Soft delete: `deleted: true` field ekle
- [ ] Sipariş silinince pole status tekrar "AVAILABLE"
- [ ] UI: "İptal Et" butonu (confirmation modal)
- [ ] Cancel edilince sistem log tutmalı

**Estimated:** 3 hours

---

### Story 3.8: Cron Job - Auto Expire Orders
**As a** system  
**I want** bitiş tarihi geçen siparişleri otomatik "EXPIRED" yapmak  
**So that** saha ekibine söküm bildirimi gitsin

**Acceptance Criteria:**
- [ ] node-cron veya Bull Queue recurring job
- [ ] Her gün 00:00'da çalışır
- [ ] LIVE status + end_date < today olan siparişleri bulur
- [ ] Status → EXPIRED update eder
- [ ] WorkflowHistory kaydı (changed_by: "SYSTEM")
- [ ] Notification trigger (saha ekibine email)

**Cron Implementation:**
```javascript
const cron = require('node-cron');

// Her gün 00:00'da
cron.schedule('0 0 * * *', async () => {
  const today = new Date();
  const expiredOrders = await prisma.order.findMany({
    where: {
      status: 'LIVE',
      endDate: { lt: today }
    }
  });
  
  for (const order of expiredOrders) {
    await updateOrderStatus(order.id, 'EXPIRED', 'SYSTEM');
  }
});
```

**Estimated:** 3 hours

---

## Epic 4: File Management

**Priority:** P0 (Blocker)  
**Description:** Dosya yükleme, indirme ve storage yönetimi.  
**Business Value:** Sözleşme ve görsellerin saklanması zorunlu.
**Status:** ✅ COMPLETED

### Additional Completed Features:
- ✅ Thumbnail generation (Sharp library)
- ✅ Soft delete for files
- ✅ Mobile-optimized image loading

### Story 4.1: File Upload Backend
**As a** operator  
**I want** sözleşme ve görsel yükleyebilmek  
**So that** sipariş için gerekli dosyaları saklayabiliyim

**Acceptance Criteria:**
- [ ] POST `/api/files/upload` endpoint
- [ ] Multer middleware configured
- [ ] File type validation (PDF, JPG, PNG)
- [ ] File size validation (max 20MB)
- [ ] Dosya adı: `{timestamp}_{original_filename}`
- [ ] Storage path: `public/uploads/{orderId}/{fileType}/`
- [ ] Files tablosuna metadata kaydediliyor
- [ ] Response: `{fileId, fileUrl}`

**Multer Config:**
```javascript
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const path = `public/uploads/${req.body.orderId}/${req.body.fileType}/`;
      fs.mkdirSync(path, { recursive: true });
      cb(null, path);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}_${file.originalname}`);
    }
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'));
  }
});
```

**Estimated:** 4 hours

---

### Story 4.2: File Upload Frontend
**As a** user  
**I want** dosya yüklerken progress görebilmek  
**So that** yüklemenin ne kadar süreceğini bileyim

**Acceptance Criteria:**
- [ ] File input component (drag & drop opsiyonel)
- [ ] Önizleme (thumbnail için)
- [ ] Upload progress bar
- [ ] Multiple file upload (sözleşme + görsel birlikte)
- [ ] Axios onUploadProgress kullan
- [ ] Success: Dosya listesini refresh et
- [ ] Error: Toast notification

**Upload Component:**
```jsx
function FileUpload({ orderId, onSuccess }) {
  const [progress, setProgress] = useState(0);
  
  const handleUpload = async (files) => {
    const formData = new FormData();
    formData.append('orderId', orderId);
    files.forEach(file => formData.append('files', file));
    
    await axios.post('/api/files/upload', formData, {
      onUploadProgress: (e) => {
        setProgress(Math.round((e.loaded * 100) / e.total));
      }
    });
    
    onSuccess();
  };
  
  return <div>...</div>;
}
```

**Estimated:** 5 hours

---

### Story 4.3: File Download
**As a** user  
**I want** yüklenen dosyaları indirebilmek  
**So that** sözleşmeyi veya görseli görebilirim

**Acceptance Criteria:**
- [ ] GET `/api/files/:id` endpoint
- [ ] Content-Disposition header set (force download)
- [ ] Frontend: Download link/button
- [ ] Click → file download başlıyor
- [ ] PDF için browser'da preview (target="_blank")

**Download Endpoint:**
```javascript
app.get('/api/files/:id', async (req, res) => {
  const file = await prisma.file.findUnique({ where: { id: req.params.id } });
  
  res.download(file.fileUrl, file.originalName);
});
```

**Estimated:** 2 hours

---

### Story 4.4: Saha Ekibi Fotoğraf Yükleme (Mobil)
**As a** saha ekibi  
**I want** mobil cihazımdan fotoğraf çekip yükleyebilmek  
**So that** montaj kanıtı sunabiliyim

**Acceptance Criteria:**
- [ ] HTML5 camera input: `<input type="file" accept="image/*" capture="camera" />`
- [ ] Mobilde kamera açılıyor
- [ ] Çekilen fotoğraf önizleme gösteriliyor
- [ ] "Yükle" butonu
- [ ] Upload sonrası "Montaj Tamamlandı" butonu aktif oluyor
- [ ] Fotoğraf zorunlu (yoksa buton disabled)

**Estimated:** 4 hours

---

## Epic 5: Notification System

**Priority:** P1 (High)  
**Description:** Email bildirimleri ve Bull Queue entegrasyonu.  
**Business Value:** Kullanıcıların yeni işlerden haberdar olması kritik.
**Status:** ✅ COMPLETED

### Implemented Features:
- ✅ Bull Queue integration
- ✅ Notification Log table
- ✅ Retry mechanism (3 attempts with exponential backoff)
- ✅ User notification preferences
- ✅ Async email processing
- ✅ Failed notification tracking

### Story 5.1: Bull Queue Setup & Email Service
**As a** system  
**I want** asynchronous email gönderebilmek  
**So that** API request'leri bloklanmasın

**Acceptance Criteria:**
- [ ] Bull Queue kuruldu ve Redis'e bağlandı
- [ ] `emailQueue` oluşturuldu
- [ ] Nodemailer config (SMTP)
- [ ] Email template engine (Handlebars)
- [ ] `sendEmail` worker function
- [ ] Retry mechanism (3 attempts)
- [ ] Job başarısız olursa log tutulmalı

**Queue Setup:**
```javascript
const Queue = require('bull');
const emailQueue = new Queue('email', process.env.REDIS_URL);

emailQueue.process(async (job) => {
  const { to, subject, template, data } = job.data;
  await sendEmailWithTemplate(to, subject, template, data);
});
```

**Estimated:** 5 hours

---

### Story 5.2: Notification Triggers
**As a** user  
**I want** yeni iş atandığında email almak  
**So that** zamanında haberdar olayım

**Acceptance Criteria:**
- [ ] PENDING → PRINTING: assigned_printer'a email
- [ ] PRINTING → AWAITING_MOUNT: assigned_field'a email
- [ ] LIVE → EXPIRED: assigned_field'a söküm reminder email
- [ ] Order created: SUPER_ADMIN'e bilgi email
- [ ] Email template'leri HTML formatında
- [ ] Email içeriği: Sipariş ID, Müşteri adı, Pole ID, Dashboard linki

**Email Templates:**
- `new-print-job.html`
- `mount-assigned.html`
- `dismount-reminder.html`

**Estimated:** 4 hours

---

### Story 5.3: Notification Preferences & Log
**As a** user  
**I want** bildirim tercihlerimi yönetebilmek  
**So that** istemediğim bildirimleri alamayayım

**Acceptance Criteria:**
- [ ] User settings sayfası
- [ ] Checkbox: "Email bildirimleri almak istiyorum"
- [ ] Backend: user.emailNotifications field
- [ ] Notification gönderilmeden önce preference check
- [ ] Notification log tablosu (gönderim geçmişi)
- [ ] Admin notification log görüntüleme

**Estimated:** 3 hours

---

## Epic 6: Reporting & Analytics

**Priority:** P1 (High)  
**Description:** PDF raporlar ve hak ediş hesaplama.  
**Business Value:** Tedarikçi ödemelerini takip etmek için gerekli.
**Status:** ✅ COMPLETED

### Implemented Features:
- ✅ Printer Report (PDF generation)
- ✅ Field Team Report (PDF generation)
- ✅ Financial Summary Report
- ✅ Excel/CSV Export
- ✅ Report history tracking
- ✅ Automatic KDV calculation

### Story 6.1: Pricing Config UI
**As a** super admin  
**I want** fiyatlandırma ayarlarını güncelleyebilmek  
**So that** hak ediş hesaplaması doğru olsun

**Acceptance Criteria:**
- [ ] Settings sayfası → Pricing tab
- [ ] 4 input: Baskı fiyatı, Montaj ücreti, Söküm ücreti, KDV oranı
- [ ] Default values: 500, 200, 150, 20
- [ ] Number input validation (>= 0)
- [ ] Save butonu
- [ ] Backend: PATCH `/api/pricing/:key`
- [ ] Değişiklik pricing_config tablosuna kaydediliyor
- [ ] History tracking (kim, ne zaman, eski/yeni değer)

**Estimated:** 4 hours

---

### Story 6.2: Report Generation Backend (PDF)
**As a** super admin  
**I want** hak ediş raporu oluşturabilmek  
**So that** tedarikçilere ödeme yapabiliyim

**Acceptance Criteria:**
- [ ] POST `/api/reports/printer` - Baskıcı raporu
- [ ] POST `/api/reports/field` - Saha ekibi raporu
- [ ] Request: `{startDate, endDate, userId?}` (userId opsiyonel, tümü için)
- [ ] Backend: Tarih aralığındaki tamamlanmış işleri query et
- [ ] Pricing config'den fiyatları çek
- [ ] Toplam hesapla (adet * fiyat)
- [ ] pdfkit ile PDF oluştur
- [ ] Response: PDF file download

**PDF Content:**
```
Hak Ediş Raporu
Dönem: 01.02.2026 - 28.02.2026
Tedarikçi: [İsim]

Baskı İşleri:
- Toplam Adet: 25
- Birim Fiyat: 500 TL
- Toplam: 12,500 TL

Genel Toplam: 12,500 TL
KDV (%20): 2,500 TL
-------------------
GRAND TOTAL: 15,000 TL
```

**Estimated:** 6 hours

---

### Story 6.3: Report Generation UI
**As a** super admin  
**I want** rapor oluşturma sayfasından kolay rapor alabilmek  
**So that** hızlıca dönemsel raporları görebiliyim

**Acceptance Criteria:**
- [ ] Reports sayfası
- [ ] Filtreler: Tarih aralığı (date picker), Rapor tipi (Baskıcı/Saha), Kişi seçimi (tümü veya spesifik)
- [ ] "Rapor Oluştur" butonu
- [ ] Loading state
- [ ] PDF download automatic
- [ ] İndirme geçmişi tablosu (opsiyonel)

**Estimated:** 4 hours

---

### Story 6.4: Excel Export
**As a** super admin  
**I want** raporu Excel olarak da indirebilmek  
**So that** Excel'de düzenleyebiliyim

**Acceptance Criteria:**
- [ ] POST `/api/reports/excel` endpoint
- [ ] CSV formatında export
- [ ] Columns: Tarih, Sipariş ID, Müşteri, İşlem tipi, Tutar
- [ ] Frontend: "Excel İndir" butonu
- [ ] Download .csv file

**CSV Library:**
```javascript
const { Parser } = require('json2csv');

const json2csvParser = new Parser();
const csv = json2csvParser.parse(data);

res.header('Content-Type', 'text/csv');
res.attachment('report.csv');
res.send(csv);
```

**Estimated:** 3 hours

---

## Epic 7: Variable Pricing Configuration

**Priority:** P1 (High)  
**Description:** Admin panelinden fiyat ayarları yönetimi.  
**Business Value:** Fiyatlar değiştiğinde kod değişikliği gerektirmemeli.
**Status:** ✅ COMPLETED

### Implemented Features:
- ✅ Dynamic pricing configuration
- ✅ Pricing history tracking
- ✅ Audit log for price changes
- ✅ Default values: Print 500TL, Mount 200TL, Dismount 150TL, VAT %20

### Story 7.1: Pricing CRUD Backend
**As a** developer  
**I want** pricing config endpoint'leri  
**So that** UI'dan fiyat yönetilebilsin

**Acceptance Criteria:**
- [ ] GET `/api/pricing` - Tüm pricing config
- [ ] PATCH `/api/pricing/:key` - Spesifik key update
- [ ] Validation: value >= 0
- [ ] History tracking (PricingHistory tablosu - opsiyonel)
- [ ] Sadece SUPER_ADMIN erişebilir

**Estimated:** 2 hours

---

### Story 7.2: Pricing UI (Story 6.1 ile aynı)
*Duplicate - Story 6.1'e merge edildi*

---

### Story 7.3: Pricing History View
**As a** super admin  
**I want** fiyat değişiklik geçmişini görebilmek  
**So that** kim ne zaman değiştirdi bileyim

**Acceptance Criteria:**
- [ ] Pricing settings sayfasında "Geçmiş" tab
- [ ] Tablo: Tarih, Değiştiren, Key, Eski Değer, Yeni Değer
- [ ] Son 100 değişiklik gösteriliyor
- [ ] Pagination

**Estimated:** 3 hours

---

## Epic 8: Landing Page (Kurumsal Web Sitesi)

**Priority:** P2 (Nice to have)  
**Description:** Public facing website.  
**Business Value:** Şirket tanıtımı ve giriş sayfası.

### Story 8.1: Landing Page Design & Development
**As a** visitor  
**I want** şirket hakkında bilgi alabilmek  
**So that** ne yaptıklarını anlayayım

**Acceptance Criteria:**
- [ ] Hero section: Ana görsel + slogan + "Giriş Yap" butonu
- [ ] Services section: Hizmetler (3-4 item)
- [ ] Portfolio/Slider: Yapılan işler (resimler)
- [ ] Contact section: İletişim formu + adres/telefon
- [ ] Responsive design (mobile-first)
- [ ] Tailwind CSS ile styling
- [ ] Smooth scroll
- [ ] Header sticky

**Hero Example:**
```
------------------------------------------
|  [LOGO]                    [GİRİŞ YAP] |
|                                        |
|   Şehir İçi Reklam Çözümleri           |
|   Aydınlatma Direklerinde               |
|   Etkili Görünürlük                    |
|                                        |
|   [DETAYLI BİLGİ]                      |
------------------------------------------
```

**Estimated:** 6 hours

---

### Story 8.2: Contact Form Integration
**As a** visitor  
**I want** iletişim formu doldurup gönderebilmek  
**So that** şirketle iletişime geçebileyim

**Acceptance Criteria:**
- [ ] Form fields: Ad Soyad, Email, Telefon, Mesaj
- [ ] Validation (email format, required fields)
- [ ] POST `/api/contact` endpoint
- [ ] Email gönder (admin'e)
- [ ] Success message
- [ ] Form reset after submit

**Estimated:** 3 hours

---

## 📊 Sprint Breakdown

### Sprint 1: Foundation (Gün 3-5)
**Epic 1: Auth & User Management**
- Story 1.1, 1.2, 1.3, 1.4, 1.5

**Epic 2: Frontend Setup**
- Story 2.1

**Estimated:** 2 gün

---

### Sprint 2: Core Features (Gün 6-8)
**Epic 2: Pole & Map**
- Story 2.2, 2.3, 2.4, 2.5, 2.6

**Epic 3: Order Creation**
- Story 3.1, 3.2

**Estimated:** 2.5 gün

---

### Sprint 3: Workflow & Files (Gün 9-11)
**Epic 3: Workflow**
- Story 3.3, 3.4, 3.5, 3.6, 3.7, 3.8

**Epic 4: File Management**
- Story 4.1, 4.2, 4.3, 4.4

**Estimated:** 3 gün

---

### Sprint 4: Notifications & Reporting (Gün 12-13)
**Epic 5: Notifications**
- Story 5.1, 5.2, 5.3

**Epic 6: Reporting**
- Story 6.1, 6.2, 6.3, 6.4

**Epic 7: Pricing**
- Story 7.1, 7.3

**Estimated:** 2 gün

---

### Sprint 5: Landing & Polish (Gün 14-15)
**Epic 8: Landing Page**
- Story 8.1, 8.2

**Polish:**
- Bug fixes
- Mobile optimization
- Testing
- Deployment

**Estimated:** 2 gün

---

## ✅ Definition of Done (DoD)

Her story için:
- [ ] Code yazıldı
- [ ] Self-review yapıldı
- [ ] Backend: Postman test edildi
- [ ] Frontend: Browser test edildi
- [ ] Responsive (mobile + desktop) test edildi
- [ ] Error handling eklendi
- [ ] Console error yok
- [ ] Git commit + push

Sprint için:
- [ ] Tüm story'ler tamamlandı
- [ ] Code review yapıldı (`/bmad-bmm-code-review`)
- [ ] Integration test (tüm flow)
- [ ] Deployment yapıldı

---

**Doküman Sonu**

*Bu Epic & User Stories dokümanı, PRD ve Architecture'a göre 03 Şubat 2026'da oluşturulmuştur.*
