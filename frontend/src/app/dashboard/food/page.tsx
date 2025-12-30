'use client';

import { useState, useRef } from 'react';
import { Utensils, Upload, X, Download, Loader2, Sparkles, Image as ImageIcon, Zap } from 'lucide-react';
import axios from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const ASPECT_RATIOS = [
  { value: 'original', label: 'Asli' },
  { value: '1:1', label: '1:1 (Square)' },
  { value: '4:5', label: '4:5 (Portrait)' },
  { value: '16:9', label: '16:9 (Landscape)' },
  { value: '9:16', label: '9:16 (Story)' },
];

const FOOD_STYLES = [
  'Poster',
  'Cinematic',
  'Resto',
  'Iklan',
  'Model',
];

const PRESET_PROMPTS = [
  'Mie Goreng Pedas dengan saus merah, garnish daun bawang, background gelap dengan smoke effect',
  'Burger premium dengan cheese melting, lettuce segar, background minimalis modern',
  'Coffee latte art dengan foam sempurna, lighting natural, wooden table aesthetic',
  'Nasi goreng dengan telur mata sapi, kerupuk, background restaurant mewah',
  'Pizza slice dengan cheese pull, topping pepperoni, dramatic lighting',
];

interface GeneratedImage {
  style: string;
  url: string;
}

