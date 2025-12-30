'use client'

import { Image, Video, Mic, Wand2 } from 'lucide-react'

const features = [
  {
    icon: Image,
    title: 'Text to Image',
    description: 'Generate stunning images from text descriptions using advanced AI models.',
    available: true,
  },
  {
    icon: Wand2,
    title: 'Image to Image',
    description: 'Transform and edit existing images with AI-powered modifications.',
    available: true,
  },
  {
    icon: Video,
    title: 'Text to Video',
    description: 'Create dynamic videos from text descriptions using Google Veo AI.',
    available: true,
  },
  {
    icon: Mic,
    title: 'Text to Speech',
    description: 'Convert text into natural-sounding speech with AI voices.',
    available: true,
  },
]

export default function Features() {
  return (
    <div id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Powerful AI Features
          </h2>
          <p className="text-xl text-gray-600">
            Everything you need to create amazing content
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl hover:shadow-lg transition ${
                !feature.available ? 'opacity-75' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <feature.icon className="w-12 h-12 text-indigo-600" />
                {!feature.available && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-semibold">
                    Coming Soon
                  </span>
                )}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
