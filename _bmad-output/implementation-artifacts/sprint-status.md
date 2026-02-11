# Sprint Status & Planning
# Şehir İçi Reklam ve Direk Yönetim Sistemi

**Sprint Başlangıç:** 05 Şubat 2026 (Gün 3)  
**Sprint Bitiş:** 18 Şubat 2026 (Gün 15)  
**Süre:** 13 iş günü  
**Metodoloji:** BMAD Method + Agile

---

## 📊 Sprint Overview

| Metric | Value |
|--------|-------|
| Total Epics | 8 |
| Total Stories | 35 |
| Completed Stories | 0 |
| In Progress | 0 |
| Planned | 35 |
| Story Points | ~130 hours |

---

## 🎯 Sprint Goals

1. 🔴 **Sprint 1 (Gün 3-5):** Foundation hazır (Auth + DB + Frontend Setup)
2. 🔴 **Sprint 2 (Gün 6-8):** Core features çalışıyor (Harita + Sipariş)
3. 🔴 **Sprint 3 (Gün 9-11):** Workflow tam çalışıyor
4. 🔴 **Sprint 4 (Gün 12-13):** Raporlama + Optimizasyon
5. 🔴 **Sprint 5 (Gün 14-15):** Polish + Deployment

---

## 📅 Sprint 1: Foundation (Gün 3-5)

**Hedef:** Backend ve Frontend temelleri hazır, Auth çalışıyor  
**Günler:** 3 gün  
**Focus:** Epic 1 (Auth) + Epic 2 (Frontend Setup)

### Story List

| Story ID | Title | Status | Assignee | Estimated | Actual |
|----------|-------|--------|----------|-----------|--------|
| 1.1 | Backend Project Setup | 🔴 PLANNED | - | 4h | - |
| 1.2 | Database Schema Implementation | 🔴 PLANNED | - | 3h | - |
| 1.3 | JWT Authentication Implementation | 🔴 PLANNED | - | 4h | - |
| 1.4 | Authorization Middleware | 🔴 PLANNED | - | 3h | - |
| 1.5 | User CRUD Endpoints | 🔴 PLANNED | - | 5h | - |
| 2.1 | Frontend Project Setup | 🔴 PLANNED | - | 4h | - |

**Total:** 6 stories, ~23 hours

### Daily Breakdown

**Gün 3 (05 Şubat):**
- [ ] Story 1.1: Backend Project Setup
- [ ] Story 1.2: Database Schema Implementation  
- [ ] Story 1.3: JWT Authentication (başlangıç)

**Gün 4 (06 Şubat):**
- [ ] Story 1.3: JWT Authentication (devam + tamamla)
- [ ] Story 1.4: Authorization Middleware
- [ ] Story 1.5: User CRUD (başlangıç)

**Gün 5 (07 Şubat):**
- [ ] Story 1.5: User CRUD (tamamla)
- [ ] Story 2.1: Frontend Project Setup
- [ ] Sprint 1 Review + Sprint 2 hazırlık

### Sprint 1 Definition of Done
- [ ] Backend server çalışıyor (port 3000)
- [ ] PostgreSQL bağlantısı var
- [ ] Login endpoint çalışıyor (`POST /api/auth/login`)
- [ ] User CRUD endpoints test edildi (Postman)
- [ ] Frontend React app çalışıyor (port 5173)
- [ ] Tailwind CSS + Router kurulu
- [ ] Git commits yapıldı

---

## 📅 Sprint 2: Core Features (Gün 6-8)

**Hedef:** Harita çalışıyor, Direk ve Sipariş oluşturulabiliyor  
**Günler:** 2.5 gün  
**Focus:** Epic 2 (Pole & Map) + Epic 3 (Order Creation başlangıç)

### Story List

| Story ID | Title | Status | Assignee | Estimated | Actual |
|----------|-------|--------|----------|-----------|--------|
| 2.2 | Leaflet Map Integration | 🔴 PLANNED | - | 3h | - |
| 2.3 | Pole Backend CRUD API | 🔴 PLANNED | - | 5h | - |
| 2.4 | Pole Frontend UI | 🔴 PLANNED | - | 6h | - |
| 2.5 | Pole Status Color Coding | 🔴 PLANNED | - | 3h | - |
| 2.6 | Pole Filtering & Search | 🔴 PLANNED | - | 4h | - |
| 3.1 | Order Creation Backend | 🔴 PLANNED | - | 5h | - |
| 3.2 | Order Creation Frontend | 🔴 PLANNED | - | 6h | - |

**Total:** 7 stories, ~32 hours

### Daily Breakdown

**Gün 6 (08 Şubat):**
- [ ] Story 2.2: Leaflet Map Integration
- [ ] Story 2.3: Pole Backend CRUD API
- [ ] Story 2.4: Pole Frontend UI (başlangıç)

**Gün 7 (09 Şubat):**
- [ ] Story 2.4: Pole Frontend UI (tamamla)
- [ ] Story 2.5: Pole Status Color Coding
- [ ] Story 2.6: Pole Filtering (başlangıç)

