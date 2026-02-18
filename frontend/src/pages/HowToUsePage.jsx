import React, { useState } from 'react';
import { 
  BookOpen, 
  Users, 
  MapPin, 
  FileText, 
  Bell, 
  Camera, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Printer,
  Truck,
  Settings,
  HelpCircle,
  Phone,
  Mail
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const AccordionItem = ({ title, icon: Icon, children, isOpen, onToggle }) => (
  <div className="border border-gray-200 rounded-lg mb-3 overflow-hidden bg-white">
    <button
      onClick={onToggle}
      className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-indigo-600" />
        <span className="font-semibold text-gray-800">{title}</span>
      </div>
      {isOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
    </button>
    {isOpen && (
      <div className="px-6 py-4 border-t border-gray-200">
        {children}
      </div>
    )}
  </div>
);

const Step = ({ number, title, description, image }) => (
  <div className="flex gap-4 mb-6 last:mb-0">
    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
      {number}
    </div>
    <div className="flex-1">
      <h4 className="font-semibold text-gray-800 mb-1">{title}</h4>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </div>
  </div>
);

const RoleCard = ({ role, icon: Icon, title, description, permissions }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-indigo-600" />
      </div>
      <div>
        <h4 className="font-semibold text-gray-800">{title}</h4>
        <span className="text-xs text-gray-500 uppercase tracking-wide">{role}</span>
      </div>
    </div>
    <p className="text-gray-600 text-sm mb-3">{description}</p>
    <ul className="space-y-1">
      {permissions.map((perm, idx) => (
        <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span>{perm}</span>
        </li>
      ))}
    </ul>
  </div>
);

const WorkflowStep = ({ status, label, description, icon: Icon }) => (
  <div className="flex items-start gap-3 mb-4 last:mb-0">
    <div className="flex flex-col items-center">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
        status === 'active' ? 'bg-indigo-600 text-white' : 
        status === 'completed' ? 'bg-green-500 text-white' : 
        'bg-gray-200 text-gray-500'
      }`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="w-0.5 h-8 bg-gray-300 my-1 last:hidden"></div>
    </div>
    <div className="flex-1 pt-2">
      <h5 className="font-semibold text-gray-800">{label}</h5>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  </div>
);

export default function HowToUsePage() {
  const { user } = useAuthStore();
  const [openSection, setOpenSection] = useState('overview');

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
            <BookOpen className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sistem Kullanım Kılavuzu
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Baygunes Pole Banner Management System (PBMS) kullanımı hakkında kapsamlı bilgiler. 
            Her rol için özel talimatlar ve en iyi uygulamalar.
          </p>
          {user && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm">
              <Users className="w-4 h-4 text-indigo-600" />
              <span className="text-gray-700">Mevcut Rolünüz:</span>
              <span className="font-semibold text-indigo-600">
                {user.role === 'SUPER_ADMIN' && 'Yönetici'}
                {user.role === 'OPERATOR' && 'Operatör'}
                {user.role === 'PRINTER' && 'Baskıcı'}
                {user.role === 'FIELD' && 'Saha Ekibi'}
              </span>
            </div>
          )}
        </div>

        {/* Quick Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
            Hızlı Navigasyon
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button 
              onClick={() => document.getElementById('roles').scrollIntoView({ behavior: 'smooth' })}
              className="text-left px-4 py-3 rounded-lg bg-gray-50 hover:bg-indigo-50 transition-colors text-sm"
            >
              <span className="font-medium text-gray-700">Kullanıcı Rolleri</span>
            </button>
            <button 
              onClick={() => document.getElementById('workflow').scrollIntoView({ behavior: 'smooth' })}
              className="text-left px-4 py-3 rounded-lg bg-gray-50 hover:bg-indigo-50 transition-colors text-sm"
            >
              <span className="font-medium text-gray-700">İş Akışı</span>
            </button>
            <button 
              onClick={() => document.getElementById('guide').scrollIntoView({ behavior: 'smooth' })}
              className="text-left px-4 py-3 rounded-lg bg-gray-50 hover:bg-indigo-50 transition-colors text-sm"
            >
              <span className="font-medium text-gray-700">Adım Adım Kılavuz</span>
            </button>
            <button 
              onClick={() => document.getElementById('faq').scrollIntoView({ behavior: 'smooth' })}
              className="text-left px-4 py-3 rounded-lg bg-gray-50 hover:bg-indigo-50 transition-colors text-sm"
            >
              <span className="font-medium text-gray-700">SSS</span>
            </button>
          </div>
        </div>

        {/* User Roles Section */}
        <div id="roles" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Kullanıcı Rolleri ve Yetkiler
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <RoleCard
              role="SUPER_ADMIN"
              icon={Settings}
              title="Yönetici"
              description="Sistem yöneticisi. Tüm operasyonu gözetler, finansal kontrolü sağlar."
              permissions={[
                'Kullanıcı ekleme/silme/düzenleme',
                'Tüm siparişleri görüntüleme',
                'Rapor oluşturma',
                'Fiyatlandırma ayarları',
                'Workflow rollback (geri alma)',
                'Sipariş iptal etme'
              ]}
            />
            <RoleCard
              role="OPERATOR"
              icon={FileText}
              title="Operatör"
              description="Müşteri ile ilk temas noktası. Sipariş alır ve süreci başlatır."
              permissions={[
                'Harita üzerinde direk yönetimi',
                'Yeni sipariş oluşturma',
                'Sözleşme ve görsel yükleme',
                'Sipariş takibi',
                'Baskıcı ve saha ekibi atama'
              ]}
            />
            <RoleCard
              role="PRINTER"
              icon={Printer}
              title="Baskıcı"
              description="Reklam baskısını yapan firma temsilcisi."
              permissions={[
                'Kendisine atanan işleri görme',
                'Görselleri indirme',
                'Baskı durumunu güncelleme',
                'Saha ekibi atama'
              ]}
            />
            <RoleCard
              role="FIELD"
              icon={Truck}
              title="Saha Ekibi"
              description="Arazide reklam asan/söken ekip."
              permissions={[
                'Mobil uyumlu görev listesi',
                'Harita üzerinde direk görme',
                'Fotoğraf yükleme',
                'Montaj/söküm tamamlama'
              ]}
            />
          </div>
        </div>

        {/* Workflow Section */}
        <div id="workflow" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <ArrowRight className="w-6 h-6 text-indigo-600" />
            Sipariş İş Akışı (6 Aşama)
          </h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-gray-600 mb-6">
              Her sipariş aşağıdaki 6 aşamadan geçer. Aşamalar arası geçişler otomatik veya yetkili kullanıcılar tarafından yapılır.
            </p>
            <div className="max-w-2xl">
              <WorkflowStep
                status="completed"
                label="1. PENDING (Beklemede)"
                description="Sipariş oluşturuldu, baskıcı atanmayı bekliyor. Admin/Operatör baskıcı atar."
                icon={AlertCircle}
              />
              <WorkflowStep
                status="completed"
                label="2. PRINTING (Baskıda)"
                description="Baskıcıya atandı. Baskıcı görseli indirip baskıyı yapar, saha ekibi atar."
                icon={Printer}
              />
              <WorkflowStep
                status="completed"
                label="3. AWAITING_MOUNT (Montaj Bekliyor)"
                description="Baskı tamamlandı. Saha ekibi reklamı direğe asar ve fotoğraf çeker."
                icon={Camera}
              />
              <WorkflowStep
                status="active"
                label="4. LIVE (Yayında)"
                description="Reklam yayında. Süre bitiminde sistem otomatik EXPIRED yapar."
                icon={CheckCircle}
              />
              <WorkflowStep
                status="completed"
                label="5. EXPIRED (Süre Doldu)"
                description="Süre doldu. Saha ekibi reklamı söker ve söküm fotoğrafı çeker."
                icon={AlertCircle}
              />
              <WorkflowStep
                status="completed"
                label="6. COMPLETED (Tamamlandı)"
                description="Söküm tamamlandı. Sipariş kapanır, raporlamaya hazır."
                icon={CheckCircle}
              />
            </div>
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-yellow-800 mb-1">Önemli Not</h5>
                  <p className="text-sm text-yellow-700">
                    AWAITING_MOUNT → LIVE geçişinde montaj fotoğrafı, EXPIRED → COMPLETED geçişinde söküm fotoğrafı zorunludur. 
                    Fotoğraf olmadan geçiş yapılamaz.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step by Step Guide */}
        <div id="guide" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Adım Adım Kullanım Kılavuzu
          </h2>

          {/* For Operators */}
          <AccordionItem
            title="Operatör Kılavuzu: Sipariş Oluşturma"
            icon={FileText}
            isOpen={openSection === 'operator-order'}
            onToggle={() => toggleSection('operator-order')}
          >
            <div className="space-y-4">
              <Step
                number={1}
                title="Müşteri Hesabı Seçin"
                description="Accounts sayfasından mevcut müşteriyi seçin veya yeni müşteri ekleyin. Müşteri bilgileri otomatik olarak siparişe aktarılacaktır."
              />
              <Step
                number={2}
                title="Direk Seçimi"
                description="Haritadan veya listeden uygun direği seçin. Kırmızı markerlar dolu, yeşil markerlar boş direkleri gösterir. Tarih çakışması olmamasına dikkat edin."
              />
              <Step
                number={3}
                title="Tarih Belirleme"
                description="Başlangıç ve bitiş tarihlerini seçin. Bitiş tarihi başlangıç tarihinden sonra olmalıdır. Geçmiş tarih seçilemez."
              />
              <Step
                number={4}
                title="Fiyat ve Detaylar"
                description="Kampanya fiyatını girin. Sistem otomatik olarak KDV dahil hesaplayacaktır. Müşteri adı ve iletişim bilgilerini kontrol edin."
              />
              <Step
                number={5}
                title="Dosya Yükleme"
                description="Sözleşme (PDF, max 10MB) ve reklam görselini (JPG/PNG, max 20MB) yükleyin. Dosyalar sonradan da eklenebilir."
              />
              <Step
                number={6}
                title="Siparişi Kaydet"
                description="Tüm bilgileri kontrol edip 'Sipariş Oluştur' butonuna tıklayın. Başarılı oluşturma sonrası sistem otomatik olarak admin ve ilgili taraflara bildirim gönderir."
              />
            </div>
          </AccordionItem>

          {/* For Operators - Pole Management */}
          <AccordionItem
            title="Operatör Kılavuzu: Direk Yönetimi"
            icon={MapPin}
            isOpen={openSection === 'operator-poles'}
            onToggle={() => toggleSection('operator-poles')}
          >
            <div className="space-y-4">
              <Step
                number={1}
                title="Yeni Direk Ekleme"
                description="Haritada uygun konuma tıklayın veya manuel koordinat girin. Sistem otomatik olarak adres bilgilerini çekmeye çalışacaktır."
              />
              <Step
                number={2}
                title="Direk Kodu Oluşturma"
                description="Otomatik direk kodu şu formatta oluşur: İL-İLÇE-MAHALLE-CADDE-SIRA (örn: ISKADB01). Kod unique olmalıdır."
              />
              <Step
                number={3}
                title="Adres Bilgileri"
                description="Şehir, ilçe, mahalle ve cadde bilgilerini girin. Bu bilgiler raporlarda ve haritada görünecektir."
              />
              <Step
                number={4}
                title="Durum Kontrolü"
                description="Direk durumunu belirtin: AVAILABLE (boş), OCCUPIED (dolu), MAINTENANCE (bakımda), INACTIVE (pasif)."
              />
            </div>
          </AccordionItem>

          {/* For Printers */}
          <AccordionItem
            title="Baskıcı Kılavuzu: İş Akışı"
            icon={Printer}
            isOpen={openSection === 'printer'}
            onToggle={() => toggleSection('printer')}
          >
            <div className="space-y-4">
              <Step
                number={1}
                title="Görevleri Görüntüleme"
                description="'Print Tasks' sayfasına gidin. Size atanan tüm baskı işleri listelenecektir."
              />
              <Step
                number={2}
                title="Görsel İndirme"
                description="Sipariş detayına tıklayın ve 'Ad Image' dosyasını indirin. Görselin doğruluğunu kontrol edin."
              />
              <Step
                number={3}
                title="Baskı İşlemi"
                description="Görseli indirip baskısını yapın. Kalite kontrolü yapmayı unutmayın."
              />
              <Step
                number={4}
                title="Saha Ekibi Atama"
                description="Baskı tamamlandığında sipariş durumunu 'AWAITING_MOUNT' olarak güncelleyin. Sistem sizden saha ekibi seçmenizi isteyecektir."
              />
            </div>
          </AccordionItem>

          {/* For Field Teams */}
          <AccordionItem
            title="Saha Ekibi Kılavuzu: Montaj ve Söküm"
            icon={Truck}
            isOpen={openSection === 'field'}
            onToggle={() => toggleSection('field')}
          >
            <div className="space-y-4">
              <Step
                number={1}
                title="Görev Listesi"
                description="'Field Tasks' sayfasına gidin. 'Asılacaklar' ve 'Sökülecekler' sekmeleri görevleri gösterir."
              />
              <Step
                number={2}
                title="Harita Navigasyonu"
                description="Görev kartındaki 'Yol Tarifi' butonuna tıklayın. Google Maps veya Waze ile direk konumuna yönlendirilirsiniz."
              />
              <Step
                number={3}
                title="Montaj İşlemi"
                description="Reklam afişini direğe asın. İşlem tamamlandığında mutlaka fotoğraf çekin (kanıt zorunluluğu)."
              />
              <Step
                number={4}
                title="Fotoğraf Yükleme"
                description="'Fotoğraf Çek' butonuna tıklayın veya galeriden seçin. Fotoğraf yüklemeden 'Montaj Tamamlandı' butonu aktif olmaz."
              />
              <Step
                number={5}
                title="İşlem Tamamlama"
                description="Fotoğraf yüklendikten sonra 'Montaj Tamamlandı' butonuna tıklayın. Sipariş durumu otomatik 'LIVE' olacaktır."
              />
              <Step
                number={6}
                title="Söküm İşlemi"
                description="Süre dolan reklamlar 'Sökülecekler' listesinde görünür. Söküm yaptıktan sonra söküm fotoğrafı yükleyin ve tamamlayın."
              />
            </div>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="font-semibold text-blue-800 mb-2">Mobil Kullanım İpuçları</h5>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Telefonunuzu yan çevirerek daha geniş görünüm elde edebilirsiniz</li>
                <li>• Fotoğraf çekerken düşük ışık modunu kullanabilirsiniz</li>
                <li>• İnternet bağlantısı zayıfsa sayfayı yenileyerek tekrar deneyin</li>
              </ul>
            </div>
          </AccordionItem>

          {/* For Admins */}
          <AccordionItem
            title="Yönetici Kılavuzu: Raporlama ve İzleme"
            icon={Settings}
            isOpen={openSection === 'admin'}
            onToggle={() => toggleSection('admin')}
          >
            <div className="space-y-4">
              <Step
                number={1}
                title="Finansal Raporlar"
                description="'Reports' sayfasından dönem seçip finansal özet raporu oluşturun. Gelir, gider ve kar marjını görüntüleyin."
              />
              <Step
                number={2}
                title="Tedarikçi Raporları"
                description="Baskıcı ve saha ekibi raporlarını oluşturun. Hak ediş hesaplamaları otomatik yapılır. PDF olarak indirebilirsiniz."
              />
              <Step
                number={3}
                title="Fiyatlandırma Ayarları"
                description="'Pricing' sayfasından baskı, montaj ve söküm ücretlerini güncelleyin. Değişiklikler otomatik olarak yeni siparişlere yansır."
              />
              <Step
                number={4}
                title="Workflow Rollback"
                description="Yanlışlıkla yapılan durum değişikliklerini geri alabilirsiniz. Sipariş detayında 'Rollback' seçeneği bulunur."
              />
              <Step
                number={5}
                title="Kullanıcı Yönetimi"
                description="'Users' sayfasından yeni kullanıcılar ekleyin, rolleri düzenleyin veya kullanıcıları pasifleştirin."
              />
            </div>
          </AccordionItem>
        </div>

        {/* FAQ Section */}
        <div id="faq" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-indigo-600" />
            Sık Sorulan Sorular (SSS)
          </h2>
          <div className="space-y-4">
            <AccordionItem
              title="Sipariş oluştururken 'tarih çakışması' hatası alıyorum. Ne yapmalıyım?"
              icon={AlertCircle}
              isOpen={openSection === 'faq-1'}
              onToggle={() => toggleSection('faq-1')}
            >
              <p className="text-gray-600">
                Bu hata, seçtiğiniz direk için belirttiğiniz tarihlerde başka bir aktif sipariş olduğunu gösterir. 
                Çözüm: Başka bir direk seçin veya tarih aralığını değiştirin. Dolu direkler haritada kırmızı markerla gösterilir.
              </p>
            </AccordionItem>

            <AccordionItem
              title="Fotoğraf yükleme butonu neden pasif/gri görünüyor?"
              icon={Camera}
              isOpen={openSection === 'faq-2'}
              onToggle={() => toggleSection('faq-2')}
            >
              <p className="text-gray-600">
                Fotoğraf yükleme sadece AWAITING_MOUNT (montaj) ve EXPIRED (söküm) durumlarında aktiftir. 
                Ayrıca, mobil cihazda kamera izni vermediyseniz buton pasif kalabilir. Tarayıcı ayarlarından izinleri kontrol edin.
              </p>
            </AccordionItem>

            <AccordionItem
              title="Şifremi unuttum. Nasıl sıfırlayabilirim?"
              icon={Bell}
              isOpen={openSection === 'faq-3'}
              onToggle={() => toggleSection('faq-3')}
            >
              <p className="text-gray-600">
                Giriş sayfasındaki 'Şifremi Unuttum' bağlantısına tıklayın. Kayıtlı email adresinize sıfırlama linki gönderilecektir. 
                Link 1 saat geçerlidir. Spam klasörünü kontrol etmeyi unutmayın.
              </p>
            </AccordionItem>

            <AccordionItem
              title="Sipariş durumunu yanlış güncelledim. Geri alabilir miyim?"
              icon={ArrowRight}
              isOpen={openSection === 'faq-4'}
              onToggle={() => toggleSection('faq-4')}
            >
              <p className="text-gray-600">
                Sadece SUPER_ADMIN (Yönetici) rolündeki kullanıcılar workflow rollback yapabilir. 
                Sipariş detay sayfasında 'Rollback' seçeneği bulunur. Geçmiş durumlara geri dönülebilir.
              </p>
            </AccordionItem>

            <AccordionItem
              title="Raporlarda KDV oranı nereden geliyor?"
              icon={FileText}
              isOpen={openSection === 'faq-5'}
              onToggle={() => toggleSection('faq-5')}
            >
              <p className="text-gray-600">
                KDV oranı 'Pricing' sayfasından ayarlanır. Varsayılan değer %20'dir. Bu oran tüm finansal raporlara otomatik uygulanır. 
                Oran değişikliği sadece ileri tarihli raporları etkiler, geçmiş raporlar sabit kalır.
              </p>
            </AccordionItem>

            <AccordionItem
              title="Direk silemiyorum. Neden?"
              icon={MapPin}
              isOpen={openSection === 'faq-6'}
              onToggle={() => toggleSection('faq-6')}
            >
              <p className="text-gray-600">
                Aktif siparişi olan direkler silinemez. Önce direkteki tüm siparişlerin COMPLETED veya CANCELLED olması gerekir. 
                Direkler soft delete edilir, yani geri yüklenebilir. Silinen direkleri 'restore' endpointi ile geri getirebilirsiniz.
              </p>
            </AccordionItem>
          </div>
        </div>

        {/* Best Practices */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-6 mb-10 text-white">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6" />
            En İyi Uygulamalar
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <ul className="space-y-2 text-indigo-100">
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-1 flex-shrink-0" />
                <span>Her gün görevlerinizi kontrol edin ve güncelleyin</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-1 flex-shrink-0" />
                <span>Fotoğraf yüklerken net ve aydınlık görüntüler seçin</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-1 flex-shrink-0" />
                <span>Sipariş öncesi direk müsaitliğini kontrol edin</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-1 flex-shrink-0" />
                <span>Müşteri bilgilerini eksiksiz doldurun</span>
              </li>
            </ul>
            <ul className="space-y-2 text-indigo-100">
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-1 flex-shrink-0" />
                <span>Durum değişikliklerinde açıklama notu ekleyin</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-1 flex-shrink-0" />
                <span>Sorun yaşarsanız hemen yöneticiye bildirin</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-1 flex-shrink-0" />
                <span>Düzenli olarak raporları kontrol edin</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-1 flex-shrink-0" />
                <span>Tarih çakışmalarını önceden kontrol edin</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Support Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-indigo-600" />
            Destek ve İletişim
          </h2>
          <p className="text-gray-600 mb-4">
            Sistem kullanımıyla ilgili sorun yaşarsanız veya ek bilgiye ihtiyaç duyarsanız:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Mail className="w-5 h-5 text-indigo-600" />
              <div>
                <div className="text-sm text-gray-500">Email Desteği</div>
                <div className="font-medium text-gray-800">destek@baygunes.com</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Phone className="w-5 h-5 text-indigo-600" />
              <div>
                <div className="text-sm text-gray-500">Telefon Desteği</div>
                <div className="font-medium text-gray-800">+90 555 123 4567</div>
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <p className="text-sm text-indigo-800">
              <strong>Çalışma Saatleri:</strong> Hafta içi 09:00 - 18:00 | 
              Acil durumlar için 7/24 destek hattı mevcuttur.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-10 text-gray-500 text-sm">
          <p>Baygunes Pole Banner Management System (PBMS) v1.0</p>
          <p className="mt-1">Son Güncelleme: 18 Şubat 2026</p>
        </div>
      </div>
    </div>
  );
}