export default function FoodPage() {
  const { user } = useAuthStore();
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedRatio, setSelectedRatio] = useState('original');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['Poster']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isUltimatePack, setIsUltimatePack] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxChars = 500;
  const charCount = prompt.length;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 10MB');
        return;
      }
      
      setOriginalImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setOriginalImage(null);
    setOriginalPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleStyle = (style: string) => {
    if (isUltimatePack) return; // Can't change in ultimate pack mode
    
    if (selectedStyles.includes(style)) {
      if (selectedStyles.length > 1) {
        setSelectedStyles(selectedStyles.filter(s => s !== style));
      } else {
        toast.error('Minimal pilih 1 style');
      }
    } else {
      setSelectedStyles([...selectedStyles, style]);
    }
  };

  const toggleUltimatePack = () => {
    if (!isUltimatePack) {
      // Enable ultimate pack - select all styles
      setSelectedStyles([...FOOD_STYLES]);
      toast.success('Ultimate Pack: Generate 20 foto (5 gaya × 4 variasi)');
    } else {
      // Disable ultimate pack - reset to single style
      setSelectedStyles(['Poster']);
    }
    setIsUltimatePack(!isUltimatePack);
  };

  const handleGenerate = async () => {
    if (!originalImage) {
      toast.error('Upload foto makanan terlebih dahulu');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setGeneratedImages([]);

    try {
      const results: GeneratedImage[] = [];
      const variations = isUltimatePack ? 4 : 1; // 4 variations for ultimate pack
      const totalGenerations = selectedStyles.length * variations;
      let currentGeneration = 0;

      for (const style of selectedStyles) {
        for (let v = 0; v < variations; v++) {
          currentGeneration++;
          setProgress(Math.round((currentGeneration / totalGenerations) * 100));

          // Create detailed prompt
          let fullPrompt = '';
          if (prompt.trim()) {
            fullPrompt = `${prompt}. `;
          }
          fullPrompt += `Professional food photography. Style: ${style}. `;
          fullPrompt += `High quality, appetizing, commercial grade, perfect lighting. `;
          fullPrompt += `Aspect ratio: ${selectedRatio}. `;
          if (isUltimatePack) {
            fullPrompt += `Variation ${v + 1}. `;
          }

          const formData = new FormData();
          formData.append('file', originalImage);
          formData.append('prompt', fullPrompt);

          const response = await axios.post('/generation/image-to-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          const generationId = response.data.id;

          // Poll for completion
          let attempts = 0;
          const maxAttempts = 30;
          let completed = false;

          while (attempts < maxAttempts && !completed) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;

            try {
              const statusRes = await axios.get(`/generation/${generationId}`);
              const generation = statusRes.data;

              if (generation.status === 'completed') {
                results.push({
                  style: isUltimatePack ? `${style} - Var ${v + 1}` : style,
                  url: generation.outputUrl,
                });
                completed = true;
              } else if (generation.status === 'failed') {
                toast.error(`Gagal generate ${style}`);
                completed = true;
              }
            } catch (error) {
              console.error('Polling error:', error);
            }
          }

          if (!completed) {
            toast.error(`Timeout untuk ${style}`);
          }
        }
      }

      setGeneratedImages(results);
      toast.success(`Berhasil generate ${results.length} foto!`);
      setIsGenerating(false);

    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.response?.data?.message || 'Gagal membuat foto');
      setIsGenerating(false);
    }
  };

  const downloadImage = (url: string, style: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `food-${style.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Foto berhasil didownload!');
  };

  const downloadAll = () => {
    generatedImages.forEach((img, index) => {
      setTimeout(() => {
        downloadImage(img.url, img.style);
      }, index * 500);
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#4f46e5' }}>
            <Utensils className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            FoodProduct AI
          </h1>
        </div>
        <p className="text-gray-600">
          Generator Foto Makanan Profesional: Poster, Cinematic, Resto, Iklan & Model
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Input */}
        <div className="lg:col-span-1 space-y-6">
          {/* Upload Original */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">1. Upload Foto Asli</h3>
            
            {!originalPreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-1">Klik untuk upload foto makanan</p>
                <p className="text-xs text-gray-500">PNG, JPG max 10MB</p>
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
                  src={originalPreview}
                  alt="Original"
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

          {/* Description */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">2. Deskripsi atau Konsep Foto</h3>
            
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Contoh: Mie Goreng Pedas dengan saus merah..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-transparent resize-none text-sm"
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
              <span className={`text-xs ${charCount > maxChars * 0.9 ? 'text-red-600' : 'text-gray-500'}`}>
                {charCount}/{maxChars}
              </span>
            </div>

            {/* Preset Prompts */}
            <div className="mt-4">
              <p className="text-xs text-gray-600 mb-2">Contoh cepat:</p>
              <div className="space-y-2">
                {PRESET_PROMPTS.slice(0, 3).map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => setPrompt(preset)}
                    className="w-full text-left px-3 py-2 text-xs bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-gray-700"
                  >
                    {preset.substring(0, 60)}...
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">3. Pilih Rasio Foto</h3>
            <div className="grid grid-cols-2 gap-2">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.value}
                  onClick={() => setSelectedRatio(ratio.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedRatio === ratio.value
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={selectedRatio === ratio.value ? { backgroundColor: '#4f46e5' } : {}}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Styles & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mode Generate */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">4. Mode Generate</h3>
            
            <button
              onClick={toggleUltimatePack}
              className={`w-full px-6 py-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-3 ${
                isUltimatePack ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={isUltimatePack ? { 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              } : {}}
            >
              <Zap className="w-5 h-5" />
              <div className="text-left">
                <div className="font-bold">ULTIMATE PACK</div>
                <div className="text-xs opacity-90">Generate 20 Foto (5 Gaya × 4 Variasi)</div>
              </div>
            </button>

            {!isUltimatePack && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-3">Atau pilih style manual:</p>
                <div className="grid grid-cols-3 gap-2">
                  {FOOD_STYLES.map((style) => (
                    <button
                      key={style}
                      onClick={() => toggleStyle(style)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        selectedStyles.includes(style)
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={selectedStyles.includes(style) ? { backgroundColor: '#4f46e5' } : {}}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !originalImage}
            className="w-full disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            style={{ backgroundColor: isGenerating || !originalImage ? undefined : '#4f46e5' }}
            onMouseEnter={(e) => {
              if (!isGenerating && originalImage) {
                e.currentTarget.style.backgroundColor = '#4338ca';
              }
            }}
            onMouseLeave={(e) => {
              if (!isGenerating && originalImage) {
                e.currentTarget.style.backgroundColor = '#4f46e5';
              }
            }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating... {progress}%
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {isUltimatePack ? 'Generate 20 Foto' : `Generate ${selectedStyles.length} Style`}
              </>
            )}
          </button>

          {/* Progress Bar */}
          {isGenerating && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, backgroundColor: '#4f46e5' }}
                />
              </div>
              <p className="text-sm text-gray-600 text-center">
                Sedang generate foto {Math.ceil((progress / 100) * (isUltimatePack ? 20 : selectedStyles.length))} dari {isUltimatePack ? 20 : selectedStyles.length}...
              </p>
            </div>
          )}

          {/* Results Gallery */}
          {generatedImages.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" style={{ color: '#4f46e5' }} />
                  Hasil Generate ({generatedImages.length})
                </h3>
                <button
                  onClick={downloadAll}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Semua
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {generatedImages.map((img, index) => (
                  <div key={index} className="group relative">
                    <img
                      src={img.url}
                      alt={img.style}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                      <button
                        onClick={() => downloadImage(img.url, img.style)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-3"
                      >
                        <Download className="w-5 h-5" style={{ color: '#4f46e5' }} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mt-2 text-center font-medium">
                      {img.style}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isGenerating && generatedImages.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Siap Membuat Foto
              </h3>
              <p className="text-gray-600 text-sm">
                Tekan "ULTIMATE PACK" untuk 20 variasi lengkap
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Credits Info */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Credits tersisa: <span className="font-semibold" style={{ color: '#4f46e5' }}>{user?.credits || 0}</span>
        <span className="mx-2">•</span>
        <span>{isUltimatePack ? '20 credits untuk Ultimate Pack' : `${selectedStyles.length} credit${selectedStyles.length > 1 ? 's' : ''}`}</span>
      </div>
    </div>
  );
}
