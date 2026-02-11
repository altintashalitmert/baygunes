# Product Requirements Document (PRD)
# Şehir İçi Reklam ve Direk Yönetim Sistemi

**Proje Adı:** Pole Banner Management System (PBMS)  
**Versiyon:** 1.0  
**Tarih:** 03 Şubat 2026  
**Hazırlayan:** Product Management Team  
**Hedef Canlıya Alma:** 18 Şubat 2026 (15 gün)

---

## 📋 Executive Summary

Şehir merkezindeki aydınlatma direklerinde bulunan reklam alanlarının (pole banner) kiralanması, operasyonel süreçlerin yönetilmesi ve raporlanmasını sağlayan web tabanlı bir yönetim platformu. 

**Temel Değer Önerisi:**
- Operatörlerin harita üzerinden direk seçip rezervasyon yapabilmesi
- Baskı ve montaj süreçlerinin otomatik takibi
- Tedarikçilere otomatik iş ataması ve bildirim
- Saha ekiplerine mobil-uyumlu görev yönetimi
- Otomatik hak ediş raporlaması

---

## 🎯 Business Goals & Success Metrics

### Primary Goals
1. **Operasyonel Verimlilik:** Sipariş sürecini manuel yöntemlerden %80 daha hızlı hale getirmek
2. **Şeffaflık:** Tüm iş akışının gerçek zamanlı takip edilebilmesi
3. **Maliyet Kontrolü:** Otomatik raporlama ile hak ediş hesaplama süresini %90 azaltmak
4. **Hata Önleme:** Double booking (çakışan rezervasyon) riskini %100 ortadan kaldırmak

### Success Metrics (3 ay içinde)
- [ ] Average order completion time < 7 gün
- [ ] Double booking incidents = 0
- [ ] User adoption rate > %90 (tüm roller)
- [ ] Report generation time < 2 dakika
- [ ] Mobile satisfaction score > 4/5

---

## 👥 User Personas & Roles

### 1. Süper Admin (Yönetici)
**Kim:** Şirket yöneticisi  
**Hedef:** Tüm operasyonu gözetlemek, finansal sağlık kontrolü  
**Pain Points:** 
- Tedarikçi ödemelerini manuel hesaplamak zor
- Kimin ne yaptığını takip etmek zaman alıyor
- Finansal rapor hazırlamak 2+ gün sürüyor

**İhtiyaçlar:**
- Tüm sisteme erişim
- Kullanıcı yönetimi (ekleme/silme/düzenleme)
- Finansal raporlara kolay erişim
- Fiyatlandırma ayarlarını güncelleyebilme

---

### 2. Operatör (Şirket Personeli)
**Kim:** Müşteri ile ilk temas noktası, sipariş alan kişi  
**Hedef:** Hızlıca sipariş oluşturup süreci başlatmak  
**Pain Points:**
- Hangi direklerin boş/dolu olduğunu bilmek zor
- Tarih çakışmalarını manuel kontrol etmek hata yaratıyor
- Dosyaları (sözleşme, görsel) organize etmek karmaşık

**İhtiyaçlar:**
- Harita üzerinde direklerin durumunu görebilme (boş/dolu)
- Kolay sipariş oluşturma formu
- Sözleşme ve görsel upload
- Sipariş takibi

---

### 3. Baskı Tedarikçisi (Alt Yüklenici)
**Kim:** Reklam baskısını yapan firma  
**Hedef:** İşlerini görmek, görseli indirip baskıyı yapmak  
**Pain Points:**
- Hangi işlerin kendisine ait olduğunu bilmemek
- Görsellere erişmekte zorluk
- İş tamamlandığında sisteme bildirmek zor

**İhtiyaçlar:**
- Sadece kendi işlerini listeleme
- Görseli indirme
- "Baskı tamamlandı" butonu
- Email/SMS bildirimi (yeni iş geldiğinde)

---

### 4. Saha Operasyonu (Montaj/Söküm Ekibi)
**Kim:** Arazide reklam asan/söken ekip  
**Hedef:** Görevlerini mobil cihazdan görmek ve tamamlamak  
**Pain Points:**
- Hangi direkte iş var bilmemek
- Direğin konumuna nasıl gidileceğini bulmak zor
- Kanıt fotoğrafı göndermek zahmetli

