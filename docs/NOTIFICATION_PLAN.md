# Baygunes PBMS - Bildirim Sistemi Planlaması

## 🎯 Amaç
Direklere reklam verildiğinde ilgili tüm birimlerin otomatik olarak bilgilendirilmesi.

## 📋 Bildirim Senaryoları

### 1. Yeni Sipariş Oluşturulduğunda
**Tetikleyici:** `POST /api/orders` başarılı olduğunda

**Bildirim Gidenler:**
- ✅ **Admin (SUPER_ADMIN)** - Tüm yeni siparişlerden haberdar
- ✅ **Operatör (OPERATOR)** - Sadece kendi oluşturduğu sipariş hakkında
- ❌ **Baskıcı (PRINTER)** - Henüz atama yapılmadı, sonraki aşamada
- ❌ **Saha Ekibi (FIELD)** - Henüz atama yapılmadı, sonraki aşamada

**İçerik:**
```
Konu: Yeni Sipariş Alındı - {Müşteri Adı}
- Müşteri: {client_name}
- Direk: {pole_code}
- Tarih: {start_date} - {end_date}
- Fiyat: {price} TL
- Sipariş ID: {order_id}
```

### 2. Baskıcıya Atama Yapıldığında
**Tetikleyici:** `PATCH /api/orders/:id/assign-printer` başarılı olduğunda

**Bildirim Gidenler:**
- ✅ **Atanan Baskıcı (PRINTER)** - Kendisine iş atandı
- ✅ **Admin (SUPER_ADMIN)** - Atama bilgisi
- ❌ **Diğer Baskıcılar** - Bilgi gerekmez

**İçerik:**
```
Konu: Yeni Baskı İşi Atandı
- Müşteri: {client_name}
- Direk: {pole_code}
- Görsel: {ad_image_url} (ekte)
- Son Tarih: {start_date}
- Atayan: {assigned_by_name}
```

### 3. Saha Ekibine Atama Yapıldığında
**Tetikleyici:** `PATCH /api/orders/:id/assign-field` başarılı olduğunda

**Bildirim Gidenler:**
- ✅ **Atanan Saha Ekibi (FIELD)** - Kendisine montaj/söküm atandı
- ✅ **Admin (SUPER_ADMIN)** - Atama bilgisi
- ❌ **Diğer Saha Ekipleri** - Bilgi gerekmez

**İçerik:**
```
Konu: Montaj/Söküm Görevi Atandı
- Müşteri: {client_name}
- Direk: {pole_code}
- Adres: {full_address}
- İşlem: Montaj / Söküm
- Koordinatlar: {lat}, {lng}
- Harita: [Yol Tarifi]({google_maps_url})
```

### 4. Durum Değişikliklerinde
**Tetikleyici:** `PATCH /api/orders/:id/status` her çağrıldığında

| Eski Durum | Yeni Durum | Bildirim Gidenler |
|------------|------------|-------------------|
| PENDING | PRINTING | Admin, Baskıcı |
| PRINTING | AWAITING_MOUNT | Admin, Saha Ekibi |
| AWAITING_MOUNT | LIVE | Admin, Müşteri (opsiyonel) |
| LIVE | EXPIRED | Admin, Saha Ekibi (söküm için) |
| EXPIRED | COMPLETED | Admin, Tüm ilgililer |
| * | CANCELLED | Admin, İlgili birimler |

**İçerik:**
```
Konu: Sipariş Durumu Güncellendi
- Müşteri: {client_name}
- Eski Durum: {old_status}
- Yeni Durum: {new_status}
- Güncelleyen: {changed_by_name}
- Tarih: {timestamp}
```

### 5. Fotoğraf Yüklendiğinde
**Tetikleyici:** `POST /api/orders/:id/upload/proof` başarılı olduğunda

**Bildirim Gidenler:**
- ✅ **Admin (SUPER_ADMIN)** - Kanıt fotoğrafı yüklendi
- ❌ **Diğerleri** - Opsiyonel

**İçerik:**
```
Konu: {Montaj/Söküm} Fotoğrafı Yüklendi
- Müşteri: {client_name}
- Direk: {pole_code}
- Fotoğraf: {proof_url}
- Yükleyen: {uploaded_by_name}
```

### 6. Günlük Özet (Opsiyonel)
**Tetikleyici:** Cron job (her gün saat 09:00)

**Bildirim Gidenler:**
- ✅ **Admin (SUPER_ADMIN)** - Günlük özet rapor

**İçerik:**
```
Konu: Günlük Özet Rapor - {Tarih}
- Yeni Siparişler: {count}
- Tamamlanan İşler: {count}
- Bekleyen Atamalar: {count}
- Bugün Başlayan Reklamlar: {count}
- Bugün Biten Reklamlar: {count}
```