**Gün 8 (10 Şubat):**
- [ ] Story 2.6: Pole Filtering (tamamla)
- [ ] Story 3.1: Order Creation Backend
- [ ] Story 3.2: Order Creation Frontend (başlangıç)

### Sprint 2 Definition of Done
- [ ] Harita görüntüleniyor (Leaflet + OpenStreetMap)
- [ ] Haritadan direk eklenebiliyor
- [ ] Pole ID otomatik oluşuyor
- [ ] Marker'lar renk kodlu (yeşil/kırmızı)
- [ ] Pole listesi filtrelenebiliyor
- [ ] Sipariş formu çalışıyor
- [ ] Tarih çakışma kontrolü çalışıyor

---

## 📅 Sprint 3: Workflow & Files (Gün 9-11)

**Hedef:** Tam iş akışı çalışıyor, dosyalar yüklenebiliyor  
**Günler:** 3 gün  
**Focus:** Epic 3 (Workflow) + Epic 4 (File Management)

### Story List

| Story ID | Title | Status | Assignee | Estimated | Actual |
|----------|-------|--------|----------|-----------|--------|
| 3.2 | Order Creation Frontend (cont.) | 🔴 PLANNED | - | 2h | - |
| 3.3 | Workflow State Machine Backend | 🔴 PLANNED | - | 6h | - |
| 3.4 | Workflow UI & Status Badges | 🔴 PLANNED | - | 7h | - |
| 3.5 | Assign Printer/Field Team | 🔴 PLANNED | - | 4h | - |
| 3.6 | Order List View (Role-based) | 🔴 PLANNED | - | 5h | - |
| 3.7 | Order Cancel/Delete | 🔴 PLANNED | - | 3h | - |
| 3.8 | Cron Job - Auto Expire | 🔴 PLANNED | - | 3h | - |
| 4.1 | File Upload Backend | 🔴 PLANNED | - | 4h | - |
| 4.2 | File Upload Frontend | 🔴 PLANNED | - | 5h | - |
| 4.3 | File Download | 🔴 PLANNED | - | 2h | - |
| 4.4 | Saha Ekibi Fotoğraf (Mobil) | 🔴 PLANNED | - | 4h | - |

**Total:** 11 stories, ~45 hours

### Daily Breakdown

**Gün 9 (11 Şubat):**
- [ ] Story 3.2: Order Creation Frontend (tamamla)
- [ ] Story 3.3: Workflow State Machine Backend
- [ ] Story 3.4: Workflow UI (başlangıç)

**Gün 10 (12 Şubat):**
- [ ] Story 3.4: Workflow UI (tamamla)
- [ ] Story 3.5: Assign Printer/Field Team
- [ ] Story 3.6: Order List View
- [ ] Story 4.1: File Upload Backend (başlangıç)

**Gün 11 (13 Şubat):**
- [ ] Story 4.1: File Upload Backend (tamamla)
- [ ] Story 4.2: File Upload Frontend
- [ ] Story 4.3: File Download
- [ ] Story 3.7: Order Cancel
- [ ] Story 3.8: Cron Job

### Sprint 3 Definition of Done
- [ ] Sipariş PENDING → COMPLETED akışı çalışıyor
- [ ] Workflow timeline UI'da görünüyor
- [ ] Baskıcı/saha ekibi ataması yapılabiliyor
- [ ] Role-based order listesi çalışıyor
- [ ] Dosya upload/download çalışıyor
- [ ] Mobilde kamera ile fotoğraf çekiliyor
- [ ] Cron job test edildi (manuel trigger)

---

## 📅 Sprint 4: Notifications & Reporting (Gün 12-13)

**Hedef:** Bildirimler gidiyor, raporlar oluşuyor  
**Günler:** 2 gün  
**Focus:** Epic 5 (Notifications) + Epic 6 (Reporting) + Epic 7 (Pricing)

### Story List

| Story ID | Title | Status | Assignee | Estimated | Actual |
|----------|-------|--------|----------|-----------|--------|
| 4.4 | Saha Fotoğraf (cont.) | 🔴 PLANNED | - | 1h | - |
| 5.1 | Bull Queue & Email Service | 🔴 PLANNED | - | 5h | - |
| 5.2 | Notification Triggers | 🔴 PLANNED | - | 4h | - |
| 5.3 | Notification Prefs & Log | 🔴 PLANNED | - | 3h | - |
| 6.1 | Pricing Config UI | 🔴 PLANNED | - | 4h | - |
| 6.2 | Report Generation (PDF) | 🔴 PLANNED | - | 6h | - |
| 6.3 | Report Generation UI | 🔴 PLANNED | - | 4h | - |
| 6.4 | Excel Export | 🔴 PLANNED | - | 3h | - |
| 7.1 | Pricing CRUD Backend | 🔴 PLANNED | - | 2h | - |
| 7.3 | Pricing History View | 🔴 PLANNED | - | 3h | - |

**Total:** 10 stories, ~35 hours