**İhtiyaçlar:**
- Mobil uyumlu "Asılacaklar" / "Sökülecekler" listesi
- GPS navigasyon entegrasyonu
- Kolay fotoğraf yükleme (kamera ile)
- "İşlem tamamlandı" butonu

---

## 🔧 Core Features & Requirements

### Feature 1: Authentication & Authorization (RBAC)

**User Story:**  
*"Sistem kullanıcı olarak, rolüme göre sadece yetkili olduğum ekran ve işlemlere erişebilmeliyim."*

**Functional Requirements:**
- FR-1.1: Email + şifre ile giriş
- FR-1.2: JWT token bazlı authentication
- FR-1.3: 4 rol tanımı: SUPER_ADMIN, OPERATOR, PRINTER, FIELD
- FR-1.4: Role-based UI rendering (roller görmemesi gereken ekranları görmemeli)
- FR-1.5: Session timeout: 8 saat
- FR-1.6: "Şifremi unuttum" özelliği (email ile reset)

**Acceptance Criteria:**
- [ ] Kullanıcı doğru email/şifre ile giriş yapabilmeli
- [ ] Yanlış şifre ile giriş engellenip hata mesajı gösterilmeli
- [ ] Operatör, admin paneline erişemeyerek 403 almalı
- [ ] Token expire olunca otomatik logout yapılmalı
- [ ] Her rol sadece yetkili ekranları görebilmeli

**Priority:** P0 (Blocker)

---

### Feature 2: Pole (Direk) Management & Mapping

**User Story:**  
*"Operatör olarak, harita üzerinden direkleri görebilmeli, yeni direk ekleyebilmeli ve durumlarını (boş/dolu) takip edebilmeliyim."*

**Functional Requirements:**
- FR-2.1: Leaflet.js + OpenStreetMap entegrasyonu
- FR-2.2: Harita üzerine marker ile direk ekleme
- FR-2.3: Direk durum renklendirme:
  - 🟢 Yeşil: Boş (AVAILABLE)
  - 🔴 Kırmızı: Dolu (OCCUPIED)
  - 🟠 Turuncu: 7 gün içinde boşalacak (EXPIRING_SOON)
- FR-2.4: Pole ID algoritması (otomatik):
  - Format: `{İlKodu}{İlçeKodu}{MahalleKodu}{SıraNo}`
  - Örnek: TOGUBBC4 (Tokat-Gümüş-Bahçelievler-C Bölgesi-4. Direk)
  - Reverse geocoding ile il/ilçe otomatik çekilmeli (Nominatim API)
  - Mahalle/Cadde manuel girilmeli (opsiyonel otomasyonlu)
  - Sıra no otomatik increment edilmeli
- FR-2.5: Direk bilgileri:
  - Konum (lat/lng)
  - Adres bilgisi (il, ilçe, mahalle, cadde)
  - Pole ID (unique)
  - Durum (boş/dolu)
  - Oluşturma tarihi
- FR-2.6: Direk arama/filtreleme (pole ID, adres, durum)
- FR-2.7: Direk detay görüntüleme (modal/sidebar)
- FR-2.8: Direk düzenleme (sadece admin + operatör)
- FR-2.9: Direk silme (sadece admin - soft delete)

**Technical Notes:**
- PostgreSQL + PostGIS extension kullanılmalı
- Coğrafi sorgular için spatial indexing
- Marker clustering (çok direk olursa)

**Acceptance Criteria:**
- [ ] Harita yüklendiğinde tüm direkler marker olarak görünmeli
- [ ] Yeni direk eklenince otomatik Pole ID oluşturulmalı
- [ ] Pole ID unique constraint hatası handle edilmeli
- [ ] Renk kodları doğru çalışmalı (boş=yeşil, dolu=kırmızı)
- [ ] Filtreleme sonuçları doğru gösterilmeli
- [ ] Mobilde harita responsive olmalı