## 🔔 Bildirim Kanalları

### 1. Email Bildirimleri (Zorunlu)
- SMTP üzerinden gönderim
- HTML şablonlu
- Tüm kullanıcılara gider

### 2. SMS Bildirimleri (Opsiyonel - Phase 2)
- Kritik durumlar için (örn: Acil söküm)
- Twilio entegrasyonu

### 3. In-App Bildirimler (Opsiyonel - Phase 2)
- Dashboard üzerinde bildirim ikonu
- Real-time WebSocket bildirimleri

### 4. WhatsApp (Opsiyonel - Phase 2)
- WhatsApp Business API
- Kritik bildirimler için

## 📊 Bildirim Ayarları (User Preferences)

Her kullanıcı kendi bildirim tercihlerini yönetebilir:

```json
{
  "emailEnabled": true,
  "newOrderEnabled": true,
  "statusChangeEnabled": true,
  "assignmentEnabled": true,
  "reminderEnabled": true,
  "smsEnabled": false,
  "whatsappEnabled": false
}
```

## 🎯 Öncelik Sırası (Priority)

| Öncelik | Durum | Açıklama |
|---------|-------|----------|
| **Yüksek** | CANCELLED, EXPIRED → COMPLETED | İş tamamlanması kritik |
| **Yüksek** | Yeni atama | İlgili birim hemen çalışmalı |
| **Orta** | Durum değişiklikleri | Bilgi amaçlı |
| **Düşük** | Günlük özet | İstatistiksel bilgi |

## 🔧 Teknik Gereksinimler

### Backend
1. **Bull Queue** - Async bildirim gönderimi
2. **Notification Log** - Tüm bildirimlerin kaydı
3. **Retry Mechanism** - Başarısız bildirimleri tekrar dene
4. **Template Engine** - HTML email şablonları

### Veritabanı Tabloları
- `notification_logs` - Bildirim kayıtları
- `user_notification_preferences` - Kullanıcı tercihleri
- `notification_templates` - Email şablonları

### SMTP Ayarları
- Host: smtp.gmail.com
- Port: 587
- TLS: Enabled
- Auth: OAuth2 veya App Password

## 🚀 Uygulama Planı

### Phase 1 (MVP) - 1-2 Gün
- [x] Email servisi kurulumu
- [x] Bull Queue entegrasyonu
- [x] Temel bildirim tetikleyicileri
  - [x] Yeni sipariş
  - [x] Baskıcı atama
  - [x] Saha ekibi atama
  - [x] Durum değişiklikleri

### Phase 2 (Enhancement) - Sonra
- [ ] SMS entegrasyonu (Twilio)
- [ ] WhatsApp entegrasyonu
- [ ] In-app bildirimler (WebSocket)
- [ ] Push notification (PWA)
- [ ] Zenginleştirilmiş şablonlar

## 📝 Email Şablon Örnekleri

### Yeni Sipariş Şablonu
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #4f46e5;">Yeni Sipariş Alındı</h2>
  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
    <p><strong>Müşteri:</strong> {client_name}</p>
    <p><strong>Direk:</strong> {pole_code}</p>
    <p><strong>Tarih:</strong> {start_date} - {end_date}</p>
    <p><strong>Tutar:</strong> {price} TL</p>
  </div>
  <a href="{order_url}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px;">
    Siparişi Görüntüle
  </a>
</div>
```

### Atama Şablonu
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #059669;">Yeni Görev Atandı</h2>
  <p>Merhaba {user_name},</p>
  <p>Size yeni bir görev atandı:</p>
  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
    <p><strong>Müşteri:</strong> {client_name}</p>
    <p><strong>Direk:</strong> {pole_code}</p>
    <p><strong>Adres:</strong> {full_address}</p>
    <p><strong>Son Tarih:</strong> {due_date}</p>
  </div>
  <a href="{task_url}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #059669; color: white; text-decoration: none; border-radius: 6px;">
    Göreve Git
  </a>
</div>
```

## ✅ Acceptance Criteria

- [ ] Her yeni siparişte admin'e email gider
- [ ] Baskıcı atamasında ilgili baskıcıya email gider
- [ ] Saha ekibi atamasında ilgili kişiye email gider
- [ ] Durum değişikliklerinde ilgili taraflara bildirim gider
- [ ] Başarısız email'ler tekrar denenir (3 kez)
- [ ] Tüm bildirimler veritabanında loglanır
- [ ] Kullanıcılar bildirim tercihlerini yönetebilir
