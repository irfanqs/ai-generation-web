'use client';

import { useState, useRef } from 'react';
import { User, Upload, X, Download, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import axios from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const POSES = [
  { value: 'front', label: 'Menghadap Ke Depan' },
  { value: 'left', label: 'Menghadap Ke Kiri' },
  { value: 'right', label: 'Menghadap Ke Kanan' },
  { value: 'back_left', label: 'Serong Kiri' },
  { value: 'back_right', label: 'Serong Kanan' },
];

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1' },
  { value: '3:4', label: '3:4' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
];

const CHARACTER_STYLES = [
  'Realistic',
  'Anime',
  'Cartoon',
  '3D Render',
  'Fantasy Art',
  'Comic Book',
  'Watercolor',
  'Oil Painting',
];

interface GeneratedCharacter {
  pose: string;
  url: string;
}

export default function CharacterPage() {
  const { user } = useAuthStore();
  const [prompt, setPrompt] = useState('');
  const [selectedPoses, setSelectedPoses] = useState<string[]>(['front']);
  const [selectedRatio, setSelectedRatio] = useState('1:1');
  const [selectedStyle, setSelectedStyle] = useState('Realistic');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedCharacters, setGeneratedCharacters] = useState<GeneratedCharacter[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxChars = 500;
  const charCount = prompt.length;

  const handleReferenceSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 10MB');
        return;
      }
      
      setReferenceImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferencePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeReference = () => {
    setReferenceImage(null);
    setReferencePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const togglePose = (pose: string) => {
    if (selectedPoses.includes(pose)) {
      if (selectedPoses.length > 1) {
        setSelectedPoses(selectedPoses.filter(p => p !== pose));
      } else {
        toast.error('Minimal pilih 1 pose');
      }
    } else {
      setSelectedPoses([...selectedPoses, pose]);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Masukkan deskripsi karakter terlebih dahulu');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setGeneratedCharacters([]);

    try {
      const results: GeneratedCharacter[] = [];
      const totalPoses = selectedPoses.length;

      for (let i = 0; i < totalPoses; i++) {
        const pose = selectedPoses[i];
        const poseLabel = POSES.find(p => p.value === pose)?.label || pose;
        setProgress(Math.round(((i + 1) / totalPoses) * 100));

        // Create detailed prompt for character
        let fullPrompt = `Character design: ${prompt}. `;
        fullPrompt += `Style: ${selectedStyle}. `;
        fullPrompt += `Pose: ${poseLabel}. `;
        fullPrompt += `Aspect ratio: ${selectedRatio}. `;
        fullPrompt += `High quality, detailed, professional character design, consistent appearance.`;

        let response;

        if (referenceImage) {
          // Use reference image for consistency
          const formData = new FormData();
          formData.append('file', referenceImage);
          formData.append('prompt', fullPrompt);
          
          response = await axios.post('/generation/image-to-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } else {
          // Text to image
          response = await axios.post('/generation/text-to-image', {
            prompt: fullPrompt,
          });
        }

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
                pose: poseLabel,
                url: generation.outputUrl,
              });
              completed = true;
            } else if (generation.status === 'failed') {
              toast.error(`Gagal generate pose: ${poseLabel}`);
              completed = true;
            }
          } catch (error) {
            console.error('Polling error:', error);
          }
        }

        if (!completed) {
          toast.error(`Timeout untuk pose: ${poseLabel}`);
        }
      }

      setGeneratedCharacters(results);
      toast.success(`Berhasil generate ${results.length} pose karakter!`);
      setIsGenerating(false);

    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.response?.data?.message || 'Gagal membuat karakter');
      setIsGenerating(false);
    }
  };

  const downloadImage = (url: string, pose: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `character-${pose.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Gambar berhasil didownload!');
  };

  const downloadAll = () => {
    generatedCharacters.forEach((char, index) => {
      setTimeout(() => {
        downloadImage(char.url, char.pose);
      }, index * 500);
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#4f46e5' }}>
            <User className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Create Karakter (Character Design)
          </h1>
        </div>
        <p className="text-gray-600">
          Buat karakter konsisten dengan berbagai pose dan angle
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Input */}
        <div className="lg:col-span-1 space-y-6">
          {/* Character Description */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5" style={{ color: '#4f46e5' }} />
                Deskripsi Karakter
              </h3>
              <button
                onClick={() => setPrompt('A warrior woman with silver hair, detailed armor, scar on cheek, intense look, fantasy style')}
                className="text-xs px-2 py-1 rounded text-white"
                style={{ backgroundColor: '#4f46e5' }}
              >
                + Ide
              </button>
            </div>
            
            <label className="block text-sm text-gray-600 mb-2">
              Prompt (Inggris disarankan):
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Contoh: A warrior woman with silver hair, detailed armor, scar on cheek, intense look..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-transparent resize-none text-sm"
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
              <span className={`text-xs ${charCount > maxChars * 0.9 ? 'text-red-600' : 'text-gray-500'}`}>
                {charCount}/{maxChars}
              </span>
            </div>
          </div>

          {/* Reference Image */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Posisi Model</h3>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">OPSIONAL</span>
            </div>
            
            {!referencePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-1">Upload Referensi</p>
                <p className="text-xs text-gray-500">Untuk konsistensi pose</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleReferenceSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative">
                <img
                  src={referencePreview}
                  alt="Reference"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  onClick={removeReference}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Style Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Style</h3>
            <div className="grid grid-cols-2 gap-2">
              {CHARACTER_STYLES.map((style) => (
                <button
                  key={style}
                  onClick={() => setSelectedStyle(style)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
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

          {/* Aspect Ratio */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Rasio (Simulasi)</h3>
            <div className="grid grid-cols-4 gap-2">
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

        {/* Right Panel - Poses & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pose Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Pilih Pose</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {POSES.map((pose) => (
                <button
                  key={pose.value}
                  onClick={() => togglePose(pose.value)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    selectedPoses.includes(pose.value)
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={selectedPoses.includes(pose.value) ? { backgroundColor: '#4f46e5' } : {}}
                >
                  {pose.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            style={{ backgroundColor: isGenerating || !prompt.trim() ? undefined : '#4f46e5' }}
            onMouseEnter={(e) => {
              if (!isGenerating && prompt.trim()) {
                e.currentTarget.style.backgroundColor = '#4338ca';
              }
            }}
            onMouseLeave={(e) => {
              if (!isGenerating && prompt.trim()) {
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
                Generate Karakter
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
                Sedang generate pose {Math.ceil((progress / 100) * selectedPoses.length)} dari {selectedPoses.length}...
              </p>
            </div>
          )}

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2">
              <div className="text-blue-600 mt-0.5">💡</div>
              <div className="text-sm text-blue-900 space-y-1">
                <p><strong>Tips Posisi:</strong> Pilihan posisi akan digabungkan otomatis dengan deskripsi Anda.</p>
                <p><strong>Tips Prompt Realistis:</strong> Gunakan kata kunci spesifik (contoh: "blue eyes", "leather texture").</p>
              </div>
            </div>
          </div>

          {/* Results Gallery */}
          {generatedCharacters.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" style={{ color: '#4f46e5' }} />
                  Belum ada gambar ({generatedCharacters.length})
                </h3>
                <button
                  onClick={downloadAll}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Semua
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {generatedCharacters.map((char, index) => (
                  <div key={index} className="group relative">
                    <img
                      src={char.url}
                      alt={char.pose}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                      <button
                        onClick={() => downloadImage(char.url, char.pose)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-3"
                      >
                        <Download className="w-5 h-5" style={{ color: '#4f46e5' }} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mt-2 text-center font-medium">
                      {char.pose}
                    </p>
                  </div>
                ))}
              </div>

              <button
                className="w-full mt-4 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              >
                Preview
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isGenerating && generatedCharacters.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Belum ada gambar
              </h3>
              <p className="text-gray-600 text-sm">
                Tulis deskripsi karakter dan pilih posisi model di panel sebelah kiri.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Credits Info */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Credits tersisa: <span className="font-semibold" style={{ color: '#4f46e5' }}>{user?.credits || 0}</span>
        <span className="mx-2">•</span>
        <span>Setiap pose = 1 credit</span>
      </div>
    </div>
  );
}