**Priority:** P0 (Blocker)

---

### Feature 3: Order (Sipariş) Management

**User Story:**  
*"Operatör olarak, bir veya birden fazla direk için tarih aralığı belirleyerek sipariş oluşturabilmeliyim."*

**Functional Requirements:**
- FR-3.1: Sipariş oluşturma formu:
  - Müşteri adı (text)
  - Müşteri iletişim (phone/email)
  - Direk seçimi (haritadan veya dropdown)
  - Başlangıç tarihi (date picker)
  - Bitiş tarihi (date picker)
  - Sözleşme dosyası (PDF upload - max 10MB)
  - Reklam görseli (JPG/PNG upload - max 20MB)
- FR-3.2: Tarih çakışma kontrolü:
  - Aynı direk için aynı tarih aralığında sipariş varsa hata gösterilmeli
  - Kısmi çakışma da (overlap) engellenmeliş
  - Örnek: Direk A, 1 Şubat - 15 Şubat dolu ise, 10 Şubat - 20 Şubat rezervasyon yapılamaz
- FR-3.3: Sipariş başarı durumunda:
  - Direk durumu "OCCUPIED" olmalı
  - Sipariş "PENDING" statüsünde oluşturulmalı
  - Admin/Süper Admin'e email bildirimi
- FR-3.4: Sipariş listeleme (tablo):
  - Sipariş ID
  - Müşteri adı
  - Direk ID
  - Tarih aralığı
  - Durum (badge ile renklendirilmiş)
  - Aksiyon butonları (Görüntüle/Düzenle/Sil)
- FR-3.5: Sipariş detay görüntüleme:
  - Tüm sipariş bilgileri
  - Dosyaları indirme (sözleşme + görsel)
  - Workflow geçmişi (timeline)
- FR-3.6: Sipariş düzenleme (sadece PENDING durumunda)
- FR-3.7: Sipariş iptal (soft delete - sadece admin)

**Technical Notes:**
- File upload: Multer middleware
- Storage: Başlangıçta `public/uploads/{orderId}/` lokal klasör
- File naming: `{timestamp}_{originalFilename}`
- Tarih validasyonu: startDate < endDate, startDate >= today

**Acceptance Criteria:**
- [ ] Tüm form alanları dolu olmadan submit edilememeli
- [ ] Tarih çakışması durumunda net hata mesajı gösterilmeli
- [ ] Dosya boyutu limiti aşıldığında hata verilmeli
- [ ] Sipariş oluşturulunca liste sayfasında görünmeli
- [ ] PDF ve görsel dosyaları indirilebilir olmalı
- [ ] Sipariş iptal edilince direk tekrar "AVAILABLE" olmalı

**Priority:** P0 (Blocker)

---

### Feature 4: Workflow Engine (6-State State Machine)

**User Story:**  
*"Sistem yöneticisi olarak, siparişlerin otomatik durum geçişleri yapmasını ve her adımda doğru kişiye bildirim gitmesini istiyorum."*

**Workflow States:**
```
1. PENDING (Beklemede)
   ↓ (Admin sözleşmeyi onaylar + baskıcı atar)
2. PRINTING (Baskıda)
   ↓ (Baskıcı "Baskı Tamamlandı" der + saha ekibi atar)
3. AWAITING_MOUNT (Montaj Bekliyor)
   ↓ (Saha ekibi "Montaj Tamamlandı" der + fotoğraf yükler)
4. LIVE (Yayında)
   ↓ (Bitiş tarihi gelir - sistem otomatik)
5. EXPIRED (Süre Doldu / Sökülecek)
   ↓ (Saha ekibi "Söküm Tamamlandı" der + fotoğraf yükler)
6. COMPLETED (Tamamlandı)
```

**Functional Requirements:**
- FR-4.1: Durum geçiş butonları (role-based):
  - Admin: PENDING → PRINTING (baskıcı atama modal açılır)
  - Baskı Tedarikçisi: PRINTING → AWAITING_MOUNT (saha ekibi atama modal)
  - Saha Ekibi: AWAITING_MOUNT → LIVE (fotoğraf yükleme zorunlu)
  - Saha Ekibi: EXPIRED → COMPLETED (söküm fotoğrafı zorunlu)
