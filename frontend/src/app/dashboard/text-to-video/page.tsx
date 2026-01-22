'use client';

import { useState, useRef } from 'react';
import { Video, Upload, X, Download, Loader2, Film, Plus, Trash2, Sparkles, Play } from 'lucide-react';
import axios from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const ASPECT_RATIOS = [
  { value: '9:16', label: '9:16 (Story/Reels)' },
  { value: '16:9', label: '16:9 (YouTube)' },
  { value: '1:1', label: '1:1 (Square)' },
];

interface Character {
  id: string;
  name: string;
  image: File | null;
  preview: string | null;
}

interface GeneratedScene {
  id: string;
  sceneNumber: number;
  imageUrl: string | null;
  prompt: string;
  videoUrl: string | null;
  isGeneratingImage: boolean;
  isGeneratingVideo: boolean;
}

export default function Veo3PrompterPage() {
  const { user, updateCredits } = useAuthStore();
  const [characters, setCharacters] = useState<Character[]>([
    { id: '1', name: '', image: null, preview: null }
  ]);
  const [storyTitle, setStoryTitle] = useState('');
  const [selectedRatio, setSelectedRatio] = useState('9:16');
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [scenes, setScenes] = useState<GeneratedScene[]>([]);
  
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const addCharacter = () => {
    if (characters.length >= 5) {
      toast.error('Maksimal 5 karakter');
      return;
    }
    setCharacters([...characters, { id: Date.now().toString(), name: '', image: null, preview: null }]);
  };

  const removeCharacter = (id: string) => {
    if (characters.length <= 1) {
      toast.error('Minimal 1 karakter');
      return;
    }
    setCharacters(characters.filter(c => c.id !== id));
  };

  const updateCharacter = (id: string, field: keyof Character, value: any) => {
    setCharacters(characters.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleCharacterImageSelect = (characterId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 10MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateCharacter(characterId, 'image', file);
        updateCharacter(characterId, 'preview', reader.result as string);
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

  const generateStory = async () => {
    const validCharacters = characters.filter(c => c.name.trim() && c.image);
    if (validCharacters.length === 0) {
      toast.error('Tambahkan minimal 1 karakter dengan nama dan foto');
      return;
    }
    if (!storyTitle.trim()) {
      toast.error('Masukkan judul cerita');
      return;
    }

    setIsGeneratingStory(true);
    
    try {
      // Build character descriptions for AI
      const characterDescriptions = validCharacters.map(c => c.name).join(', ');
      
      // Use Gemini to generate story scenes
      const response = await axios.post('/generation/generate-story', {
        title: storyTitle,
        characters: characterDescriptions,
        aspectRatio: selectedRatio,
      });

      if (response.data.scenes) {
        // Generate images for each scene
        const generatedScenes: GeneratedScene[] = [];
        
        for (let i = 0; i < response.data.scenes.length; i++) {
          const sceneData = response.data.scenes[i];
          generatedScenes.push({
            id: Date.now().toString() + i,
            sceneNumber: i + 1,
            imageUrl: sceneData.imageUrl || null,
            prompt: sceneData.prompt,
            videoUrl: null,
            isGeneratingImage: false,
            isGeneratingVideo: false,
          });
        }
        
        setScenes(generatedScenes);
        toast.success(`${generatedScenes.length} scene berhasil dibuat!`);
        
        // Refresh credits
        try {
          const userRes = await axios.get('/auth/me');
          updateCredits(userRes.data.credits);
        } catch (e) { console.error('Failed to refresh credits:', e); }
      }
    } catch (error: any) {
      console.error('Story generation error:', error);
      // Fallback: generate sample scenes locally
      const sampleScenes: GeneratedScene[] = [
        { id: '1', sceneNumber: 1, imageUrl: null, prompt: `Opening scene: ${storyTitle}. Introduce ${characters[0]?.name || 'the main character'} in a dramatic setting. Cinematic wide shot, golden hour lighting.`, videoUrl: null, isGeneratingImage: false, isGeneratingVideo: false },
        { id: '2', sceneNumber: 2, imageUrl: null, prompt: `${characters[0]?.name || 'The character'} faces a challenge or conflict. Medium shot showing emotion and determination. Dramatic lighting.`, videoUrl: null, isGeneratingImage: false, isGeneratingVideo: false },
        { id: '3', sceneNumber: 3, imageUrl: null, prompt: `The turning point: ${characters[0]?.name || 'The character'} discovers something important. Close-up shot with intense expression. Mysterious atmosphere.`, videoUrl: null, isGeneratingImage: false, isGeneratingVideo: false },
        { id: '4', sceneNumber: 4, imageUrl: null, prompt: `Climax: ${characters[0]?.name || 'The character'} takes action. Dynamic shot with movement. High energy, dramatic lighting.`, videoUrl: null, isGeneratingImage: false, isGeneratingVideo: false },
        { id: '5', sceneNumber: 5, imageUrl: null, prompt: `Resolution: ${storyTitle} concludes. ${characters[0]?.name || 'The character'} in a peaceful moment. Warm lighting, satisfying ending.`, videoUrl: null, isGeneratingImage: false, isGeneratingVideo: false },
      ];
      setScenes(sampleScenes);
      toast.success('5 scene template berhasil dibuat!');
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const generateSceneImage = async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;

    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, isGeneratingImage: true } : s));

    try {
      // Get first character image as reference
      const characterWithImage = characters.find(c => c.image);
      let characterBase64 = '';
      if (characterWithImage?.image) {
        characterBase64 = await fileToBase64(characterWithImage.image);
      }

      const response = await axios.post('/generation/text-to-image', {
        prompt: scene.prompt + ` Aspect ratio ${selectedRatio}. High quality, cinematic.`,
        characterReference: characterBase64 || undefined,
      });

      if (response.data.id) {
        // Poll for completion
        let attempts = 0;
        const maxAttempts = 30;
        
        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            const statusRes = await axios.get(`/generation/${response.data.id}`);
            if (statusRes.data.status === 'completed') {
              clearInterval(pollInterval);
              setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, imageUrl: statusRes.data.outputUrl, isGeneratingImage: false } : s));
              toast.success(`Scene ${scene.sceneNumber} image berhasil!`);
              
              const userRes = await axios.get('/auth/me');
              updateCredits(userRes.data.credits);
            } else if (statusRes.data.status === 'failed' || attempts >= maxAttempts) {
              clearInterval(pollInterval);
              setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, isGeneratingImage: false } : s));
              toast.error('Gagal generate image');
            }
          } catch (e) { console.error('Polling error:', e); }
        }, 2000);
      }
    } catch (error: any) {
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, isGeneratingImage: false } : s));
      toast.error(error.response?.data?.message || 'Gagal generate image');
    }
  };

  const generateSceneVideo = async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;

    // Check if scene has an image
    if (!scene.imageUrl) {
      toast.error('Generate gambar terlebih dahulu sebelum membuat video');
      return;
    }

    if ((user?.credits || 0) < 10) {
      toast.error('Credits tidak cukup! Butuh 10 credits');
      return;
    }

    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, isGeneratingVideo: true } : s));
    const toastId = toast.loading(`Generating video scene ${scene.sceneNumber}...`);

    try {
      // Use imageUrl directly - backend will download
      console.log('Sending to backend:', {
        imageUrl: scene.imageUrl,
        prompt: scene.prompt,
        aspectRatio: selectedRatio,
      });

      const response = await axios.post('/veo/image-to-video', {
        imageUrl: scene.imageUrl,
        prompt: scene.prompt,
        aspectRatio: selectedRatio,
      });

      if (response.data.success) {
        const videoUrl = `data:video/mp4;base64,${response.data.videoBase64}`;
        setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, videoUrl, isGeneratingVideo: false } : s));
        toast.success(`Video scene ${scene.sceneNumber} berhasil!`, { id: toastId });
        
        const userRes = await axios.get('/auth/me');
        updateCredits(userRes.data.credits);
      }
    } catch (error: any) {
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, isGeneratingVideo: false } : s));
      toast.error(error.response?.data?.message || 'Gagal generate video', { id: toastId });
    }
  };

  const addScene = () => {
    const newSceneNumber = scenes.length + 1;
    setScenes([...scenes, {
      id: Date.now().toString(),
      sceneNumber: newSceneNumber,
      imageUrl: null,
      prompt: `Scene ${newSceneNumber}: Describe what happens in this scene...`,
      videoUrl: null,
      isGeneratingImage: false,
      isGeneratingVideo: false,
    }]);
  };

  const removeScene = (sceneId: string) => {
    if (scenes.length <= 1) {
      toast.error('Minimal 1 scene');
      return;
    }
    setScenes(scenes.filter(s => s.id !== sceneId).map((s, idx) => ({ ...s, sceneNumber: idx + 1 })));
  };

  const updateScenePrompt = (sceneId: string, prompt: string) => {
    setScenes(scenes.map(s => s.id === sceneId ? { ...s, prompt } : s));
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
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#4f46e5' }}>
            <Film className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Veo 3 Story Prompter</h1>
            <p className="text-sm text-gray-500">Generate video story dengan karakter custom</p>
          </div>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-indigo-900 mb-1">Cara Penggunaan</h3>
            <ol className="text-sm text-indigo-700 space-y-1 list-decimal list-inside">
              <li>Upload foto karakter (max 5) dan beri nama</li>
              <li>Masukkan judul cerita</li>
              <li>Pilih aspect ratio</li>
              <li>Tekan "Generate Story" untuk membuat scene</li>
              <li>Edit prompt jika perlu, lalu generate video per scene</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Characters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">1. Karakter ({characters.length}/5)</h3>
          {characters.length < 5 && (
            <button onClick={addCharacter} className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              <Plus className="w-4 h-4" />Tambah Karakter
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((char, index) => (
            <div key={char.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-600">Karakter {index + 1}</span>
                {characters.length > 1 && (
                  <button onClick={() => removeCharacter(char.id)} className="text-red-500 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {!char.preview ? (
                <div onClick={() => fileInputRefs.current[char.id]?.click()} className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-400 h-32 flex flex-col items-center justify-center mb-3">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-xs text-gray-500">Upload foto</p>
                  <input ref={(el) => { if (el) fileInputRefs.current[char.id] = el; }} type="file" accept="image/*" onChange={(e) => handleCharacterImageSelect(char.id, e)} className="hidden" />
                </div>
              ) : (
                <div className="relative h-32 mb-3">
                  <img src={char.preview} alt={char.name} className="w-full h-full object-cover rounded-lg" />
                  <button onClick={() => { updateCharacter(char.id, 'image', null); updateCharacter(char.id, 'preview', null); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              
              <input value={char.name} onChange={(e) => updateCharacter(char.id, 'name', e.target.value)} placeholder="Nama karakter..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>
          ))}
        </div>
      </div>

      {/* Story Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">2. Judul Cerita <span className="text-red-500">*</span></label>
            <input value={storyTitle} onChange={(e) => setStoryTitle(e.target.value)} placeholder="Contoh: Petualangan di Hutan Ajaib..." className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">3. Aspect Ratio</label>
            <div className="flex gap-2">
              {ASPECT_RATIOS.map((ratio) => (
                <button key={ratio.value} onClick={() => setSelectedRatio(ratio.value)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedRatio === ratio.value ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} style={selectedRatio === ratio.value ? { backgroundColor: '#4f46e5' } : {}}>
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Generate Story Button */}
      <button onClick={generateStory} disabled={isGeneratingStory || !storyTitle.trim() || !characters.some(c => c.name.trim() && c.image)} className="w-full disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg transition-colors flex items-center justify-center gap-2 mb-6" style={{ backgroundColor: isGeneratingStory || !storyTitle.trim() || !characters.some(c => c.name.trim() && c.image) ? undefined : '#4f46e5' }}>
        {isGeneratingStory ? (<><Loader2 className="w-5 h-5 animate-spin" />Generating Story...</>) : (<><Sparkles className="w-5 h-5" />Generate Story Scenes</>)}
      </button>

      {/* Generated Scenes */}
      {scenes.length > 0 && (
        <div className="space-y-4 mb-6">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Film className="w-5 h-5" style={{ color: '#4f46e5' }} />
            Story Scenes ({scenes.length})
          </h3>
          
          {scenes.map((scene) => (
            <div key={scene.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: '#4f46e5' }}>
                  SCENE {scene.sceneNumber}
                </span>
                <button onClick={() => removeScene(scene.id)} className="text-red-500 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Image Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Scene Image</label>
                  {scene.imageUrl ? (
                    <img src={scene.imageUrl} alt={`Scene ${scene.sceneNumber}`} className="w-full h-48 object-cover rounded-lg mb-3" />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                      {scene.isGeneratingImage ? (
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Generating image...</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">No image yet</p>
                      )}
                    </div>
                  )}
                  <button onClick={() => generateSceneImage(scene.id)} disabled={scene.isGeneratingImage} className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                    {scene.isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {scene.imageUrl ? 'Regenerate Image' : 'Generate Image'} (4 credits)
                  </button>
                </div>

                {/* Prompt & Video Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Scene Prompt</label>
                  <textarea value={scene.prompt} onChange={(e) => updateScenePrompt(scene.id, e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none mb-3" rows={4} />
                  
                  {scene.videoUrl ? (
                    <div className="border border-gray-200 rounded-lg p-3">
                      <video src={scene.videoUrl} controls className="w-full rounded-lg mb-2" />
                      <button onClick={() => downloadVideo(scene.videoUrl!, `scene-${scene.sceneNumber}`)} className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" />Download Video
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => generateSceneVideo(scene.id)} disabled={scene.isGeneratingVideo} className="w-full disabled:bg-gray-300 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2" style={{ backgroundColor: scene.isGeneratingVideo ? undefined : '#4f46e5' }}>
                      {scene.isGeneratingVideo ? (<><Loader2 className="w-4 h-4 animate-spin" />Generating Video...</>) : (<><Play className="w-4 h-4" />Generate Video (10 credits)</>)}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Add Scene Button */}
          <button onClick={addScene} className="w-full px-6 py-4 bg-white border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-lg flex items-center justify-center gap-2 font-medium text-gray-600 hover:text-indigo-600 transition-colors">
            <Plus className="w-5 h-5" />Tambah Scene
          </button>
        </div>
      )}

      {/* Credits Info */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Credits tersisa: <span className="font-semibold" style={{ color: '#4f46e5' }}>{user?.credits || 0}</span>
        <span className="mx-2">•</span>
        <span>Image: 4 credits | Video: 10 credits</span>
      </div>
    </div>
  );
}
