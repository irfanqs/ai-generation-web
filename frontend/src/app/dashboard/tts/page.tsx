'use client';

import { useState, useRef } from 'react';
import { Mic, Play, Pause, Download, Loader2, Volume2 } from 'lucide-react';
import axios from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const VOICES = [
  { id: 'Kore', name: 'Kore', gender: 'female', style: 'Cheerful', description: 'Wanita - Ceria' },
  { id: 'Aoede', name: 'Aoede', gender: 'female', style: 'Calm', description: 'Wanita - Tenang' },
  { id: 'Puck', name: 'Puck', gender: 'male', style: 'Energetic', description: 'Pria - Energik' },
  { id: 'Charon', name: 'Charon', gender: 'male', style: 'Deep', description: 'Pria - Dalam/Berat' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'male', style: 'Powerful', description: 'Pria - Kuat/Tegas' },
];

const GENDERS = ['Semua', 'Laki-laki', 'Perempuan'];

const CHARACTERS = [
  'Semua',
  'Narrator',
  'Pendidik/Pengajar',
  'Meyakinkan/Profesional',
  'Pelaku/Ceria',
  'Motivator',
  'Ekspresif secara Emosional'
];

const VOICE_FILTERS = [
  'Kore - Wanita (Ceria, Cheerful)',
  'Aoede - Wanita (Tenang, Calm)',
  'Puck - Pria (Energik, Energetic)',
  'Charon - Pria (Dalam, Deep)',
  'Fenrir - Pria (Kuat, Powerful)',
];

