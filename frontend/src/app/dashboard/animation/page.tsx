'use client';

import { useState, useRef } from 'react';
import { 
  Film, Upload, Sparkles, Lock, Play, ChevronDown, ChevronUp,
  User, MapPin, Zap, MessageSquare, Video, Loader2, Plus, Trash2,
  Square, Smartphone, Monitor
} from 'lucide-react';
import axios from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface CharacterDNA {
  visualDNA: string;
  topClothing: string;
  bottomClothing: string;
}

interface Scene {
  id: number;
  character: string;
  environment: string[];
  actionFlow: string[];
  dialogue: { voiceType: string; text: string; };
  previewUrl: string | null;
  isGeneratingPreview: boolean;
  videoUrl: string | null;
  isGeneratingVideo: boolean;
}

const ART_STYLES = [
  { id: '3d-pixar', name: '3D Disney Pixar Style', desc: 'Cute, vibrant, expressive' },
  { id: 'ghibli', name: 'Japanese Anime (Ghibli)', desc: '2D, hand-drawn, soft colors' },
  { id: '3d-realistic', name: '3D Realistic Cinematic', desc: 'Hyper-realistic, dramatic' },
  { id: 'claymation', name: 'Claymation (Stop Motion)', desc: 'Plasticine texture, handmade' },
  { id: 'low-poly', name: 'Low Poly 3D', desc: 'Minimalist, geometric' },
  { id: 'watercolor', name: 'Watercolor Animation', desc: 'Soft edges, painterly' },
];

const ASPECT_RATIOS = [
  { id: 'landscape', name: 'Landscape', subtitle: 'YOUTUBE', icon: Monitor },
  { id: 'portrait', name: 'Portrait', subtitle: 'TIKTOK/REELS', icon: Smartphone },
  { id: 'square', name: 'Square', subtitle: 'FEED', icon: Square },
];