- FR-4.2: Otomatik geçiş:
  - LIVE → EXPIRED: Bitiş tarihi 00:00'da otomatik (cron job)
- FR-4.3: Workflow history kayıt:
  - Old status, new status, changed by (user), timestamp, notes
- FR-4.4: Geri alma (rollback) özelliği (sadece admin):
  - Örnek: Yanlışlıkla PRINTING'e geçirildi, PENDING'e geri al
- FR-4.5: İş atama:
  - Admin, baskıcı seçer (dropdown - sadece PRINTER rolünde olanlar)
  - Baskıcı, saha ekibi seçer (dropdown - sadece FIELD rolünde olanlar)

**Technical Notes:**
- State machine pattern kullanılmalı
- Invalid state transition'lar engellenmeliş (örn: PENDING → LIVE yapılamaz)
- Workflow history için ayrı tablo (WorkflowHistory)

**Acceptance Criteria:**
- [ ] Her durum geçişi doğru kaydedilmeli
- [ ] Invalid transition attempt edilirse hata dönmeli
- [ ] Workflow history timeline UI'da görünmeli
- [ ] Otomatik EXPIRED geçişi her gece çalışmalı
- [ ] Rollback sadece admin yapabilmeli

**Priority:** P0 (Blocker)

---

### Feature 5: Notification System

**User Story:**  
*"Alt yüklenici olarak, bana yeni iş atandığında otomatik bildirim almak istiyorum."*

**Notification Triggers:**
1. **PENDING → PRINTING:** Atanan baskıcıya email
2. **PRINTING → AWAITING_MOUNT:** Atanan saha ekibine email
3. **LIVE → EXPIRED:** Saha ekibine "Söküm zamanı" email
4. **Sipariş oluşturuldu:** Admin'e bilgi email
5. **Sipariş iptal edildi:** İlgili tüm taraflara email

**Functional Requirements:**
- FR-5.1: Email template sistemi:
  - HTML formatında profesyonel şablonlar
  - Dinamik değişkenler: {müşteriAdı}, {poleID}, {tarih}, vb.
- FR-5.2: Bildirim tercihleri (user settings):
  - Email almak istiyorum (checkbox)
  - SMS almak istiyorum (checkbox - Phase 2)
- FR-5.3: Bildirim geçmişi (log):
  - Kime, ne zaman, hangi trigger, başarılı/başarısız
- FR-5.4: Retry mekanizması:
  - Email gönderimi başarısız olursa 3 kez tekrar dene

**Technical Notes:**
- Email: Nodemailer + Gmail SMTP (başlangıç) veya Resend.com
- Queue: Bull Queue (async email gönderimi)
- Template engine: Handlebars veya EJS

**Acceptance Criteria:**
- [ ] Atama yapıldığında 1 dakika içinde email gitmeli
- [ ] Email içeriği doğru bilgileri göstermeli
- [ ] Kullanıcı tercihe göre email almamalı (opt-out)
- [ ] Başarısız email retry edilmeli
- [ ] Admin panelde notification log görülebilmeli

**Priority:** P1 (High)

---

### Feature 6: Reporting & Analytics

**User Story:**  
*"Yönetici olarak, ay sonunda tedarikçilere hak ediş ödemesi için otomatik rapor oluşturabilmeliyim."*

**Report Types:**

