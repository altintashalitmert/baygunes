# PBMS Operasyon SOP (Standart İşletim Prosedürü)

**Doküman Amacı:** Reklam siparişinin müşteri kaydından kapanışa kadar hatasız, izlenebilir ve role uygun şekilde yürütülmesi.  
**Kapsam:** SUPER_ADMIN, OPERATOR, PRINTER, FIELD ekipleri.

---

## 1. Roller ve Sorumluluklar

- **SUPER_ADMIN**
  - Tüm akış ve tüm statü geçişleri için nihai yetki.
  - Kullanıcı, fiyat, bildirim, sistem ayarları yönetimi.
- **OPERATOR**
  - Müşteri hesabı oluşturma/güncelleme.
  - Sipariş açma, atama yapma, operasyon koordinasyonu.
- **PRINTER**
  - Kendisine atanmış baskı işlerini yürütme.
- **FIELD**
  - Kendisine atanmış montaj/söküm işlerini yürütme, kanıt fotoğrafı yükleme.

---

## 2. Uçtan Uca Süreç Akışı

### A. Müşteri ve Talep Hazırlığı
1. `OPERATOR` müşteri kartını (`Account`) açar veya mevcut müşteri kaydını günceller.
2. İletişim/faturalama bilgileri doğrulanır.
3. Kampanya tarih aralığı ve hedef direk listesi netleştirilir.

### B. Direk Seçimi ve Uygunluk Kontrolü
1. Harita/liste ekranından direk seçilir (tekli veya toplu).
2. Sistem şu kontrolleri yapar:
   - Geçersiz tarih engeli.
   - Geçmiş tarih başlangıç engeli.
   - Tarih çakışması engeli (aktif siparişlerle overlap).

### C. Sipariş Oluşturma
1. Sipariş açılır.
2. Başlangıç tarihine göre başlangıç statüsü belirlenir:
   - Gelecek tarih: `SCHEDULED`
   - Bugün/aktif başlangıç: `PENDING`

### D. Atama (Zorunlu Kapılar)
1. `PENDING -> PRINTING` öncesi **baskı sorumlusu** atanmış olmalı.
2. `PRINTING -> AWAITING_MOUNT` öncesi **saha ekibi** atanmış olmalı.
3. Atama değişiklikleri audit olarak `workflow_history` tablosuna yazılır.

### E. Baskı Operasyonu
1. `PRINTER` kendi görev ekranından atanmış işleri görür.
2. Gerekli dosyalar kontrol edilir (sözleşme/görsel).
3. Baskı bitince sipariş `AWAITING_MOUNT` yapılır.

### F. Montaj Operasyonu
1. `FIELD` atanmış işte montaj yapar.
2. Montaj kanıt fotoğrafı (`PROOF_MOUNT`) yüklenir.
3. Kanıt varsa sipariş `LIVE` yapılır.

### G. Yayın ve Süre Sonu
1. Sipariş `LIVE` statüsünde yayındadır.
2. Zamanlayıcı (scheduler) süresi dolan işleri `EXPIRED` yapar.

### H. Söküm Operasyonu
1. `FIELD` veya `OPERATOR` söküm işini yürütür.
2. Söküm kanıt fotoğrafı (`PROOF_DISMOUNT`) yüklenir.
3. Kanıt varsa `EXPIRED -> COMPLETED` yapılır.

### I. Kapanış
1. `COMPLETED` veya `CANCELLED` olduğunda direk tekrar `AVAILABLE` olur.
2. İlgili kayıtlar (workflow, dosya, atama geçmişi) raporlamaya hazırdır.

---

## 3. Statü Geçiş Kuralları (Kaynak Kural)

- `SCHEDULED -> PENDING | CANCELLED`
- `PENDING -> PRINTING | CANCELLED`
- `PRINTING -> AWAITING_MOUNT | CANCELLED`
- `AWAITING_MOUNT -> LIVE | CANCELLED`
- `LIVE -> EXPIRED | COMPLETED` *(genellikle EXPIRED scheduler ile)*
- `EXPIRED -> COMPLETED`

**Not:** UI aksiyonları backend RBAC kurallarına tabidir. Yetkisiz geçişler API tarafından reddedilir.

---

## 4. Zorunlu Kontrol Noktaları (Gate Checklist)

### Sipariş Açmadan Önce
- [ ] Müşteri hesabı doğru seçildi.
- [ ] Başlangıç/bitiş tarihleri geçerli.
- [ ] Çakışan aktif sipariş yok.

### Baskıya Göndermeden Önce
- [ ] `assigned_printer` atandı.

### Montaja Göndermeden Önce
- [ ] `assigned_field` atandı.

### Yayına Almadan Önce
- [ ] Montaj kanıtı (`PROOF_MOUNT`) yüklendi.

### Siparişi Kapatmadan Önce
- [ ] Söküm kanıtı (`PROOF_DISMOUNT`) yüklendi.

---

## 5. Hata ve İstisna Yönetimi

- **Atama eksik hatası:** Önce ilgili rol ataması yapılır, sonra statü geçilir.
- **Kanıt eksik hatası:** İlgili proof yüklenmeden geçiş yapılmaz.
- **Yetki hatası (403):** Kullanıcının rolü/atanması kontrol edilir.
- **Tarih çakışması (409):** Yeni tarih aralığı ile yeniden planlanır.
- **Yanlış dosya türü/boyutu:** Kural uygun dosya tekrar yüklenir.

---

## 6. Günlük Operasyon Rutini

### OPERATOR (Gün Başlangıcı)
1. `SCHEDULED` ve `PENDING` işleri kontrol et.
2. Eksik atamaları tamamla.
3. `EXPIRED` olanlar için saha planını netleştir.

### PRINTER
1. `my-tasks` ekranından işleri al.
2. Baskı tamamlananları gecikmeden `AWAITING_MOUNT` yap.

### FIELD
1. `AWAITING_MOUNT` işleri montajla ve proof yükle.
2. `EXPIRED` işleri sökümle, dismount proof yükle, `COMPLETED` yap.

### SUPER_ADMIN (Gün Sonu)
1. Yetki/audit kayıtlarını örneklem kontrol et.
2. Açıkta kalan kritik işleri ve SLA ihlallerini değerlendir.

---

## 7. Raporlama ve İzlenebilirlik

- Her statü değişimi `workflow_history` üzerinde izlenir.
- Atama değişiklikleri de audit notu ile kaydedilir.
- PDF/finans raporları operasyon kapanışlarında alınır.

---

## 8. Konfigürasyon Notu (Bildirim)

- Bildirim sağlayıcıları (SMTP/SMS/WhatsApp) henüz satın alınmadıysa mock/test modunda çalıştırılabilir.
- Canlıya geçişte provider bilgileri doğrulanıp test bağlantısı alınmalıdır.
