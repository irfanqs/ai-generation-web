'use client';

import { useState, useRef } from 'react';
import { Video, Upload, X, Play, Pause, Download, Loader2, Film } from 'lucide-react';
import axios from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import Image from 'next/image';

const ASPECT_RATIOS = [
  { value: '16:9', label: 'Landscape (16:9)' },
  { value: '9:16', label: 'Portrait (9:16)' },
  { value: '1:1', label: 'Square (1:1)' },
  { value: '4:3', label: 'Standard (4:3)' },
];

const VIDEO_STYLES = [
  'Cinematic',
  'Realistic',
  'Animated',
  'Documentary',
  'Artistic',
  'Dramatic',
  'Slow Motion',
  'Time Lapse',
];

const DURATIONS = [
  { value: '5', label: '5 seconds' },
  { value: '10', label: '10 seconds' },
  { value: '15', label: '15 seconds' },
];

export default function TextToVideoPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedRatio, setSelectedRatio] = useState('16:9');
  const [selectedStyle, setSelectedStyle] = useState('Cinematic');
  const [selectedDuration, setSelectedDuration] = useState('10');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxChars = 1000;
  const charCount = prompt.length;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 10MB');
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (activeTab === 'text' && !prompt.trim()) {
      toast.error('Masukkan deskripsi video terlebih dahulu');
      return;
    }

    if (activeTab === 'image' && !imageFile) {
      toast.error('Upload gambar terlebih dahulu');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setVideoUrl(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 3000);

      let response;
      
      if (activeTab === 'text') {
        // Text to Video
        response = await axios.post('/generation/image-to-video', {
          prompt: `${prompt}. Style: ${selectedStyle}. Duration: ${selectedDuration}s. Aspect ratio: ${selectedRatio}`,
        });
      } else {
        // Image to Video
        const formData = new FormData();
        formData.append('file', imageFile!);
        formData.append('prompt', prompt || 'Animate this image with smooth motion');
        
        response = await axios.post('/generation/image-to-video', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      const generationId = response.data.id;

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 120; // 4 minutes max

      const pollInterval = setInterval(async () => {
        attempts++;
        
        try {
          const statusRes = await axios.get(`/generation/${generationId}`);
          const generation = statusRes.data;

          if (generation.status === 'completed') {
            clearInterval(pollInterval);
            clearInterval(progressInterval);
            setProgress(100);
            
            setVideoUrl(generation.outputUrl);
            toast.success('Video berhasil dibuat!');
            setIsGenerating(false);
          } else if (generation.status === 'failed') {
            clearInterval(pollInterval);
            clearInterval(progressInterval);
            toast.error('Gagal membuat video');
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
      toast.error(error.response?.data?.message || 'Gagal membuat video');
      setIsGenerating(false);
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `video-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Video berhasil didownload!');
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#4f46e5' }}>
            <Video className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Video Scene Creator (Gemini Veo)
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'text'
                ? 'text-white border-b-2'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            style={activeTab === 'text' ? { 
              backgroundColor: '#4f46e5', 
              borderBottomColor: '#4338ca',
              borderTopLeftRadius: '0.75rem'
            } : {}}
          >
            Text to Video
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'image'
                ? 'text-white border-b-2'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            style={activeTab === 'image' ? { 
              backgroundColor: '#4f46e5', 
              borderBottomColor: '#4338ca',
              borderTopRightRadius: '0.75rem'
            } : {}}
          >
            Image to Video
          </button>
        </div>

        <div className="p-6">
          {/* Image Upload (for Image to Video) */}
          {activeTab === 'image' && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Upload Gambar:
              </label>
              
              {!imagePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-gray-400 transition-colors"
                >
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Klik untuk upload gambar</p>
                  <p className="text-sm text-gray-500">PNG, JPG hingga 10MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Prompt Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {activeTab === 'text' ? 'Deskripsi Video:' : 'Deskripsi Animasi (Opsional):'}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                activeTab === 'text'
                  ? 'Contoh: A serene sunset over a calm ocean, with gentle waves and seagulls flying in the distance'
                  : 'Contoh: Add smooth camera movement, zoom in slowly'
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-transparent resize-none"
              style={{ outline: 'none' }}
              onFocus={(e) => {
                e.target.style.boxShadow = '0 0 0 2px #4f46e5';
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = 'none';
              }}
              rows={4}
              maxLength={maxChars}
            />
            <div className="flex justify-end mt-2">
              <span className={`text-sm ${charCount > maxChars * 0.9 ? 'text-red-600' : 'text-gray-500'}`}>
                {charCount}/{maxChars} karakter
              </span>
            </div>
          </div>

          {/* Style Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Style Video:
            </label>
            <div className="flex flex-wrap gap-2">
              {VIDEO_STYLES.map((style) => (
                <button
                  key={style}
                  onClick={() => setSelectedStyle(style)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedStyle === style
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={selectedStyle === style ? { backgroundColor: '#4f46e5' } : {}}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio & Duration */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Aspect Ratio:
              </label>
              <select
                value={selectedRatio}
                onChange={(e) => setSelectedRatio(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-transparent"
                style={{ outline: 'none' }}
                onFocus={(e) => {
                  e.target.style.boxShadow = '0 0 0 2px #4f46e5';
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none';
                }}
              >
                {ASPECT_RATIOS.map((ratio) => (
                  <option key={ratio.value} value={ratio.value}>
                    {ratio.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Durasi:
              </label>
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-transparent"
                style={{ outline: 'none' }}
                onFocus={(e) => {
                  e.target.style.boxShadow = '0 0 0 2px #4f46e5';
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none';
                }}
              >
                {DURATIONS.map((duration) => (
                  <option key={duration.value} value={duration.value}>
                    {duration.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || (activeTab === 'text' && !prompt.trim()) || (activeTab === 'image' && !imageFile)}
            className="w-full disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            style={{ backgroundColor: isGenerating || (activeTab === 'text' && !prompt.trim()) || (activeTab === 'image' && !imageFile) ? undefined : '#4f46e5' }}
            onMouseEnter={(e) => {
              if (!isGenerating && ((activeTab === 'text' && prompt.trim()) || (activeTab === 'image' && imageFile))) {
                e.currentTarget.style.backgroundColor = '#4338ca';
              }
            }}
            onMouseLeave={(e) => {
              if (!isGenerating && ((activeTab === 'text' && prompt.trim()) || (activeTab === 'image' && imageFile))) {
                e.currentTarget.style.backgroundColor = '#4f46e5';
              }
            }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Membuat Video... {progress}%
              </>
            ) : (
              <>
                <Film className="w-5 h-5" />
                Generate Video
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
              <p className="text-sm text-gray-600 text-center mt-2">
                Proses ini memakan waktu 1-2 menit, mohon bersabar...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Video Player */}
      {videoUrl && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Film className="w-5 h-5" style={{ color: '#4f46e5' }} />
            Hasil Video
          </h3>
          
          <div className="rounded-lg p-6" style={{ background: 'linear-gradient(to right, #eef2ff, #fce7f3)' }}>
            <div className="bg-black rounded-lg overflow-hidden mb-4">
              <video
                ref={videoRef}
                src={videoUrl}
                onEnded={() => setIsPlaying(false)}
                className="w-full"
                controls
              />
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlayPause}
                className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors"
                style={{ backgroundColor: '#4f46e5' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4338ca';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#4f46e5';
                }}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-1" />
                )}
              </button>
              
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1">
                  Video {activeTab === 'text' ? 'Text-to-Video' : 'Image-to-Video'}
                </div>
                <div className="text-xs text-gray-500">
                  {selectedRatio} • {selectedStyle} • {selectedDuration}s
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
      {/* <div className="mt-6 text-center text-sm text-gray-500">
        Credits tersisa: <span className="font-semibold" style={{ color: '#4f46e5' }}>{user?.credits || 0}</span>
      </div> */}
    </div>
  );
}