#### 6.1 Baskı Tedarikçisi Raporu
- Rapor dönemi: Tarih aralığı seçimi
- İçerik:
  - Tedarikçi adı
  - Toplam iş adedi
  - Toplam m² (her iş için banner boyutu giriliyorsa)
  - Birim fiyat (variable pricing'den çekilir)
  - Toplam tutar
- Format: PDF + Excel export

#### 6.2 Saha Ekibi Raporu
- Rapor dönemi: Tarih aralığı seçimi
- İçerik:
  - Ekip adı
  - Toplam montaj sayısı
  - Toplam söküm sayısı
  - Montaj birim fiyatı
  - Söküm birim fiyatı
  - Toplam tutar
- Format: PDF + Excel export

#### 6.3 Finansal Özet Raporu (Admin)
- Dönem: Aylık/çeyrek/yıllık
- İçerik:
  - Toplam sipariş sayısı
  - Toplam gelir (müşteriden)
  - Toplam gider (tedarikçi + saha)
  - Net kar
  - Direk doluluk oranı (%)
- Format: PDF

**Functional Requirements:**
- FR-6.1: Rapor oluşturma sayfası (admin paneli)
- FR-6.2: Filtreler:
  - Tarih aralığı
  - Tedarikçi/ekip seçimi (tümü veya spesifik)
  - Rapor tipi seçimi
- FR-6.3: PDF generation:
  - Şirket logosu
  - Tarih aralığı bilgisi
  - Tablo formatında veriler
  - Toplam özetler
- FR-6.4: Excel export (csv):
  - Aynı veriler, Excel uyumlu
- FR-6.5: Raporları kaydetme/tekrar indirme

**Technical Notes:**
- PDF: pdfkit veya puppeteer (HTML → PDF)
- Excel: csv formatı (başlangıçta) veya exceljs
- Rapor oluşturma <30 saniye sürmeli

**Acceptance Criteria:**
- [ ] Tarih aralığı seçilip rapor oluşturulabilmeli
- [ ] PDF şirket logosu ve doğru verileri içermeli
- [ ] Excel export doğru formatda olmalı
- [ ] Rapor 30 saniyeden kısa sürede oluşmalı
- [ ] Oluşturulan raporlar tekrar indirilebilmeli

**Priority:** P1 (High)

---

### Feature 7: Variable Pricing Configuration

**User Story:**  
*"Yönetici olarak, tedarikçi fiyatlandırmasını ihtiyaç halinde güncelleyebilmeliyim."*

**Functional Requirements:**
- FR-7.1: Pricing settings sayfası (sadece admin):
  - m² başı baskı fiyatı (TL)
  - Montaj ücreti (adet başı - TL)
  - Söküm ücreti (adet başı - TL)
  - KDV oranı (%)
- FR-7.2: Fiyat değişiklik geçmişi (audit log):
  - Hangi değer, ne zaman, kim tarafından değiştirildi
- FR-7.3: Fiyat önizleme:
  - "X m² baskı + Y montaj" toplam ne tutar gösterir
- FR-7.4: Fiyat validasyonu:
  - Negatif değer girişi engellenmeliş
  - 0 girilirse uyarı gösterilmeli

**Technical Notes:**
- PricingConfig tablosu: key-value pair
- Keys: `print_price_per_sqm`, `mount_price`, `dismount_price`, `vat_rate`
- Raporlarda bu değerler kullanılacak

**Acceptance Criteria:**
- [ ] Admin fiyatları güncelleyebilmeli
- [ ] Değişiklik kaydedildiğinde toastify success gösterilmeli
- [ ] Geçmiş değişiklikler listede görünmeli
- [ ] Negatif değer girildiğinde validasyon hatası vermeli

**Priority:** P1 (High)

---

### Feature 8: Role-Specific Dashboards

**User Story:**  
*"Kullanıcı olarak, rolüme göre optimize edilmiş bir dashboard görmek istiyorum."*

#### 8.1 Süper Admin Dashboard
- Widget'lar:
  - Toplam sipariş sayısı (bu ay)
  - Aktif siparişler (LIVE)
  - Bekleyen işler (PENDING)
  - Toplam gelir (bu ay)
  - Direk doluluk oranı (%)
  - Son 30 günlük sipariş trend grafiği
- Quick actions:
  - Yeni kullanıcı ekle
  - Pricing ayarları
  - Rapor oluştur

#### 8.2 Operatör Dashboard
- Widget'lar:
  - Bugün oluşturulan siparişler
  - Bekleyen siparişler (PENDING)
  - Harita (quick view)
- Quick actions:
  - Yeni sipariş oluştur
  - Haritayı görüntüle

#### 8.3 Baskı Tedarikçisi Dashboard
- Widget'lar:
  - Baskıda olan işler (PRINTING)
  - Tamamlanan işler (bu hafta)
- Quick actions:
  - İşlerimi görüntüle

#### 8.4 Saha Ekibi Dashboard (Mobil-Optimized)
- Widget'lar (card-based):
  - Asılacaklar (AWAITING_MOUNT) - sayı + liste
  - Sökülecekler (EXPIRED) - sayı + liste
- Quick actions:
  - Haritada göster
  - Fotoğraf yükle

**Priority:** P1 (High)

---

### Feature 9: File Management & Storage

**User Story:**  
*"Operatör olarak, sipariş için gerekli dosyaları kolayca yükleyip sonra indirebilmeliyim."*

**Functional Requirements:**
- FR-9.1: Dosya tipleri:
  - Sözleşme (PDF) - max 10MB
  - Reklam görseli (JPG/PNG) - max 20MB
  - Kanıt fotoğrafı (JPG/PNG) - max 10MB (saha ekibi)
- FR-9.2: Upload validasyonu:
  - Dosya tipi kontrolü (MIME type)
  - Boyut kontrolü
  - Zararlı dosya taraması (basic)
- FR-9.3: Thumbnail generation (görseller için):
  - Mobilde hızlı yüklenme için
- FR-9.4: Dosya indirme:
  - Direct download link
  - Dosya adı: `{sipariş_ID}_{dosya_tipi}.{ext}`
- FR-9.5: Dosya silme (sadece admin):
  - Soft delete (fiziksel olarak kalmaya devam eder)

**Technical Notes:**
- Storage: Başlangıçta `public/uploads/`
- Klasör yapısı: `uploads/{orderId}/{fileType}/{filename}`
- Phase 2: Cloudinary veya AWS S3
- Image processing: Sharp library (thumbnail)

**Acceptance Criteria:**
- [ ] Sadece belirtilen dosya tipleri yüklenebilmeli
- [ ] Boyut limiti aşıldığında hata gösterilmeli
- [ ] Yüklenen dosya indirilebilir olmalı
- [ ] Thumbnail mobilde hızlı yüklenmeli
- [ ] Silinen dosya UI'dan kaybolmalı

**Priority:** P0 (Blocker)

---

### Feature 10: Mobile-First Saha Ekibi UI

**User Story:**  
*"Saha ekibi olarak, mobil cihazımdan kolayca görevlerimi görebilmeli, fotoğraf yükleyebilmeliyim."*

**Functional Requirements:**
- FR-10.1: Task list view:
  - "Asılacaklar" tab → AWAITING_MOUNT durumundaki işler
  - "Sökülecekler" tab → EXPIRED durumundaki işler
  - Card-based layout (her iş bir card)
  - Card bilgileri: Müşteri adı, Pole ID, Adres, Tarih
- FR-10.2: Navigasyon entegrasyonu:
  - "Yol Tarifi Al" butonu
  - Deep link: Google Maps / Waze (kullanıcı seçimi)
  - Format: `geo:{lat},{lng}?q={poleID}`
- FR-10.3: Fotoğraf yükleme:
  - "Fotoğraf Çek" butonu
  - HTML5 camera API (`<input type="file" accept="image/*" capture="camera">`)
  - Önizleme göster
  - "Yükle" butonu
- FR-10.4: İşlem tamamlama:
  - "Montaj Tamamlandı" butonu (fotoğraf zorunlu)
  - "Söküm Tamamlandı" butonu (fotoğraf zorunlu)
  - Buton basıldığında durum değişmeli
- FR-10.5: Offline fotoğraf desteği (Phase 2):
  - İnternet yoksa fotoğraf local storage'da saklanmalı
  - İnternet gelince otomatik upload

**Design Notes:**
- Minimum button height: 48px (dokunma için)
- Font size: minimum 16px (mobilde okunabilirlik)
- Karanlık mod desteği (saha dışarıda çalışır)
- Swipe actions: Sağa kaydır → Tamamla

**Acceptance Criteria:**
- [ ] Mobilde task list rahatça görülebilmeli
- [ ] "Yol Tarifi Al" Google Maps'i açmalı
- [ ] Kamera fotoğraf çekebilmeli
- [ ] Fotoğraf yüklemeden "Tamamla" yapılamamalı
- [ ] Butonlar dokunmaya responsive olmalı

**Priority:** P0 (Blocker)

---

## 🚫 Non-Goals (MVP Dışı - Phase 2)

Aşağıdakiler MVP'de **yer almayacak:**

- ❌ WhatsApp API entegrasyonu (başlangıçta email yeterli)
- ❌ SMS bildirimleri
- ❌ Advanced analytics (grafikler, trendler)
- ❌ Otomatik sözleşme oluşturma
- ❌ Multi-language support
- ❌ PWA + Offline mode (tam destek)
- ❌ Native mobil uygulama (iOS/Android)
- ❌ Ödeme sistemi entegrasyonu
- ❌ CRM entegrasyonu
- ❌ Müşteri self-service portalı
- ❌ QR kod ile direk tanıma
- ❌ AI destekli fiyat optimizasyonu

---

## 🔒 Security Requirements

### Authentication & Authorization
- SEC-1: Şifreler bcrypt ile hash'lenmeli (salt rounds: 10)
- SEC-2: JWT token secret env variable'dan okunmalı
- SEC-3: Token expiration: 8 saat
- SEC-4: Refresh token mekanizması (opsiyonel)
- SEC-5: Rate limiting: Login endpoint'e 5 deneme/dakika

### Data Protection
- SEC-6: HTTPS zorunlu (production)
- SEC-7: SQL injection koruması (Prisma ORM kullanımı)
- SEC-8: XSS koruması (React default escape)
- SEC-9: CSRF token (form submissions)
- SEC-10: File upload size limit enforcement

### Privacy
- SEC-11: GDPR compliance (kullanıcı silme hakkı)
- SEC-12: Audit logging (önemli işlemler)
- SEC-13: Şifre reset link 1 saat geçerli

---

## 📊 Performance Requirements

- PERF-1: Sayfa yüklenme süresi < 2 saniye (desktop)
- PERF-2: Sayfa yüklenme süresi < 3 saniye (mobile 3G)
- PERF-3: Harita yüklenme < 1.5 saniye (100 marker)
- PERF-4: API response time < 500ms (average)
- PERF-5: Dosya upload progress göstergesi
- PERF-6: Image optimization (thumbnail generation)
- PERF-7: Database query optimization (indexing)
- PERF-8: Lazy loading (harita dışındaki görseller)

---

## 🌐 Browser & Device Support

### Desktop Browsers
- Chrome 100+ ✅
- Firefox 100+ ✅
- Safari 15+ ✅
- Edge 100+ ✅

### Mobile Browsers
- Chrome Mobile (Android) ✅
- Safari Mobile (iOS 14+) ✅
- Samsung Internet ✅

### Screen Sizes
- Desktop: 1920x1080 (primary)
- Tablet: 768x1024
- Mobile: 375x667 (iPhone SE minimum)

---

## 🛠️ Technical Stack (Approved)

### Backend
- Runtime: Node.js 20+
- Framework: Express.js
- ORM: Prisma
- Database: PostgreSQL 15 + PostGIS
- Cache: Redis 7
- Queue: Bull
- Auth: JWT + Passport.js
- File Upload: Multer
- PDF: pdfkit
- Email: Nodemailer

### Frontend
- Build: Vite
- Framework: React 18
- Router: React Router v6
- State: Zustand
- Data Fetching: TanStack Query
- Styling: Tailwind CSS
- Components: Shadcn/ui
- Maps: React Leaflet
- Forms: React Hook Form + Zod
- Icons: Lucide React

---

## 📅 Release Plan & Milestones

### Milestone 1: Foundation (Gün 1-5)
- [ ] Auth + RBAC
- [ ] Database schema
- [ ] Basic CRUD API
- [ ] React setup

### Milestone 2: Core Features (Gün 6-11)
- [ ] Harita entegrasyonu
- [ ] Pole management
- [ ] Order management
- [ ] Workflow engine
- [ ] File upload

### Milestone 3: Polish & Deploy (Gün 12-15)
- [ ] Notifications
- [ ] Reporting
- [ ] Mobile optimization
- [ ] Testing
- [ ] Production deployment

### Launch Date: 18 Şubat 2026

---

## 📝 Decisions & Confirmed Requirements

### ✅ Confirmed Decisions (03 Şubat 2026):

1. **Fiyatlandırma Sistemi:** ✅ KARAR VERİLDİ
   - Admin panelinden dinamik olarak girilecek ve güncellenebilecek
   - Variable pricing config UI kullanılacak
   - Default değerler (başlangıç):
     - Baskı fiyatı: 500 TL/adet
     - Montaj ücreti: 200 TL/adet
     - Söküm ücreti: 150 TL/adet
     - KDV oranı: %20
   - Banner boyutu (m²) hesabı Phase 2'de (şimdilik adet bazlı)

2. **Direk Kapasitesi:** ✅ KARAR VERİLDİ
   - **1 direk = 1 reklam** (aynı anda sadece tek reklam)
   - Tarih çakışması kesinlikle engellenmeli
   - Direk "OCCUPIED" iken yeni sipariş alınamaz

3. **Tedarikçi Atama:** ✅ KARAR VERİLDİ
   - **Manuel atama** (admin/süper admin dropdown'dan seçer)
   - Baskıcı listesi: PRINTER rolündeki kullanıcılar
   - Saha ekibi listesi: FIELD rolündeki kullanıcılar
   - Otomatik atama (round-robin) Phase 2'de değerlendirilecek

4. **Kurumsal Web Sitesi (Landing Page):** ✅ KARAR VERİLDİ
   - Tasarım için referanslar toplanacak
   - Minimal, modern, temiz tasarım
   - 3 ana section: Hero/Slider, Hizmetler, İletişim
   - Login butonu header'da
   - Responsive (mobile-first)
   - İçerik: Proje ekibi tarafından hazırlanacak

5. **WhatsApp Bildirimleri:**
   - Phase 2'de WhatsApp Business API (Twilio/Vonage)
   - MVP'de email yeterli

### 🎯 Final Assumptions:
- ✅ Bir direk aynı anda tek reklam (çakışma yok) - **CONFIRMED**
- ✅ Fiyatlandırma dinamik, admin panelden güncellenebilir - **CONFIRMED**
- ✅ Tedarikçi admin tarafından manuel atanacak - **CONFIRMED**
- ✅ Landing page minimal olacak (design team tarafından) - **CONFIRMED**

---

## ✅ Acceptance Criteria (Overall MVP)

MVP tamamlanmış sayılabilmesi için:

- [ ] 4 farklı rol ile giriş yapılıp ilgili ekranlar görülebilmeli
- [ ] Haritadan direk eklenip, siparişe bağlanabilmeli
- [ ] 6 aşamalı workflow sorunsuz çalışmalı
- [ ] Dosya upload/download çalışmalı
- [ ] Email bildirimleri gitmeli
- [ ] PDF rapor oluşturulabilmeli
- [ ] Mobil cihazdan saha ekibi işlerini görebilmeli
- [ ] Fotoğraf yükleme çalışmalı
- [ ] Tüm ekranlar responsive olmalı
- [ ] Production'a deploy edilmiş olmalı

---

## 📚 Appendices

### Appendix A: Glossary
- **Pole Banner:** Aydınlatma direğine asılan dikey reklam afişi
- **Pole ID:** Direğin benzersiz kimlik numarası
- **RBAC:** Role-Based Access Control (Rol Bazlı Erişim Kontrolü)
- **PostGIS:** PostgreSQL'in coğrafi veri extension'ı

### Appendix B: References
- OpenStreetMap API: https://www.openstreetmap.org/
- Nominatim Geocoding: https://nominatim.org/
- Leaflet.js Docs: https://leafletjs.com/
- Prisma ORM: https://www.prisma.io/

---

**Doküman Sonu**

*Bu PRD, 03 Şubat 2026 tarihinde oluşturulmuştur ve projenin yaşam döngüsü boyunca güncellenecektir.*
