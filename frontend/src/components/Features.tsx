'use client'

import { Image, Video, Mic, Wand2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function Features() {
  const { t } = useLanguage();

  const features = [
    {
      icon: Image,
      title: t('featureTextToImage'),
      description: t('featureTextToImageDesc'),
      available: true,
    },
    {
      icon: Wand2,
      title: t('featureImageToImage'),
      description: t('featureImageToImageDesc'),
      available: true,
    },
    {
      icon: Video,
      title: t('featureTextToVideo'),
      description: t('featureTextToVideoDesc'),
      available: true,
    },
    {
      icon: Mic,
      title: t('featureTextToSpeech'),
      description: t('featureTextToSpeechDesc'),
      available: true,
    },
  ];

  return (
    <div id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {t('featuresTitle')}
          </h2>
          <p className="text-xl text-gray-600">
            {t('featuresSubtitle')}
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
