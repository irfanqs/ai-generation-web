'use client';

import { Film } from 'lucide-react';

export default function AffiliatePage() {
  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
          <Film className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Affiliate Content (Monetization Creator)
        </h1>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <Film className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h3>
        <p className="text-gray-600">Fitur ini sedang dalam pengembangan</p>
      </div>
    </div>
  );
}