### Daily Breakdown

**Gün 12 (14 Şubat):**
- [ ] Story 5.1: Bull Queue + Email Service
- [ ] Story 5.2: Notification Triggers
- [ ] Story 5.3: Notification Preferences
- [ ] Story 6.1: Pricing Config UI
- [ ] Story 7.1: Pricing CRUD

**Gün 13 (15 Şubat):**
- [ ] Story 6.2: Report Generation PDF
- [ ] Story 6.3: Report Generation UI
- [ ] Story 6.4: Excel Export
- [ ] Story 7.3: Pricing History
- [ ] Responsive check (mobil optimizasyon)

### Sprint 4 Definition of Done
- [ ] Email bildirimleri gönderiliyor
- [ ] Bull Queue çalışıyor
- [ ] Hak ediş raporu PDF oluşuyor
- [ ] Excel export çalışıyor
- [ ] Pricing config güncellenebiliyor
- [ ] Mobil UI responsive

---

## 📅 Sprint 5: Landing & Polish (Gün 14-15)

**Hedef:** Landing page hazır, tüm sistem test edildi, deploy edildi  
**Günler:** 2 gün  
**Focus:** Epic 8 (Landing) + Testing + Deployment

### Story List

| Story ID | Title | Status | Assignee | Estimated | Actual |
|----------|-------|--------|----------|-----------|--------|
| 8.1 | Landing Page Design & Dev | 🔴 PLANNED | - | 6h | - |
| 8.2 | Contact Form Integration | 🔴 PLANNED | - | 3h | - |
| - | End-to-End Testing | 🔴 PLANNED | - | 4h | - |
| - | Bug Fixing | 🔴 PLANNED | - | 4h | - |
| - | Mobile Responsive Testing | 🔴 PLANNED | - | 2h | - |
| - | Production Deployment | 🔴 PLANNED | - | 3h | - |
| - | User Acceptance Testing | 🔴 PLANNED | - | 2h | - |

**Total:** 7 tasks, ~24 hours

### Daily Breakdown

**Gün 14 (16 Şubat):**
- [ ] Story 8.1: Landing Page
- [ ] Story 8.2: Contact Form
- [ ] E2E Testing (Happy path)
- [ ] Bug fixes

**Gün 15 (17-18 Şubat):**
- [ ] Mobile responsive final check
- [ ] Cross-browser testing
- [ ] Production deployment (Railway/Render)
- [ ] Smoke testing (production)
- [ ] User Acceptance Testing
- [ ] Documentation (deployment guide)

### Sprint 5 Definition of Done
- [ ] Landing page public'te erişilebilir
- [ ] Tüm core flow'lar test edildi
- [ ] Kritik bug'lar düzeltildi
- [ ] Production'a deploy edildi
- [ ] SSL çalışıyor
- [ ] Smoke test passed
- [ ] Kullanıcılara demo yapıldı

---

## 📊 Story Status Legend

| Icon | Status | Meaning |
|------|--------|---------|
| 🔴 | PLANNED | Henüz başlanmadı |
| 🟡 | IN PROGRESS | Üzerinde çalışılıyor |
| 🟢 | COMPLETED | Tamamlandı |
| 🔵 | CODE REVIEW | Review bekleniyor |
| ⚫ | BLOCKED | Engellenmiş |

---

## 🎯 Daily Standup Format

Her gün:
1. **Dün ne yaptım?** (tamamlanan story'ler)
2. **Bugün ne yapacağım?** (planlanan story'ler)
3. **Blocker var mı?** (engeller)

---

## 🚨 Blocker Escalation

Eğer bir blocker varsa:
1. Hemen task.md'de işaretle
2. Alternatif çözüm ara
3. Gerekirse scope adjustment

---

## ✅ Sprint Completion Criteria

Sprint tamamlanmış sayılır:
- [ ] Tüm PLANNED story'ler COMPLETED
- [ ] Code review yapıldı (`/bmad-bmm-code-review`)
- [ ] Integration test passed
- [ ] Production deploy edildi
- [ ] User acceptance test passed

---

## 📝 Notes

**Risk Reminder:**
- ⚠️ Timeline aggressive - scope discipline kritik
- ⚠️ Daily progress tracking yapılmalı
- ⚠️ Blocker'lar hızlıca handle edilmeli

**Success Factors:**
- ✅ Her story için DoD tanımlı
- ✅ Sprint goals net
- ✅ Daily breakdown var
- ✅ Code review process tanımlı

---

## 🔄 Progress Tracking

**Bu dosya günlük güncellenecek:**
- Story status'ler (🔴 → 🟡 → 🟢)
- Actual hours
- Blocker notları
- Daily standup summaries

---

**Son Güncelleme:** 03 Şubat 2026 15:36  
**Sonraki Güncelleme:** 05 Şubat 2026 (Gün 3 - Sprint başlangıcı)

**🚀 PLANLAMA TAMAMLANDI - GELİŞTİRME 05 ŞUBAT'TA BAŞLIYOR!**
