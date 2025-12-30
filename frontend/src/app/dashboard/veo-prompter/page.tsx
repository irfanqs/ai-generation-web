'use client';

import { useState, useRef } from 'react';
import { Video, Upload, X, Download, Loader2, Film, Plus, Trash2, Sparkles, Clock, Image as ImageIcon, Layers } from 'lucide-react';
import axios from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const ASPECT_RATIOS = [
  { value: '9:16', label: 'PORTRAIT (9:16)' },
  { value: '16:9', label: 'LANDSCAPE (16:9)' },
];

const GENERATION_MODES = [
  { value: 'scene', label: 'Scene by Scene', icon: Film, description: 'Generate individual scenes' },
  { value: 'long-video', label: 'Long Video (Flow)', icon: Clock, description: 'Generate up to 148s video' },
  { value: 'interpolation', label: 'Interpolation', icon: Layers, description: 'First & last frame' },
];

const SCENE_TYPES = [
  'Hook', 'Masalah', 'Solusi', 'CTA (Call to Action)', 'Testimoni', 'Demo Produk', 'Closing',
];

interface Scene {
  id: string;
  type: string;
  script: string;
  visualPrompt: string;
  imageFile: File | null;
  imagePreview: string | null;
  videoUrl: string | null;
  isGenerating: boolean;
}

interface ReferenceImage {
  id: string;
  file: File | null;
  preview: string | null;
  type: 'asset' | 'style';
}

