import { Link } from 'react-router-dom'
import { MapPin, BarChart3, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react'

function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">BAYGUNES V1</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="#features" className="text-gray-600 hover:text-gray-900 font-medium hidden sm:block">Özellikler</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900 font-medium hidden sm:block">İletişim</a>
              <Link to="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Giriş Yap
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-50 pt-16 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
              Şehrin Işıklarında <br />
              <span className="text-blue-600">Markanız Parlasın</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed">
              Baygüneş Reklamcılık olarak, şehrin en işlek noktalarındaki aydınlatma direklerinde markanızı milyonlarla buluşturuyoruz.
              Akıllı yönetim panelimizle operasyonlarınızı kolayca takip edin.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/login" className="inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg">
                Sisteme Giriş Yap <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <a href="#contact" className="inline-flex items-center justify-center px-8 py-3 bg-white text-gray-700 font-bold rounded-lg border border-gray-200 hover:bg-gray-50 transition-all shadow-sm">
                Bize Ulaşın
              </a>
            </div>
          </div>
        </div>
        
        {/* Abstract Background Element */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-full z-0 opacity-50 pointer-events-none">
           <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
           <div className="absolute top-20 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
           <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Neden Baygüneş Paneli?</h2>
                <p className="text-lg text-gray-600">Operasyonel süreçlerinizi dijitalleştirerek verimliliğinizi artırın.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
                {/* Feature 1 */}
                <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-gray-100">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 text-blue-600">
                        <MapPin className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Harita Bazlı Planlama</h3>
                    <p className="text-gray-600">
                        Tüm direkleri interaktif harita üzerinde görüntüleyin. 
                        Müsaitlik durumlarını anlık kontrol edin ve stratejik planlama yapın.
                    </p>
                </div>

                {/* Feature 2 */}
                <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-gray-100">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Tam Operasyonel Kontrol</h3>
                    <p className="text-gray-600">
                        Reklamdan montaja, baskıdan söküme kadar tüm süreçleri tek bir yerden yönetin.
                        Saha ekiplerine mobil erişim sağlayın.
                    </p>
                </div>

                {/* Feature 3 */}
                <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-gray-100">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6 text-purple-600">
                        <BarChart3 className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Anlık Raporlama</h3>
                    <p className="text-gray-600">
                        Detaylı raporlar ve hak ediş tabloları ile finansal süreçlerinizi şeffaflaştırın.
                        PDF çıktıları ile işinizi kolaylaştırın.
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-blue-900 py-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                 <div className="text-4xl font-bold mb-2">500+</div>
                 <div className="text-blue-200">Reklam Direği</div>
              </div>
              <div>
                 <div className="text-4xl font-bold mb-2">50+</div>
                 <div className="text-blue-200">Mutlu Müşteri</div>
              </div>
              <div>
                 <div className="text-4xl font-bold mb-2">12</div>
                 <div className="text-blue-200">İlçe Kapsamı</div>
              </div>
              <div>
                 <div className="text-4xl font-bold mb-2">24/7</div>
                 <div className="text-blue-200">Teknik Destek</div>
              </div>
           </div>
        </div>
      </div>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                    <h3 className="text-2xl font-bold text-white mb-4">Baygüneş Reklamcılık</h3>
                    <p className="mb-6 max-w-md">
                        Modern şehir reklamcılığında öncü çözüm ortağınız. 
                        Markanızı en görünür noktalara taşıyoruz.
                    </p>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            <span>info@baygunes.com</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            <span>+90 (555) 123 45 67</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm">
                        &copy; 2026 Baygüneş Reklamcılık. Tüm hakları saklıdır.
                    </p>
                    <p className="text-xs mt-2 text-gray-600">
                        V1.0.0
                    </p>
                </div>
            </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