export default function AnimationPage() {
  const { user, updateCredits } = useAuthStore();
  const [characterImage, setCharacterImage] = useState<string | null>(null);
  const [characterImageBase64, setCharacterImageBase64] = useState<string | null>(null);
  const [storyTitle, setStoryTitle] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [aspectRatio, setAspectRatio] = useState('landscape');
  const [artStyle, setArtStyle] = useState('3d-pixar');
  const [isScanning, setIsScanning] = useState(false);
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);
  const [characterDNA, setCharacterDNA] = useState<CharacterDNA | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [showBlueprint, setShowBlueprint] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Ukuran file maksimal 10MB'); return; }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageUrl = event.target?.result as string;
      setCharacterImage(imageUrl);
      const base64 = imageUrl.split(',')[1];
      setCharacterImageBase64(base64);
      
      setIsScanning(true);
      const toastId = toast.loading('Scanning character DNA...');
      try {
        const response = await axios.post('/animation/scan-dna', { imageBase64: base64 });
        if (response.data.success) {
          setCharacterDNA(response.data.characterDNA);
          toast.success('Character DNA scanned!', { id: toastId });
          const userRes = await axios.get('/auth/me');
          updateCredits(userRes.data.credits);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to scan DNA', { id: toastId });
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateBlueprint = async () => {
    if (!characterImageBase64 || !storyTitle || !characterName || !characterDNA) {
      toast.error('Please complete all fields'); return;
    }
    setIsGeneratingBlueprint(true);
    const toastId = toast.loading('Generating story scenes...');
    try {
      const response = await axios.post('/animation/generate-scenes', { storyTitle, characterName, characterDNA, artStyle, sceneCount: 4 });
      if (response.data.success) {
        const scenesWithState: Scene[] = response.data.scenes.map((s: any) => ({
          ...s, previewUrl: null, isGeneratingPreview: false, videoUrl: null, isGeneratingVideo: false,
        }));
        setScenes(scenesWithState);
        setShowBlueprint(false);
        toast.success(`Generated ${scenesWithState.length} scenes!`, { id: toastId });
        const userRes = await axios.get('/auth/me');
        updateCredits(userRes.data.credits);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate scenes', { id: toastId });
    } finally {
      setIsGeneratingBlueprint(false);
    }
  };

  const handleGeneratePreview = async (sceneId: number) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene || !characterDNA || !characterImageBase64) return;
    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, isGeneratingPreview: true } : s));
    const toastId = toast.loading(`Generating preview for Scene ${sceneId}...`);
    try {
      const response = await axios.post('/animation/generate-preview', { scene, characterDNA, characterImageBase64, artStyle, aspectRatio });
      if (response.data.success) {
        setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, previewUrl: response.data.previewUrl, isGeneratingPreview: false } : s));
        toast.success('Preview generated!', { id: toastId });
        const userRes = await axios.get('/auth/me');
        updateCredits(userRes.data.credits);
      }
    } catch (error: any) {
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, isGeneratingPreview: false } : s));
      toast.error(error.response?.data?.message || 'Failed to generate preview', { id: toastId });
    }
  };

  const handleGenerateVideo = async (sceneId: number) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene || !scene.previewUrl) { toast.error('Generate preview first'); return; }
    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, isGeneratingVideo: true } : s));
    const toastId = toast.loading(`Generating video for Scene ${sceneId}...`);
    try {
      const response = await axios.post('/animation/generate-video', { imageUrl: scene.previewUrl, scene, artStyle });
      if (response.data.success) {
        setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, videoUrl: response.data.videoUrl, isGeneratingVideo: false } : s));
        toast.success('Video generated!', { id: toastId });
        const userRes = await axios.get('/auth/me');
        updateCredits(userRes.data.credits);
      }
    } catch (error: any) {
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, isGeneratingVideo: false } : s));
      toast.error(error.response?.data?.message || 'Failed to generate video', { id: toastId });
    }
  };

  const handleAddScene = () => {
    const newScene: Scene = {
      id: scenes.length + 1, character: characterDNA ? `${characterDNA.topClothing}\n${characterDNA.bottomClothing}` : '',
      environment: ['', ''], actionFlow: ['', '', ''], dialogue: { voiceType: 'Female, Neutral, Medium', text: '' },
      previewUrl: null, isGeneratingPreview: false, videoUrl: null, isGeneratingVideo: false,
    };
    setScenes([...scenes, newScene]);
  };

  const handleDeleteScene = (sceneId: number) => setScenes(prev => prev.filter(s => s.id !== sceneId));
  const updateScene = (sceneId: number, field: string, value: any) => setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, [field]: value } : s));

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-600">
            <Film className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Animation Creator</h1>
            <p className="text-sm text-gray-500">Create animated stories with AI-powered scene generation</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-50 rounded-lg w-fit">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span className="text-sm text-indigo-700">Credits: <span className="font-semibold">{user?.credits || 0}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Setup */}
        <div className="space-y-4">
          {/* Character Upload */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center font-bold">1</span>
              CHARACTER IMAGE
            </h3>
            {!characterImage ? (
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-400 transition-colors">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 font-medium">Upload character image</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <img src={characterImage} alt="Character" className="w-full h-48 object-cover rounded-lg" />
                  {isScanning && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
                {characterDNA && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Lock className="w-3 h-3" />
                      <span>CHARACTER DNA (AI Analysis)</span>
                    </div>
                    <p className="text-xs text-gray-700">{characterDNA.visualDNA}</p>
                    <div className="flex gap-2 text-xs">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded">{characterDNA.topClothing}</span>
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded">{characterDNA.bottomClothing}</span>
                    </div>
                  </div>
                )}
                <button onClick={() => { setCharacterImage(null); setCharacterDNA(null); }} className="text-xs text-red-500 hover:text-red-700">Remove image</button>
              </div>
            )}
          </div>

          {/* Story Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center font-bold">2</span>
              STORY DETAILS
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">STORY TITLE</label>
                <input value={storyTitle} onChange={(e) => setStoryTitle(e.target.value)} placeholder="e.g., A Day at the Beach" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">CHARACTER NAME</label>
                <input value={characterName} onChange={(e) => setCharacterName(e.target.value)} placeholder="e.g., Luna" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
            </div>
          </div>

          {/* Art Style */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center font-bold">3</span>
              ART STYLE
            </h3>
            <div className="space-y-2">
              {ART_STYLES.map(style => (
                <button key={style.id} onClick={() => setArtStyle(style.id)} className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${artStyle === style.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <p className="text-sm font-medium text-gray-900">{style.name}</p>
                  <p className="text-xs text-gray-500">{style.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center font-bold">4</span>
              ASPECT RATIO
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {ASPECT_RATIOS.map(ratio => {
                const Icon = ratio.icon;
                return (
                  <button key={ratio.id} onClick={() => setAspectRatio(ratio.id)} className={`p-3 rounded-lg border text-center transition-colors ${aspectRatio === ratio.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <Icon className={`w-5 h-5 mx-auto mb-1 ${aspectRatio === ratio.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <p className="text-xs font-medium text-gray-900">{ratio.name}</p>
                    <p className="text-[10px] text-gray-500">{ratio.subtitle}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generate Button */}
          <button onClick={handleGenerateBlueprint} disabled={isGeneratingBlueprint || !characterDNA || !storyTitle || !characterName} className="w-full bg-indigo-600 disabled:bg-gray-300 text-white font-semibold py-4 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors">
            {isGeneratingBlueprint ? (<><Loader2 className="w-5 h-5 animate-spin" />GENERATING SCENES...</>) : (<><Sparkles className="w-5 h-5" />GENERATE STORY BLUEPRINT</>)}
          </button>
        </div>

        {/* Right Panel - Scenes */}
        <div className="lg:col-span-2 space-y-4">
          {scenes.length > 0 ? (
            <>
              {/* Blueprint Toggle */}
              <button onClick={() => setShowBlueprint(!showBlueprint)} className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-600" />
                  <span className="font-semibold text-gray-900">Story Blueprint</span>
                  <span className="text-xs text-gray-500">({scenes.length} scenes)</span>
                </div>
                {showBlueprint ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>

              {/* Scenes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scenes.map(scene => (
                  <SceneCard key={scene.id} scene={scene} onGeneratePreview={handleGeneratePreview} onGenerateVideo={handleGenerateVideo} onDelete={handleDeleteScene} onUpdate={updateScene} />
                ))}
              </div>

              {/* Add Scene Button */}
              <button onClick={handleAddScene} className="w-full bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-4 flex items-center justify-center gap-2 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                <Plus className="w-5 h-5" />
                <span className="font-medium">Add New Scene</span>
              </button>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Film className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Scenes Yet</h3>
              <p className="text-gray-500 text-sm">Upload a character image and generate your story blueprint to see scenes here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Scene Card Component
function SceneCard({ scene, onGeneratePreview, onGenerateVideo, onDelete, onUpdate }: {
  scene: Scene;
  onGeneratePreview: (id: number) => void;
  onGenerateVideo: (id: number) => void;
  onDelete: (id: number) => void;
  onUpdate: (id: number, field: string, value: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Scene Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 text-sm flex items-center justify-center font-bold">{scene.id}</span>
            <span className="font-semibold text-gray-900">Scene {scene.id}</span>
          </div>
          <button onClick={() => onDelete(scene.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview/Video Area */}
      <div className="aspect-video bg-gray-100 relative">
        {scene.videoUrl ? (
          <video src={scene.videoUrl} controls className="w-full h-full object-cover" />
        ) : scene.previewUrl ? (
          <img src={scene.previewUrl} alt={`Scene ${scene.id}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {scene.isGeneratingPreview ? (
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            ) : (
              <div className="text-center">
                <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No preview yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scene Details */}
      <div className="p-4 space-y-3">
        {/* Environment */}
        <div>
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <MapPin className="w-3 h-3" />
            <span>ENVIRONMENT</span>
          </div>
          <p className="text-sm text-gray-700">{scene.environment.filter(e => e).join(', ') || 'Not set'}</p>
        </div>

        {/* Action Flow */}
        <div>
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <Zap className="w-3 h-3" />
            <span>ACTION FLOW</span>
          </div>
          <div className="space-y-1">
            {scene.actionFlow.filter(a => a).map((action, i) => (
              <p key={i} className="text-sm text-gray-700">• {action}</p>
            ))}
          </div>
        </div>

        {/* Dialogue */}
        {scene.dialogue.text && (
          <div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <MessageSquare className="w-3 h-3" />
              <span>DIALOGUE</span>
            </div>
            <p className="text-sm text-gray-700 italic">"{scene.dialogue.text}"</p>
            <p className="text-xs text-gray-400">{scene.dialogue.voiceType}</p>
          </div>
        )}

        {/* Expand/Collapse */}
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Hide details' : 'Edit details'}
        </button>

        {expanded && (
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Character Description</label>
              <textarea value={scene.character} onChange={(e) => onUpdate(scene.id, 'character', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" rows={2} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Environment (comma separated)</label>
              <input value={scene.environment.join(', ')} onChange={(e) => onUpdate(scene.id, 'environment', e.target.value.split(',').map(s => s.trim()))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Dialogue Text</label>
              <input value={scene.dialogue.text} onChange={(e) => onUpdate(scene.id, 'dialogue', { ...scene.dialogue, text: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button onClick={() => onGeneratePreview(scene.id)} disabled={scene.isGeneratingPreview} className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors">
            {scene.isGeneratingPreview ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Preview
          </button>
          <button onClick={() => onGenerateVideo(scene.id)} disabled={!scene.previewUrl || scene.isGeneratingVideo} className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors">
            {scene.isGeneratingVideo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Video className="w-3 h-3" />}
            Video
          </button>
        </div>
      </div>
    </div>
  );
}
