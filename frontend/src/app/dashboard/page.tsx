'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { Image, Wand2, Video, Mic, Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [activeTab, setActiveTab] = useState('text-to-image')
  const [prompt, setPrompt] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [generations, setGenerations] = useState<any[]>([])

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    loadGenerations()
  }, [token])

  const loadGenerations = async () => {
    try {
      const { data } = await api.get('/generation/history')
      setGenerations(data)
    } catch (error) {
      console.error('Failed to load generations')
    }
  }

  const handleGenerate = async () => {
    if (!prompt && !file) {
      toast.error('Please provide input')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      if (prompt) formData.append('prompt', prompt)
      if (file) formData.append('image', file)
      if (activeTab === 'text-to-speech') formData.append('text', prompt)

      const endpoint = `/generation/${activeTab}`
      const { data } = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      toast.success('Generation started! Check back in a moment.')
      setPrompt('')
      setFile(null)
      setTimeout(loadGenerations, 2000)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'text-to-image', label: 'Text to Image', icon: Image },
    { id: 'image-to-image', label: 'Image to Image', icon: Wand2 },
    { id: 'image-to-video', label: 'Image to Video', icon: Video },
    { id: 'text-to-speech', label: 'Text to Speech', icon: Mic },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Credits: {user?.credits}</span>
            <button onClick={() => router.push('/')} className="text-gray-700">
              Home
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Create New</h2>

            <div className="flex gap-2 mb-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {(activeTab === 'text-to-image' || activeTab === 'text-to-speech') && (
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    activeTab === 'text-to-speech'
                      ? 'Enter text to convert to speech...'
                      : 'Describe the image you want to generate...'
                  }
                  className="w-full h-32 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-600 text-gray-900 bg-white"
                />
              )}

              {(activeTab === 'image-to-image' || activeTab === 'image-to-video') && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-3 border rounded-lg text-gray-900 bg-white"
                  />
                  {activeTab === 'image-to-image' && (
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe how to modify the image..."
                      className="w-full h-24 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-600 text-gray-900 bg-white"
                    />
                  )}
                </>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate'
                )}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Recent Generations</h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {generations.map((gen) => (
                <div key={gen.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {gen.type}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        gen.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : gen.status === 'processing'
                          ? 'bg-yellow-100 text-yellow-700'
                          : gen.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {gen.status}
                    </span>
                  </div>
                  {gen.prompt && (
                    <p className="text-sm text-gray-600 mb-2">{gen.prompt}</p>
                  )}
                  {gen.status === 'completed' && gen.outputUrl && (
                    <a
                      href={gen.outputUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      View Result
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
