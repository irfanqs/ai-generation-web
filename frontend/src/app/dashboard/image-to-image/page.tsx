'use client';

import { useState, useRef } from 'react';
import { Wand2, Upload, X, Download, Loader2, Image as ImageIcon, Grid3x3 } from 'lucide-react';
import axios from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const ASPECT_RATIOS = [
  { value: '3:4', label: '3:4 (Portrait)' },
  { value: '1:1', label: '1:1 (Square)' },
  { value: '4:3', label: '4:3 (Landscape)' },
  { value: '9:16', label: '9:16 (Story)' },
];

const GENDERS = [
  { value: 'female', label: 'Wanita' },
  { value: 'male', label: 'Pria' },
  { value: 'any', label: 'Bebas' },
];

const POSES = [
  'Front View (Depan)',
  'Back View (Belakang)',
  'Side View Left (Samping Kiri)',
  'Side View Right (Samping Kanan)',
  '3/4 View',
  'Walking Pose',
  'Standing Casual',
  'Sitting Pose',
  'Action Pose',
  'Close-up Portrait',
];

export default function ImageToImagePage() {
  const { user } = useAuthStore();
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [modelPreview, setModelPreview] = useState<string | null>(null);
  const [selectedRatio, setSelectedRatio] = useState('9:16');
  const [selectedGender, setSelectedGender] = useState('female');
  const [selectedPoses, setSelectedPoses] = useState<string[]>(['Front View (Depan)']);
  const [interactionPrompt, setInteractionPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<Array<{ pose: string; url: string }>>([]);
  const productInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  const handleProductSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 10MB');
        return;
      }
      
      setProductImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleModelSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 10MB');
        return;
      }
      
      setModelImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setModelPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProductImage = () => {
    setProductImage(null);
    setProductPreview(null);
    if (productInputRef.current) {
      productInputRef.current.value = '';
    }
  };

  const removeModelImage = () => {
    setModelImage(null);
    setModelPreview(null);
    if (modelInputRef.current) {
      modelInputRef.current.value = '';
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
      if (selectedPoses.length < 10) {
        setSelectedPoses([...selectedPoses, pose]);
      } else {
        toast.error('Maksimal 10 pose');
      }
    }
  };

  const handleGenerate = async () => {
    if (!productImage) {
      toast.error('Upload foto produk terlebih dahulu');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setGeneratedImages([]);

    try {
      const results: Array<{ pose: string; url: string }> = [];
      const totalPoses = selectedPoses.length;

      for (let i = 0; i < totalPoses; i++) {
        const pose = selectedPoses[i];
        setProgress(Math.round(((i + 1) / totalPoses) * 100));

        // Create prompt for each pose
        let prompt = `Professional product photography. ${pose}. `;
        prompt += `Gender: ${selectedGender}. `;
        prompt += `Aspect ratio: ${selectedRatio}. `;
        if (interactionPrompt) {
          prompt += `Interaction: ${interactionPrompt}. `;
        }
        if (modelImage) {
          prompt += `Use the reference model appearance. `;
        }
        prompt += `High quality, professional lighting, clean background.`;

        // Upload product image
        const formData = new FormData();
        formData.append('file', productImage);
        formData.append('prompt', prompt);
        
        if (modelImage) {
          formData.append('modelImage', modelImage);
        }

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
                pose: pose,
                url: generation.outputUrl,
              });
              completed = true;
            } else if (generation.status === 'failed') {
              toast.error(`Gagal generate pose: ${pose}`);
              completed = true;
            }
          } catch (error) {
            console.error('Polling error:', error);
          }
        }

        if (!completed) {
          toast.error(`Timeout untuk pose: ${pose}`);
        }
      }

      setGeneratedImages(results);
      toast.success(`Berhasil generate ${results.length} pose!`);
      setIsGenerating(false);

    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.response?.data?.message || 'Gagal membuat gambar');
      setIsGenerating(false);
    }
  };

  const downloadImage = (url: string, pose: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `product-${pose.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Gambar berhasil didownload!');
  };

  const downloadAll = () => {
    generatedImages.forEach((img, index) => {
      setTimeout(() => {
        downloadImage(img.url, img.pose);
      }, index * 500);
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#4f46e5' }}>
            <Wand2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Product With Model (Virtual Photography)
          </h1>
        </div>
        <p className="text-gray-600">
          Generate foto produk dengan model virtual dalam berbagai pose
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Input */}
        <div className="lg:col-span-1 space-y-6">
          {/* Product Upload */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">1. Upload Produk (Wajib)</h3>
            
            {!productPreview ? (
              <div
                onClick={() => productInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-1">Upload Foto Produk</p>
                <p className="text-xs text-gray-500">PNG, JPG max 10MB</p>
                <input
                  ref={productInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProductSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative">
                <img
                  src={productPreview}
                  alt="Product"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  onClick={removeProductImage}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Model Reference Upload */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">2. Model Referensi</h3>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">OPSIONAL</span>
            </div>
            
            {!modelPreview ? (
              <div
                onClick={() => modelInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-1">Upload Wajah/Model</p>
                <p className="text-xs text-gray-500">Konsistensi wajah & pose</p>
                <input
                  ref={modelInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleModelSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative">
                <img
                  src={modelPreview}
                  alt="Model"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  onClick={removeModelImage}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Aspect Ratio */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">3. Rasio Foto</h3>
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

          {/* Gender */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">4. Gender Model</h3>
            <div className="flex gap-2">
              {GENDERS.map((gender) => (
                <button
                  key={gender.value}
                  onClick={() => setSelectedGender(gender.value)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedGender === gender.value
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={selectedGender === gender.value ? { backgroundColor: '#4f46e5' } : {}}
                >
                  {gender.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interaction Prompt */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">5. Cara Pakai / Interaksi</h3>
            <textarea
              value={interactionPrompt}
              onChange={(e) => setInteractionPrompt(e.target.value)}
              placeholder="Contoh: Model memegang botol di dekat pipi..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-transparent resize-none"
              style={{ outline: 'none' }}
              onFocus={(e) => {
                e.target.style.boxShadow = '0 0 0 2px #4f46e5';
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = 'none';
              }}
              rows={3}
            />
          </div>
        </div>

        {/* Right Panel - Poses & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pose Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Pilih Pose (Max 10)</h3>
              <span className="text-sm text-gray-600">
                {selectedPoses.length}/10 dipilih
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {POSES.map((pose) => (
                <button
                  key={pose}
                  onClick={() => togglePose(pose)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
                    selectedPoses.includes(pose)
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={selectedPoses.includes(pose) ? { backgroundColor: '#4f46e5' } : {}}
                >
                  {pose}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !productImage}
            className="w-full disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            style={{ backgroundColor: isGenerating || !productImage ? undefined : '#4f46e5' }}
            onMouseEnter={(e) => {
              if (!isGenerating && productImage) {
                e.currentTarget.style.backgroundColor = '#4338ca';
              }
            }}
            onMouseLeave={(e) => {
              if (!isGenerating && productImage) {
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
                <Grid3x3 className="w-5 h-5" />
                Generate {selectedPoses.length} Pose
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

          {/* Results Gallery */}
          {generatedImages.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" style={{ color: '#4f46e5' }} />
                  Galeri Hasil ({generatedImages.length})
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
                {generatedImages.map((img, index) => (
                  <div key={index} className="group relative">
                    <img
                      src={img.url}
                      alt={img.pose}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                      <button
                        onClick={() => downloadImage(img.url, img.pose)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-3"
                      >
                        <Download className="w-5 h-5" style={{ color: '#4f46e5' }} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mt-2 text-center font-medium">
                      {img.pose}
                    </p>
                  </div>
                ))}
              </div>
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
