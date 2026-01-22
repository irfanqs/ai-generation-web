'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useLanguage } from '@/contexts/LanguageContext';
import api from '@/lib/api';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    checkApiKeyStatus();
  }, []);

  const checkApiKeyStatus = async () => {
    try {
      const response = await api.get('/auth/api-key');
      setHasApiKey(response.data.hasApiKey);
    } catch (error) {
      console.error('Failed to check API key status');
    } finally {
      setChecking(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: t('pleaseEnterApiKey') });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await api.put('/auth/api-key', { apiKey: apiKey.trim() });
      setMessage({ type: 'success', text: response.data.message });
      setHasApiKey(true);
      setApiKey('');
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to save API key' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveApiKey = async () => {
    if (!confirm(t('confirmRemoveKey'))) return;

    setLoading(true);
    setMessage(null);

    try {
      const response = await api.put('/auth/api-key', { apiKey: '' });
      setMessage({ type: 'success', text: response.data.message });
      setHasApiKey(false);
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to remove API key' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('settings')}</h1>

      {/* API Key Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('geminiApiKey')}</h2>
        <p className="text-sm text-gray-600 mb-4">
          {t('geminiApiKeyDesc')}
        </p>

        {/* Status */}
        <div className="mb-4">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
            hasApiKey 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${
              hasApiKey ? 'bg-green-500' : 'bg-yellow-500'
            }`}></span>
            {hasApiKey ? t('apiKeyConnected') : t('noApiKeySet')}
          </div>
        </div>

        {/* Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {hasApiKey ? t('updateApiKey') : t('enterApiKey')}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Message */}
          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSaveApiKey}
              disabled={loading || !apiKey.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? t('saving') : hasApiKey ? t('updateKey') : t('saveKey')}
            </button>
            
            {hasApiKey && (
              <button
                onClick={handleRemoveApiKey}
                disabled={loading}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
              >
                {t('removeKey')}
              </button>
            )}
          </div>
        </div>

        {/* Help */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-2">{t('howToGetApiKey')}</h3>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>{t('step1')} <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Google AI Studio</a></li>
            <li>{t('step2')}</li>
            <li>{t('step3')}</li>
            <li>{t('step4')}</li>
          </ol>
          <p className="text-xs text-gray-500 mt-3">
            {t('apiKeyNote')}
          </p>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('accountInfo')}</h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">{t('email')}</span>
            <span className="text-gray-900">{user?.email}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">{t('name')}</span>
            <span className="text-gray-900">{user?.name || '-'}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600">{t('credits')}</span>
            <span className="text-gray-900 font-medium">{user?.credits || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
