'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export default function Hero() {
  const router = useRouter();
  const { user } = useAuthStore();

  const handleGetStarted = () => {
    if (user) {
      // Redirect admin to admin dashboard, regular users to user dashboard
      if (user.isAdmin) {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } else {
      router.push('/register');
    }
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Sparkles className="w-16 h-16 text-indigo-600" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Create Amazing Content
            <span className="block text-indigo-600">with AI Power</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Generate stunning images, videos, and audio with cutting-edge AI technology.
            Transform your ideas into reality in seconds.
          </p>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleGetStarted}
              className="px-8 py-4 bg-indigo-600 text-white rounded-lg text-lg font-semibold hover:bg-indigo-700 transition"
            >
              {user ? 'Go to Dashboard' : 'Get Started Free'}
            </button>
            <Link
              href="#features"
              className="px-8 py-4 bg-white text-indigo-600 rounded-lg text-lg font-semibold border-2 border-indigo-600 hover:bg-indigo-50 transition"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
