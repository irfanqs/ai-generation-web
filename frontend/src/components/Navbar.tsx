'use client'

import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { useLanguage } from '@/contexts/LanguageContext'
import LanguageSwitcher from './LanguageSwitcher'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const { t } = useLanguage()

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="text-2xl font-bold text-indigo-600">
            AI Platform
          </Link>
          
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            
            {user ? (
              <>
                {user.isAdmin ? (
                  <>
                    <Link href="/admin/dashboard" className="text-gray-700 hover:text-indigo-600">
                      Admin Dashboard
                    </Link>
                    <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full font-semibold">
                      Admin
                    </span>
                    <button
                      onClick={logout}
                      className="px-4 py-2 text-sm text-gray-700 hover:text-indigo-600"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/dashboard" className="text-gray-700 hover:text-indigo-600">
                      Dashboard
                    </Link>
                    <span className="text-sm text-gray-600">
                      Credits: {user.credits}
                    </span>
                    <button
                      onClick={logout}
                      className="px-4 py-2 text-sm text-gray-700 hover:text-indigo-600"
                    >
                      Logout
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-700 hover:text-indigo-600">
                  {t('login')}
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {t('getStarted')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
