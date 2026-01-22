'use client';

import { useState, useRef } from 'react';
import { Upload, X, Download, Loader2, Film, Wand2, Trash2, Image, Plus, Crop, Languages, ChevronDown } from 'lucide-react';
import axios from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface SceneData {
  name: string;
  label: string;
  script: string;
  visualPrompt: string;
  imageUrl: string | null;
  imageBase64: string | null;
  videoUrl: string | null;
  isGeneratingImage: boolean;
  isGeneratingVideo: boolean;
}

const SCENE_LABELS = ['HOOK', 'MASALAH', 'SOLUSI', 'CTA'];
const SCENE_COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f97316', '#8b5cf6', '#ec4899'];

const ASPECT_RATIOS = [
  { value: '9:16', label: 'PORTRAIT (9:16)' },
  { value: '16:9', label: 'LANDSCAPE (16:9)' },
  { value: '1:1', label: 'SQUARE (1:1)' },
  { value: '4:5', label: 'INSTAGRAM (4:5)' },
];

const LANGUAGES = [
  { value: 'id', label: 'Indonesia' },
  { value: 'en', label: 'English' },
];

export default function VeoPrompterPage() {
  const { user, updateCredits } = useAuthStore();
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [referenceBase64, setReferenceBase64] = useState<string | null>(null);
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [scenes, setScenes] = useState<SceneData[]>([]);
  const [mode, setMode] = useState<'select' | 'auto' | 'manual'>('select');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [scriptLanguage, setScriptLanguage] = useState('id');
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const sceneImageInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { 
        toast.error('Ukuran file maksimal 10MB'); 
        return; 
      }
      setReferenceImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setReferencePreview(result);
        setReferenceBase64(result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAutoGenerateScenes = async () => {
    if (!referenceImage || !referenceBase64) {
      toast.error('Upload gambar terlebih dahulu');
      return;
    }

    if ((user?.credits || 0) < 20) {
      toast.error('Credits tidak cukup! Butuh minimal 20 credits');
      return;
    }

    setIsAutoGenerating(true);
    
    try {
      // Step 1: Generate scripts and visual prompts
      toast.loading('Menganalisis gambar dan membuat script...', { id: 'auto-gen' });
      
      const response = await axios.post('/veo/auto-generate-scenes', {
        imageBase64: referenceBase64,
        additionalPrompt: additionalPrompt || undefined,
        language: scriptLanguage,
      });

      if (!response.data.success) {
        throw new Error('Failed to generate scenes');
      }

      const generatedScenes = response.data.scenes;
      
      // Initialize scenes with generated data
      const initialScenes: SceneData[] = generatedScenes.map((scene: any, index: number) => ({
        name: scene.name,
        label: SCENE_LABELS[index] || `SCENE ${index + 1}`,
        script: scene.script || '',
        visualPrompt: scene.visualPrompt || scene.prompt || '',
        imageUrl: index === 0 ? referencePreview : null, // Scene 1 uses original image
        imageBase64: index === 0 ? referenceBase64 : null,
        videoUrl: null,
        isGeneratingImage: false,
        isGeneratingVideo: false,
      }));

      setScenes(initialScenes);
      setMode('auto');
      toast.success('Script berhasil dibuat! Generating gambar...', { id: 'auto-gen' });

      // Step 2: Generate images for scenes 2-4 IN PARALLEL (faster!)
      const imageGenerationPromises = initialScenes.slice(1).map(async (scene, idx) => {
        const actualIndex = idx + 1; // Because we sliced from index 1
        
        // Set loading state
        setScenes(prev => prev.map((s, i) => 
          i === actualIndex ? { ...s, isGeneratingImage: true } : s
        ));

        try {
          const imageResponse = await axios.post('/veo/generate-scene-image', {
            referenceImageBase64: referenceBase64,
            visualPrompt: scene.visualPrompt,
            sceneNumber: actualIndex + 1,
            aspectRatio: aspectRatio,
          });

          if (imageResponse.data.success) {
            const imageBase64 = imageResponse.data.imageBase64;
            const imageUrl = `data:image/png;base64,${imageBase64}`;
            
            setScenes(prev => prev.map((s, i) => 
              i === actualIndex ? { 
                ...s, 
                imageUrl, 
                imageBase64,
                isGeneratingImage: false 
              } : s
            ));
            return { success: true, index: actualIndex };
          }
          return { success: false, index: actualIndex };
        } catch (error: any) {
          console.error(`Failed to generate image for scene ${actualIndex + 1}:`, error);
          setScenes(prev => prev.map((s, i) => 
            i === actualIndex ? { ...s, isGeneratingImage: false } : s
          ));
          return { success: false, index: actualIndex, error: error.message };
        }
      });

      // Wait for all image generations to complete
      const results = await Promise.allSettled(imageGenerationPromises);
      
      // Check results and show appropriate message
      const failedCount = results.filter(r => 
        r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
      ).length;

      if (failedCount > 0) {
        toast.error(`${failedCount} gambar gagal di-generate`, { id: 'auto-gen' });
      } else {
        toast.success('Semua scene berhasil dibuat!', { id: 'auto-gen' });
      }
      
      // Refresh credits
      try {
        const userRes = await axios.get('/auth/me');
        updateCredits(userRes.data.credits);
      } catch (e) {}

    } catch (error: any) {
      console.error('Auto-generate error:', error);
      toast.error(error.response?.data?.message || 'Gagal generate scenes', { id: 'auto-gen' });
    } finally {
      setIsAutoGenerating(false);
    }
  };

  const handleGenerateVideo = async (sceneIndex: number) => {
    const scene = scenes[sceneIndex];
    if (!scene.imageBase64) {
      toast.error('Gambar scene belum tersedia');
      return;
    }

    if ((user?.credits || 0) < 10) {
      toast.error('Credits tidak cukup! Butuh 10 credits');
      return;
    }

    setScenes(prev => prev.map((s, idx) => 
      idx === sceneIndex ? { ...s, isGeneratingVideo: true } : s
    ));

    try {
      // Combine script (spoken dialogue) with visual prompt for video generation
      // The script tells Veo what the person should SAY in the video
      const videoPrompt = `VIDEO SCENE: ${scene.label}

SPOKEN DIALOGUE (the person in the video MUST say this exact line):
"${scene.script}"

VISUAL DIRECTION:
${scene.visualPrompt}

IMPORTANT: The person in the video must speak the dialogue above in ${scriptLanguage === 'id' ? 'Indonesian (Bahasa Indonesia)' : 'English'}. Lip sync must match the spoken words.`;

      const response = await axios.post('/veo/image-to-video', {
        imageBase64: scene.imageBase64,
        prompt: videoPrompt,
        aspectRatio: aspectRatio,
      });

      if (response.data.success) {
        const videoUrl = `data:video/mp4;base64,${response.data.videoBase64}`;
        setScenes(prev => prev.map((s, idx) => 
          idx === sceneIndex ? { ...s, videoUrl, isGeneratingVideo: false } : s
        ));
        toast.success(`Video scene ${sceneIndex + 1} berhasil dibuat!`);
        
        // Refresh credits
        const userRes = await axios.get('/auth/me');
        updateCredits(userRes.data.credits);
      }
    } catch (error: any) {
      console.error('Video generation error:', error);
      toast.error(error.response?.data?.message || 'Gagal generate video');
      setScenes(prev => prev.map((s, idx) => 
        idx === sceneIndex ? { ...s, isGeneratingVideo: false } : s
      ));
    }
  };

  const handleDeleteScene = (index: number) => {
    if (scenes.length <= 1) {
      toast.error('Minimal 1 scene');
      return;
    }
    setScenes(prev => prev.filter((_, i) => i !== index));
  };

  const updateSceneField = (index: number, field: keyof SceneData, value: string) => {
    setScenes(prev => prev.map((s, i) => 
      i === index ? { ...s, [field]: value } : s
    ));
  };

  const downloadVideo = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Video downloaded!');
  };

  // Manual mode: Start with empty scenes
  const handleStartManual = () => {
    if (!referenceImage || !referenceBase64) {
      toast.error('Upload gambar terlebih dahulu');
      return;
    }
    
    // Create first scene with reference image
    const firstScene: SceneData = {
      name: 'Scene 1',
      label: SCENE_LABELS[0] || 'SCENE 1',
      script: '',
      visualPrompt: '',
      imageUrl: referencePreview,
      imageBase64: referenceBase64,
      videoUrl: null,
      isGeneratingImage: false,
      isGeneratingVideo: false,
    };
    
    setScenes([firstScene]);
    setMode('manual');
  };

  // Add new scene manually (can be called from initial state or after scenes exist)
  const handleAddSceneManual = () => {
    if (!referenceImage || !referenceBase64) {
      toast.error('Upload gambar terlebih dahulu');
      return;
    }

    // If no scenes yet, create first scene with reference image
    if (scenes.length === 0) {
      const firstScene: SceneData = {
        name: 'Scene 1',
        label: SCENE_LABELS[0] || 'HOOK',
        script: '',
        visualPrompt: '',
        imageUrl: referencePreview,
        imageBase64: referenceBase64,
        videoUrl: null,
        isGeneratingImage: false,
        isGeneratingVideo: false,
      };
      setScenes([firstScene]);
      setMode('manual');
      return;
    }

    // Add next scene
    const newIndex = scenes.length;
    const newScene: SceneData = {
      name: `Scene ${newIndex + 1}`,
      label: SCENE_LABELS[newIndex] || `SCENE ${newIndex + 1}`,
      script: '',
      visualPrompt: '',
      imageUrl: null,
      imageBase64: null,
      videoUrl: null,
      isGeneratingImage: false,
      isGeneratingVideo: false,
    };
    setScenes(prev => [...prev, newScene]);
  };

  // Add new empty scene (legacy, now uses handleAddSceneManual)
  const handleAddScene = () => {
    handleAddSceneManual();
  };

  // Handle scene image upload (manual mode)
  const handleSceneImageSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 10MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        setScenes(prev => prev.map((s, i) => 
          i === index ? { ...s, imageUrl: result, imageBase64: base64 } : s
        ));
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate image for a single scene (manual mode)
  const handleGenerateSceneImage = async (index: number) => {
    const scene = scenes[index];
    if (!scene.visualPrompt) {
      toast.error('Masukkan visual prompt terlebih dahulu');
      return;
    }

    if ((user?.credits || 0) < 4) {
      toast.error('Credits tidak cukup! Butuh 4 credits');
      return;
    }

    setScenes(prev => prev.map((s, i) => 
      i === index ? { ...s, isGeneratingImage: true } : s
    ));

    try {
      const imageResponse = await axios.post('/veo/generate-scene-image', {
        referenceImageBase64: referenceBase64,
        visualPrompt: scene.visualPrompt,
        sceneNumber: index + 1,
        aspectRatio: aspectRatio,
      });

      if (imageResponse.data.success) {
        const imageBase64 = imageResponse.data.imageBase64;
        const imageUrl = `data:image/png;base64,${imageBase64}`;
        
        setScenes(prev => prev.map((s, i) => 
          i === index ? { ...s, imageUrl, imageBase64, isGeneratingImage: false } : s
        ));
        toast.success(`Gambar scene ${index + 1} berhasil dibuat!`);
        
        // Refresh credits
        const userRes = await axios.get('/auth/me');
        updateCredits(userRes.data.credits);
      }
    } catch (error: any) {
      console.error(`Failed to generate image for scene ${index + 1}:`, error);
      setScenes(prev => prev.map((s, i) => 
        i === index ? { ...s, isGeneratingImage: false } : s
      ));
      toast.error(error.response?.data?.message || `Gagal generate gambar scene ${index + 1}`);
    }
  };

  // Reset to initial state
  const handleReset = () => {
    setScenes([]);
    setMode('select');
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#4f46e5' }}>
            <Film className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Video Scene Creator</h1>
            <p className="text-sm text-gray-500">Generate video scenes otomatis untuk iklan produk</p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      {scenes.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image Upload */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Upload className="w-5 h-5" style={{ color: '#4f46e5' }} />
                Upload Gambar Produk <span className="text-red-500">*</span>
              </h3>
              
              {!referencePreview ? (
                <div 
                  onClick={() => imageInputRef.current?.click()} 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-400 transition-colors h-64 flex flex-col items-center justify-center"
                >
                  <Image className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-gray-600 mb-1">Upload gambar produk</p>
                  <p className="text-sm text-gray-500">Gambar ini menjadi 'DNA' untuk scene selanjutnya</p>
                  <p className="text-xs text-gray-400 mt-2">PNG, JPG max 10MB</p>
                  <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                </div>
              ) : (
                <div className="relative h-64">
                  <img src={referencePreview} alt="Reference" className="w-full h-full object-contain rounded-lg bg-gray-100" />
                  <button 
                    onClick={() => { 
                      setReferenceImage(null); 
                      setReferencePreview(null); 
                      setReferenceBase64(null);
                    }} 
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Additional Prompt */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Prompt Tambahan (Opsional)</h3>
              <textarea
                value={additionalPrompt}
                onChange={(e) => setAdditionalPrompt(e.target.value)}
                placeholder="Contoh: Target audience ibu rumah tangga, tone friendly dan informatif, produk gas elpiji 3kg..."
                className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Settings Row: Aspect Ratio & Language */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Aspect Ratio */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Crop className="w-4 h-4" />
                Rasio Video & Gambar
              </label>
              <div className="relative">
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-10"
                >
                  {ASPECT_RATIOS.map((ratio) => (
                    <option key={ratio.value} value={ratio.value}>{ratio.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Script Language */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Languages className="w-4 h-4" />
                Bahasa Script/Dialog
              </label>
              <div className="relative">
                <select
                  value={scriptLanguage}
                  onChange={(e) => setScriptLanguage(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-10"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="mt-6 flex items-center justify-between">
            {/* Auto-Create Button */}
            <button
              onClick={handleAutoGenerateScenes}
              disabled={isAutoGenerating || !referenceImage}
              className="flex items-center gap-3 px-6 py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: isAutoGenerating || !referenceImage ? '#9ca3af' : '#4f46e5' }}
            >
              {isAutoGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Wand2 className="w-5 h-5" />
              )}
              <div className="text-left">
                <div className="text-sm font-bold">
                  {isAutoGenerating ? 'Generating...' : 'Auto-Create Full Story'}
                </div>
                <div className="text-xs opacity-90">Hook, Masalah, Solusi, CTA (4 Scene)</div>
              </div>
            </button>

            {/* Manual Mode */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 font-medium">Manual Mode:</span>
              <button
                onClick={handleAddSceneManual}
                disabled={!referenceImage}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: !referenceImage ? '#9ca3af' : '#6366f1' }}
              >
                <Plus className="w-5 h-5" />
                Tambah Scene
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Scenes */}
      {scenes.length > 0 && (
        <div className="space-y-6">
          {/* Header with Reset and Add Scene buttons */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {mode === 'manual' ? 'Manual Mode' : 'Generated Scenes'} ({scenes.length})
            </h2>
            <div className="flex gap-2">
              {mode === 'manual' && (
                <button
                  onClick={handleAddScene}
                  className="px-4 py-2 text-sm text-white font-medium rounded-lg flex items-center gap-2"
                  style={{ backgroundColor: '#4f46e5' }}
                >
                  <Plus className="w-4 h-4" />
                  Tambah Scene
                </button>
              )}
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Reset & Start Over
              </button>
            </div>
          </div>

          {scenes.map((scene, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Scene Header */}
              <div 
                className="px-4 py-2 flex items-center justify-between"
                style={{ backgroundColor: SCENE_COLORS[index % SCENE_COLORS.length] || '#6b7280' }}
              >
                <span className="text-white font-bold text-sm">
                  SCENE {index + 1} - {scene.label}
                </span>
                <button
                  onClick={() => handleDeleteScene(index)}
                  className="text-white/80 hover:text-white p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Image Section */}
                  <div>
                    {scene.isGeneratingImage ? (
                      <div className="aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Generating gambar...</p>
                        </div>
                      </div>
                    ) : scene.imageUrl ? (
                      <div className="relative">
                        <img 
                          src={scene.imageUrl} 
                          alt={`Scene ${index + 1}`} 
                          className="w-full aspect-[3/4] object-cover rounded-lg"
                        />
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          {index === 0 ? "Foto ini menjadi 'DNA' untuk scene selanjutnya." : "Gambar dibuat otomatis agar konsisten."}
                        </p>
                        {/* Replace image button for manual mode */}
                        {mode === 'manual' && (
                          <button
                            onClick={() => sceneImageInputRefs.current[index]?.click()}
                            className="absolute bottom-8 right-2 bg-white/90 hover:bg-white text-gray-700 rounded-lg px-2 py-1 text-xs font-medium shadow"
                          >
                            Ganti Gambar
                          </button>
                        )}
                        <input
                          ref={el => { sceneImageInputRefs.current[index] = el; }}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSceneImageSelect(index, e)}
                          className="hidden"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[3/4] bg-gray-100 rounded-lg flex flex-col items-center justify-center gap-3">
                        {mode === 'manual' ? (
                          <>
                            <button
                              onClick={() => sceneImageInputRefs.current[index]?.click()}
                              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Upload className="w-4 h-4" />
                              Upload Gambar
                            </button>
                            <span className="text-gray-400 text-sm">atau</span>
                            <button
                              onClick={() => handleGenerateSceneImage(index)}
                              disabled={!scene.visualPrompt || scene.isGeneratingImage}
                              className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ backgroundColor: '#8b5cf6' }}
                            >
                              <Wand2 className="w-4 h-4" />
                              Generate dari Prompt
                            </button>
                            <p className="text-xs text-gray-400 mt-1">4 credits per gambar</p>
                            <input
                              ref={el => { sceneImageInputRefs.current[index] = el; }}
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleSceneImageSelect(index, e)}
                              className="hidden"
                            />
                          </>
                        ) : (
                          <p className="text-sm text-gray-400">Gambar belum tersedia</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Script & Prompt Section */}
                  <div className="space-y-4">
                    {mode === 'manual' ? (
                      <>
                        {/* Separate inputs for manual mode */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                            Script / Narasi
                          </label>
                          <textarea
                            value={scene.script}
                            onChange={(e) => updateSceneField(index, 'script', e.target.value)}
                            placeholder="Tulis script atau narasi untuk scene ini..."
                            className="w-full h-20 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                            Visual Prompt (untuk generate gambar/video)
                          </label>
                          <textarea
                            value={scene.visualPrompt}
                            onChange={(e) => updateSceneField(index, 'visualPrompt', e.target.value)}
                            placeholder="Deskripsikan visual scene ini secara detail untuk AI... (camera angle, lighting, mood, action)"
                            className="w-full h-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                          />
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                          Script & Visual Prompt
                        </label>
                        <textarea
                          value={`[${scene.label}] Script: "${scene.script}"\n\nVisual Prompt (Veo): ${scene.visualPrompt}`}
                          onChange={(e) => {
                            const text = e.target.value;
                            const scriptMatch = text.match(/Script: "([^"]*)"/);
                            const promptMatch = text.match(/Visual Prompt \(Veo\): ([\s\S]*)/);
                            if (scriptMatch) updateSceneField(index, 'script', scriptMatch[1]);
                            if (promptMatch) updateSceneField(index, 'visualPrompt', promptMatch[1].trim());
                          }}
                          className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                        />
                      </div>
                    )}

                    {/* Video Result or Generate Button */}
                    {scene.videoUrl ? (
                      <div>
                        <video 
                          src={scene.videoUrl} 
                          controls 
                          className="w-full rounded-lg aspect-video bg-black"
                        />
                        <button
                          onClick={() => downloadVideo(scene.videoUrl!, `scene-${index + 1}-${scene.label}`)}
                          className="w-full mt-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <Download className="w-4 h-4" />
                          Download Video
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleGenerateVideo(index)}
                        disabled={scene.isGeneratingVideo || !scene.imageBase64}
                        className="w-full px-4 py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        style={{ backgroundColor: scene.isGeneratingVideo || !scene.imageBase64 ? '#9ca3af' : '#f97316' }}
                      >
                        {scene.isGeneratingVideo ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Generating Video...
                          </>
                        ) : (
                          <>
                            <Film className="w-5 h-5" />
                            Generate Video Scene
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Credits Info */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Credits tersisa: <span className="font-semibold" style={{ color: '#4f46e5' }}>{user?.credits || 0}</span>
        <span className="mx-2">•</span>
        <span>Auto-create = ~20 credits</span>
        <span className="mx-2">•</span>
        <span>Video = 10 credits/scene</span>
      </div>
    </div>
  );
}
