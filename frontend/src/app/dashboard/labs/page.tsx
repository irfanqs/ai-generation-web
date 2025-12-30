'use client';

import { Image } from 'lucide-react';

export default function TextToImagePage() {
  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
          <Image className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Google Flow
        </h1>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <Image className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Coming Soon
        </h3>
        <p className="text-gray-600">
          Fitur ini sedang dalam pengembangan
        </p>
      </div>
    </div>
  );
}
