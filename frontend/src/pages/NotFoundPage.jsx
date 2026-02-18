import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search, AlertCircle } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="relative inline-block">
            <div className="text-9xl font-bold text-gray-200 select-none">404</div>
            <div className="absolute inset-0 flex items-center justify-center">
              <AlertCircle className="w-24 h-24 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Sayfa Bulunamadı
        </h1>
        <p className="text-gray-600 mb-8 text-lg">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir. 
          Lütfen URL'i kontrol edin veya ana sayfaya dönün.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Geri Dön
          </button>
          
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <Home className="w-5 h-5" />
            Ana Sayfa
          </Link>
        </div>

        {/* Help Links */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">Yardıma mı ihtiyacınız var?</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/how-to-use" className="text-indigo-600 hover:text-indigo-800 font-medium">
              Nasıl Kullanılır
            </Link>
            <span className="text-gray-300">|</span>
            <a href="mailto:destek@baygunes.com" className="text-indigo-600 hover:text-indigo-800 font-medium">
              Destek ile İletişim
            </a>
            <span className="text-gray-300">|</span>
            <Link to="/dashboard" className="text-indigo-600 hover:text-indigo-800 font-medium">
              Dashboard
            </Link>
          </div>
        </div>

        {/* Error Code */}
        <div className="mt-8 text-xs text-gray-400">
          Hata Kodu: 404_NOT_FOUND | {new Date().toLocaleString('tr-TR')}
        </div>
      </div>
    </div>
  );
}