export default function VeoPrompterPage() {
  const { user, updateCredits } = useAuthStore();
  const [selectedRatio, setSelectedRatio] = useState<'16:9' | '9:16'>('9:16');
  const [generationMode, setGenerationMode] = useState('scene');
  const [autoCreateStory, setAutoCreateStory] = useState(false);
  const [storyTopic, setStoryTopic] = useState('');
  
  // Scene mode state
  const [scenes, setScenes] = useState<Scene[]>([
    { id: '1', type: 'Hook', script: '', visualPrompt: '', imageFile: null, imagePreview: null, videoUrl: null, isGenerating: false }
  ]);
  
  // Long video mode state
  const [longVideoPrompt, setLongVideoPrompt] = useState('');
  const [longVideoSegments, setLongVideoSegments] = useState<{ prompt: string }[]>([{ prompt: '' }]);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [isGeneratingLongVideo, setIsGeneratingLongVideo] = useState(false);
  const [longVideoResult, setLongVideoResult] = useState<{ url: string; duration: number } | null>(null);
  
  // Interpolation mode state
  const [firstFrame, setFirstFrame] = useState<{ file: File | null; preview: string | null }>({ file: null, preview: null });
  const [lastFrame, setLastFrame] = useState<{ file: File | null; preview: string | null }>({ file: null, preview: null });
  const [interpolationPrompt, setInterpolationPrompt] = useState('');
  const [isGeneratingInterpolation, setIsGeneratingInterpolation] = useState(false);
  const [interpolationResult, setInterpolationResult] = useState<string | null>(null);
  
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Scene functions
  const addScene = () => {
    if (scenes.length >= 10) { toast.error('Maksimal 10 scene'); return; }
    setScenes([...scenes, { id: Date.now().toString(), type: 'Masalah', script: '', visualPrompt: '', imageFile: null, imagePreview: null, videoUrl: null, isGenerating: false }]);
  };

  const removeScene = (id: string) => {
    if (scenes.length <= 1) { toast.error('Minimal 1 scene'); return; }
    setScenes(scenes.filter(s => s.id !== id));
  };

  const updateScene = (id: string, field: keyof Scene, value: any) => {
    setScenes(scenes.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleImageSelect = (sceneId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { toast.error('Ukuran file maksimal 10MB'); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateScene(sceneId, 'imageFile', file);
        updateScene(sceneId, 'imagePreview', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (sceneId: string) => {
    updateScene(sceneId, 'imageFile', null);
    updateScene(sceneId, 'imagePreview', null);
  };

  const generateScene = async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene || (!scene.visualPrompt.trim() && !scene.imageFile)) {
      toast.error('Masukkan visual prompt atau upload gambar');
      return;
    }

    updateScene(sceneId, 'isGenerating', true);

    try {
      let imageBase64 = '';
      if (scene.imageFile) {
        imageBase64 = await fileToBase64(scene.imageFile);
      }

      const response = await axios.post('/veo/image-to-video', {
        imageBase64: imageBase64 || undefined,
        prompt: scene.visualPrompt || 'Animate this image with smooth motion',
        aspectRatio: selectedRatio,
      });

      if (response.data.success) {
        const videoUrl = `data:video/mp4;base64,${response.data.videoBase64}`;
        updateScene(sceneId, 'videoUrl', videoUrl);
        toast.success(`Scene ${scene.type} berhasil dibuat!`);
        if (response.data.creditCost && user) {
          updateCredits(user.credits - response.data.creditCost);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal membuat video');
    } finally {
      updateScene(sceneId, 'isGenerating', false);
    }
  };

  // Long video functions
  const addSegment = () => {
    if (longVideoSegments.length >= 19) { toast.error('Maksimal 19 segment (148 detik)'); return; }
    setLongVideoSegments([...longVideoSegments, { prompt: '' }]);
  };

  const removeSegment = (index: number) => {
    if (longVideoSegments.length <= 1) return;
    setLongVideoSegments(longVideoSegments.filter((_, i) => i !== index));
  };

  const updateSegment = (index: number, prompt: string) => {
    setLongVideoSegments(longVideoSegments.map((s, i) => i === index ? { prompt } : s));
  };

  const addReferenceImage = () => {
    if (referenceImages.length >= 3) { toast.error('Maksimal 3 reference images'); return; }
    setReferenceImages([...referenceImages, { id: Date.now().toString(), file: null, preview: null, type: 'asset' }]);
  };

  const handleReferenceImageSelect = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImages(referenceImages.map(r => r.id === id ? { ...r, file, preview: reader.result as string } : r));
      };
      reader.readAsDataURL(file);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const generateLongVideo = async () => {
    if (!longVideoPrompt.trim()) { toast.error('Masukkan prompt awal'); return; }
    if (longVideoSegments.some(s => !s.prompt.trim())) { toast.error('Semua segment harus memiliki prompt'); return; }

    setIsGeneratingLongVideo(true);
    const toastId = toast.loading('Generating long video... This may take several minutes');

    try {
      const refs = await Promise.all(
        referenceImages.filter(r => r.file).map(async r => ({
          imageBase64: await fileToBase64(r.file!),
          referenceType: r.type,
        }))
      );

      const response = await axios.post('/veo/long-video', {
        initialPrompt: longVideoPrompt,
        segments: longVideoSegments,
        referenceImages: refs.length > 0 ? refs : undefined,
        aspectRatio: selectedRatio,
      });

      if (response.data.success) {
        setLongVideoResult({
          url: `data:video/mp4;base64,${response.data.videoBase64}`,
          duration: response.data.totalDuration,
        });
        toast.success(`Video ${response.data.totalDuration}s berhasil dibuat!`, { id: toastId });
        if (response.data.creditCost && user) {
          updateCredits(user.credits - response.data.creditCost);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal membuat video', { id: toastId });
    } finally {
      setIsGeneratingLongVideo(false);
    }
  };

  const generateInterpolation = async () => {
    if (!firstFrame.file || !lastFrame.file) { toast.error('Upload first dan last frame'); return; }

    setIsGeneratingInterpolation(true);
    const toastId = toast.loading('Generating interpolation video...');

    try {
      const response = await axios.post('/veo/interpolate', {
        firstFrameBase64: await fileToBase64(firstFrame.file),
        lastFrameBase64: await fileToBase64(lastFrame.file),
        prompt: interpolationPrompt || 'Smooth transition between frames',
        aspectRatio: selectedRatio,
      });

      if (response.data.success) {
        setInterpolationResult(`data:video/mp4;base64,${response.data.videoBase64}`);
        toast.success('Interpolation video berhasil!', { id: toastId });
        if (response.data.creditCost && user) {
          updateCredits(user.credits - response.data.creditCost);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal membuat video', { id: toastId });
    } finally {
      setIsGeneratingInterpolation(false);
    }
  };

  const handleFrameSelect = (type: 'first' | 'last', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'first') setFirstFrame({ file, preview: reader.result as string });
        else setLastFrame({ file, preview: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
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

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#4f46e5' }}>
            <Film className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Veo 3.1 Video Creator</h1>
            <p className="text-sm text-gray-500">Generate videos up to 148 seconds with Google Flow-like features</p>
          </div>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {GENERATION_MODES.map((mode) => (
          <button
            key={mode.value}
            onClick={() => setGenerationMode(mode.value)}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              generationMode === mode.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <mode.icon className={`w-6 h-6 mb-2 ${generationMode === mode.value ? 'text-indigo-600' : 'text-gray-400'}`} />
            <h3 className={`font-semibold ${generationMode === mode.value ? 'text-indigo-900' : 'text-gray-900'}`}>{mode.label}</h3>
            <p className="text-sm text-gray-500">{mode.description}</p>
          </button>
        ))}
      </div>

      {/* Aspect Ratio */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">Aspect Ratio:</label>
        <div className="flex gap-3">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio.value}
              onClick={() => setSelectedRatio(ratio.value as '16:9' | '9:16')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedRatio === ratio.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {ratio.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scene Mode */}
      {generationMode === 'scene' && (
        <div className="space-y-6">
          {scenes.map((scene, index) => (
            <div key={scene.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-lg text-sm font-semibold text-white bg-indigo-600">
                    SCENE {index + 1}
                  </span>
                  <select
                    value={scene.type}
                    onChange={(e) => updateScene(scene.id, 'type', e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                  >
                    {SCENE_TYPES.map((type) => (<option key={type} value={type}>{type}</option>))}
                  </select>
                </div>
                {scenes.length > 1 && (
                  <button onClick={() => removeScene(scene.id)} className="text-red-500 hover:text-red-600">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Reference Image:</label>
                  {!scene.imagePreview ? (
                    <div
                      onClick={() => fileInputRefs.current[scene.id]?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-gray-400 h-64 flex flex-col items-center justify-center"
                    >
                      <Upload className="w-12 h-12 text-gray-400 mb-3" />
                      <p className="text-sm text-gray-600">Upload reference image</p>
                      <input
                        ref={(el) => { if (el) fileInputRefs.current[scene.id] = el; }}
                        type="file" accept="image/*" onChange={(e) => handleImageSelect(scene.id, e)} className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="relative h-64">
                      <img src={scene.imagePreview} alt="Reference" className="w-full h-full object-cover rounded-lg" />
                      <button onClick={() => removeImage(scene.id)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Visual Prompt:</label>
                    <textarea
                      value={scene.visualPrompt}
                      onChange={(e) => updateScene(scene.id, 'visualPrompt', e.target.value)}
                      placeholder="Describe the video scene..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                      rows={6}
                    />
                  </div>

                  <button
                    onClick={() => generateScene(scene.id)}
                    disabled={scene.isGenerating || (!scene.visualPrompt.trim() && !scene.imageFile)}
                    className="w-full disabled:bg-gray-300 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
                  >
                    {scene.isGenerating ? (<><Loader2 className="w-5 h-5 animate-spin" />Generating...</>) : (<><Film className="w-5 h-5" />Generate Scene</>)}
                  </button>

                  {scene.videoUrl && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <video src={scene.videoUrl} controls className="w-full rounded-lg mb-3" />
                      <button onClick={() => downloadVideo(scene.videoUrl!, `scene-${scene.type}`)} className="w-full px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg flex items-center justify-center gap-2 text-sm font-medium">
                        <Download className="w-4 h-4" />Download
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <button onClick={addScene} className="w-full px-6 py-4 bg-white border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-lg flex items-center justify-center gap-2 font-semibold text-gray-700">
            <Plus className="w-5 h-5" />Add Scene
          </button>
        </div>
      )}

      {/* Long Video Mode */}
      {generationMode === 'long-video' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Long Video Generation (Google Flow)</h3>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">Up to 148 seconds</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Initial Prompt (First 8 seconds):</label>
                <textarea
                  value={longVideoPrompt}
                  onChange={(e) => setLongVideoPrompt(e.target.value)}
                  placeholder="Describe the opening scene of your video..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={3}
                />
              </div>

              {/* Reference Images */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Reference Images (Optional, max 3):</label>
                  {referenceImages.length < 3 && (
                    <button onClick={addReferenceImage} className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                      <Plus className="w-4 h-4" />Add Reference
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {referenceImages.map((ref) => (
                    <div key={ref.id} className="relative">
                      {!ref.preview ? (
                        <div
                          onClick={() => fileInputRefs.current[`ref-${ref.id}`]?.click()}
                          className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 h-32 flex flex-col items-center justify-center"
                        >
                          <ImageIcon className="w-8 h-8 text-gray-400 mb-1" />
                          <p className="text-xs text-gray-500">Upload</p>
                          <input
                            ref={(el) => { if (el) fileInputRefs.current[`ref-${ref.id}`] = el; }}
                            type="file" accept="image/*" onChange={(e) => handleReferenceImageSelect(ref.id, e)} className="hidden"
                          />
                        </div>
                      ) : (
                        <div className="relative h-32">
                          <img src={ref.preview} alt="Reference" className="w-full h-full object-cover rounded-lg" />
                          <button
                            onClick={() => setReferenceImages(referenceImages.filter(r => r.id !== ref.id))}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <select
                        value={ref.type}
                        onChange={(e) => setReferenceImages(referenceImages.map(r => r.id === ref.id ? { ...r, type: e.target.value as 'asset' | 'style' } : r))}
                        className="w-full mt-2 px-2 py-1 text-xs border border-gray-300 rounded"
                      >
                        <option value="asset">Asset (Character/Object)</option>
                        <option value="style">Style Reference</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Segments */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Extension Segments (+7s each):</label>
                  <span className="text-xs text-gray-500">Total: ~{8 + longVideoSegments.length * 7}s</span>
                </div>
                <div className="space-y-2">
                  {longVideoSegments.map((segment, index) => (
                    <div key={index} className="flex gap-2">
                      <span className="px-2 py-2 bg-gray-100 rounded text-sm font-medium text-gray-600 w-16 text-center">+{(index + 1) * 7}s</span>
                      <input
                        value={segment.prompt}
                        onChange={(e) => updateSegment(index, e.target.value)}
                        placeholder={`Segment ${index + 1} prompt...`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                      {longVideoSegments.length > 1 && (
                        <button onClick={() => removeSegment(index)} className="text-red-500 hover:text-red-600 px-2">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={addSegment} className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  <Plus className="w-4 h-4" />Add Segment
                </button>
              </div>

              <button
                onClick={generateLongVideo}
                disabled={isGeneratingLongVideo || !longVideoPrompt.trim()}
                className="w-full disabled:bg-gray-300 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
              >
                {isGeneratingLongVideo ? (<><Loader2 className="w-5 h-5 animate-spin" />Generating Long Video...</>) : (<><Clock className="w-5 h-5" />Generate Long Video</>)}
              </button>

              {longVideoResult && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Generated Video</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">{longVideoResult.duration}s</span>
                  </div>
                  <video src={longVideoResult.url} controls className="w-full rounded-lg mb-3" />
                  <button onClick={() => downloadVideo(longVideoResult.url, 'long-video')} className="w-full px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg flex items-center justify-center gap-2 text-sm font-medium">
                    <Download className="w-4 h-4" />Download
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interpolation Mode */}
      {generationMode === 'interpolation' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Frame Interpolation</h3>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">First & Last Frame</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">First Frame:</label>
              {!firstFrame.preview ? (
                <div
                  onClick={() => fileInputRefs.current['first-frame']?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 h-48 flex flex-col items-center justify-center"
                >
                  <Upload className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Upload first frame</p>
                  <input
                    ref={(el) => { if (el) fileInputRefs.current['first-frame'] = el; }}
                    type="file" accept="image/*" onChange={(e) => handleFrameSelect('first', e)} className="hidden"
                  />
                </div>
              ) : (
                <div className="relative h-48">
                  <img src={firstFrame.preview} alt="First frame" className="w-full h-full object-cover rounded-lg" />
                  <button onClick={() => setFirstFrame({ file: null, preview: null })} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Last Frame:</label>
              {!lastFrame.preview ? (
                <div
                  onClick={() => fileInputRefs.current['last-frame']?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 h-48 flex flex-col items-center justify-center"
                >
                  <Upload className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Upload last frame</p>
                  <input
                    ref={(el) => { if (el) fileInputRefs.current['last-frame'] = el; }}
                    type="file" accept="image/*" onChange={(e) => handleFrameSelect('last', e)} className="hidden"
                  />
                </div>
              ) : (
                <div className="relative h-48">
                  <img src={lastFrame.preview} alt="Last frame" className="w-full h-full object-cover rounded-lg" />
                  <button onClick={() => setLastFrame({ file: null, preview: null })} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Transition Prompt (Optional):</label>
            <input
              value={interpolationPrompt}
              onChange={(e) => setInterpolationPrompt(e.target.value)}
              placeholder="Describe the transition between frames..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={generateInterpolation}
            disabled={isGeneratingInterpolation || !firstFrame.file || !lastFrame.file}
            className="w-full disabled:bg-gray-300 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
          >
            {isGeneratingInterpolation ? (<><Loader2 className="w-5 h-5 animate-spin" />Generating...</>) : (<><Layers className="w-5 h-5" />Generate Interpolation</>)}
          </button>

          {interpolationResult && (
            <div className="border border-gray-200 rounded-lg p-4 mt-4">
              <video src={interpolationResult} controls className="w-full rounded-lg mb-3" />
              <button onClick={() => downloadVideo(interpolationResult, 'interpolation')} className="w-full px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg flex items-center justify-center gap-2 text-sm font-medium">
                <Download className="w-4 h-4" />Download
              </button>
            </div>
          )}
        </div>
      )}

      {/* Credits Info */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Credits: <span className="font-semibold text-indigo-600">{user?.credits || 0}</span>
      </div>
    </div>
  );
}