export default function TTSPage() {
  const { user, updateCredits } = useAuthStore();
  const [text, setText] = useState('');
  const [selectedGender, setSelectedGender] = useState('Semua');
  const [selectedCharacter, setSelectedCharacter] = useState('Semua');
  const [selectedVoiceFilter, setSelectedVoiceFilter] = useState(VOICE_FILTERS[0]);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const maxChars = 5000;
  const charCount = text.length;

  // Filter voices based on selected gender
  const filteredVoices = VOICES.filter(voice => {
    if (selectedGender === 'Semua') return true;
    if (selectedGender === 'Laki-laki') return voice.gender === 'male';
    if (selectedGender === 'Perempuan') return voice.gender === 'female';
    return true;
  });

  // Update voice filter options based on filtered voices
  const filteredVoiceFilters = filteredVoices.map(voice => 
    `${voice.name} - ${voice.gender === 'male' ? 'Pria' : 'Wanita'} (${voice.description.split(' - ')[1]})`
  );

  // Auto-select first voice when gender changes
  const handleGenderChange = (gender: string) => {
    setSelectedGender(gender);
    const newFilteredVoices = VOICES.filter(voice => {
      if (gender === 'Semua') return true;
      if (gender === 'Laki-laki') return voice.gender === 'male';
      if (gender === 'Perempuan') return voice.gender === 'female';
      return true;
    });
    if (newFilteredVoices.length > 0) {
      const firstVoice = newFilteredVoices[0];
      setSelectedVoice(firstVoice.id);
      const newFilter = `${firstVoice.name} - ${firstVoice.gender === 'male' ? 'Pria' : 'Wanita'} (${firstVoice.description.split(' - ')[1]})`;
      setSelectedVoiceFilter(newFilter);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error('Masukkan teks terlebih dahulu');
      return;
    }

    if (charCount > maxChars) {
      toast.error(`Teks terlalu panjang! Maksimal ${maxChars} karakter`);
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setAudioUrl(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Generate TTS
      const response = await axios.post('/generation/text-to-speech', {
        prompt: text,
        voice: selectedVoice,
      });

      const generationId = response.data.id;

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 30;

      const pollInterval = setInterval(async () => {
        attempts++;
        
        try {
          const statusRes = await axios.get(`/generation/${generationId}`);
          const generation = statusRes.data;

          if (generation.status === 'completed') {
            clearInterval(pollInterval);
            clearInterval(progressInterval);
            setProgress(100);
            
            // Set audio URL
            setAudioUrl(generation.outputUrl);
            toast.success('Audio berhasil dibuat!');
            
            // Refresh user credits from server
            try {
              const userRes = await axios.get('/auth/me');
              updateCredits(userRes.data.credits);
            } catch (e) {
              console.error('Failed to refresh credits:', e);
            }
            
            setIsGenerating(false);
          } else if (generation.status === 'failed') {
            clearInterval(pollInterval);
            clearInterval(progressInterval);
            toast.error('Gagal membuat audio');
            setIsGenerating(false);
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            clearInterval(progressInterval);
            toast.error('Timeout: Proses terlalu lama');
            setIsGenerating(false);
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 2000);

    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.response?.data?.message || 'Gagal membuat audio');
      setIsGenerating(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `tts-${Date.now()}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Audio berhasil didownload!');
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#4f46e5' }}>
            <Mic className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Generator Teks-ke-Suara (Gemini TTS)
          </h1>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">
          Tips Kontrol Suara (Nada, Intonasi, Tempo):
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Berbicaralah dengan ekspresi alami dan jelas Anda inginkan karena, penekanan kata dan karakteristik lainnya dari setiap suara.</li>
          <li>• Gunakan koma (,) untuk jeda singkat dan tanda seru (!) untuk penekanan.</li>
        </ul>
      </div>

      {/* Main Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        {/* Gender Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Gender:
          </label>
          <div className="flex flex-wrap gap-2">
            {GENDERS.map((gender) => (
              <button
                key={gender}
                onClick={() => handleGenderChange(gender)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${selectedGender === gender
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
                style={selectedGender === gender ? { backgroundColor: '#4f46e5' } : {}}
              >
                {gender}
              </button>
            ))}
          </div>
        </div>

        {/* Character Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Karakter berdasarkan Gaya dan Kepribadian:
          </label>
          <div className="flex flex-wrap gap-2">
            {CHARACTERS.map((character) => (
              <button
                key={character}
                onClick={() => setSelectedCharacter(character)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${selectedCharacter === character
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
                style={selectedCharacter === character ? { backgroundColor: '#4f46e5' } : {}}
              >
                {character}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Filter Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Pilihan Suara yang Tersedia (Hasil Filter):
          </label>
          <select
            value={selectedVoiceFilter}
            onChange={(e) => {
              const filterValue = e.target.value;
              setSelectedVoiceFilter(filterValue);
              // Extract voice name from filter string (e.g., "Kore - Wanita (Ceria)" -> "Kore")
              const voiceName = filterValue.split(' - ')[0];
              setSelectedVoice(voiceName);
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-transparent"
            style={{ outline: 'none' }}
            onFocus={(e) => {
              e.target.style.boxShadow = '0 0 0 2px #4f46e5';
            }}
            onBlur={(e) => {
              e.target.style.boxShadow = 'none';
            }}
          >
            {filteredVoiceFilters.map((filter) => (
              <option key={filter} value={filter}>
                {filter}
              </option>
            ))}
          </select>
        </div>

        {/* Text Input */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Teks untuk diubah menjadi Suara:
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Selamat datang! Mari kita dengarkan suara Kore yang tegas, ingat, gunakan koma untuk jeda, dan tanda seru untuk penekanan!"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-transparent resize-none"
            style={{ outline: 'none' }}
            onFocus={(e) => {
              e.target.style.boxShadow = '0 0 0 2px #4f46e5';
            }}
            onBlur={(e) => {
              e.target.style.boxShadow = 'none';
            }}
            rows={6}
            maxLength={maxChars}
          />
          <div className="flex justify-end mt-2">
            <span className={`text-sm ${charCount > maxChars * 0.9 ? 'text-red-600' : 'text-gray-500'}`}>
              {charCount}/{maxChars} karakter
            </span>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !text.trim()}
          className="w-full disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          style={{ backgroundColor: isGenerating || !text.trim() ? undefined : '#4f46e5' }}
          onMouseEnter={(e) => {
            if (!isGenerating && text.trim()) {
              e.currentTarget.style.backgroundColor = '#4338ca';
            }
          }}
          onMouseLeave={(e) => {
            if (!isGenerating && text.trim()) {
              e.currentTarget.style.backgroundColor = '#4f46e5';
            }
          }}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Membuat Audio... {progress}%
            </>
          ) : (
            <>
              <Volume2 className="w-5 h-5" />
              Buat Voice Over
            </>
          )}
        </button>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, backgroundColor: '#4f46e5' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Audio Player */}
      {audioUrl && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Volume2 className="w-5 h-5" style={{ color: '#4f46e5' }} />
            Hasil Audio
          </h3>
          
          <div className="rounded-lg p-6" style={{ background: 'linear-gradient(to right, #eef2ff, #fce7f3)' }}>
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlayPause}
                className="w-14 h-14 rounded-full flex items-center justify-center text-white transition-colors"
                style={{ backgroundColor: '#4f46e5' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4338ca';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#4f46e5';
                }}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-1" />
                )}
              </button>
              
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1">
                  Audio TTS - {selectedVoice}
                </div>
                <div className="text-xs text-gray-500">
                  {charCount} karakter • {selectedVoiceFilter}
                </div>
              </div>
              
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credits Info */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Credits tersisa: <span className="font-semibold" style={{ color: '#4f46e5' }}>{user?.credits || 0}</span>
      </div>
    </div>
  );
}
