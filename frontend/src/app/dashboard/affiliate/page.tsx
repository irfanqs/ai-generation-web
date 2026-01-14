'use client';

import { useState, useRef } from 'react';
import { Upload, X, Download, Loader2, Eye, RefreshCw, Video, ShoppingBag, Store, Film, Users } from 'lucide-react';
import axios from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const ASPECT_RATIOS = [
  { value: '9:16', label: '9:16 (Story/Reels)' },
  { value: '16:9', label: '16:9 (Landscape)' },
  { value: '1:1', label: '1:1 (Square)' },
];

const LANGUAGES = [
  { value: 'id', label: 'Indonesia' },
  { value: 'en', label: 'English' },
];

const VIDEO_STYLES = [
  { value: 'general', label: 'General (Default/Semula)', icon: '✓' },
  { value: 'hard-selling', label: 'Hard Selling (Promo/Diskon)', icon: '⚡' },
  { value: 'soft-selling', label: 'Soft Selling (Edukasi/Manfaat)', icon: '🌿' },
  { value: 'story-selling', label: 'Story Selling (Cerita/Emosi)', icon: '📖' },
  { value: 'cinematic', label: 'Cinematic (Estetik/Mewah)', icon: '🎬' },
  { value: 'review', label: 'Review/Testimoni (Jujur)', icon: '⭐' },
];

const COLLECTIONS = [
  { id: 'broll', name: 'BROLL', subtitle: 'COLLECTION', icon: Film, description: 'Produk close-up shots' },
  { id: 'store', name: 'STORE MODEL', subtitle: 'COLLECTION', icon: Store, description: 'Model di toko dengan signage' },
  { id: 'commercial', name: 'COMMERCIAL', subtitle: 'COLLECTION', icon: ShoppingBag, description: 'Display produk profesional' },
  { id: 'ugc', name: 'UGC', subtitle: 'COLLECTION', icon: Users, description: 'User-generated content style' },
];

interface GeneratedImage {
  id: string;
  collectionId: string;
  imageUrl: string | null;
  videoStyle: string;
  isGenerating: boolean;
  videoUrl: string | null;
  isGeneratingVideo: boolean;
}

export default function AffiliateContentPage() {
  const { user, updateCredits } = useAuthStore();
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [supportImage, setSupportImage] = useState<File | null>(null);
  const [supportPreview, setSupportPreview] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [modelPreview, setModelPreview] = useState<string | null>(null);
  const [modelClothing, setModelClothing] = useState('');
  const [modelPose, setModelPose] = useState('');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [language, setLanguage] = useState('id');
  const [storeName, setStoreName] = useState('');
  const [accent, setAccent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  
  const productInputRef = useRef<HTMLInputElement>(null);
  const supportInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (type: 'product' | 'support' | 'model', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { toast.error('Ukuran file maksimal 10MB'); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'product') { setProductImage(file); setProductPreview(reader.result as string); }
        else if (type === 'support') { setSupportImage(file); setSupportPreview(reader.result as string); }
        else { setModelImage(file); setModelPreview(reader.result as string); }
      };
      reader.readAsDataURL(file);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const generateContent = async () => {
    if (!productImage) { toast.error('Upload foto produk terlebih dahulu'); return; }
    if (!description.trim()) { toast.error('Masukkan deskripsi produk'); return; }

    const totalCost = 16 * 4; // 16 images x 4 credits
    if ((user?.credits || 0) < totalCost) {
      toast.error(`Credits tidak cukup! Butuh ${totalCost} credits`);
      return;
    }

    setIsGenerating(true);
    const initialImages: GeneratedImage[] = [];
    COLLECTIONS.forEach(col => {
      for (let i = 0; i < 4; i++) {
        initialImages.push({
          id: `${col.id}-${i}`,
          collectionId: col.id,
          imageUrl: null,
          videoStyle: 'general',
          isGenerating: true,
          videoUrl: null,
          isGeneratingVideo: false,
        });
      }
    });
    setGeneratedImages(initialImages);

    try {
      const productBase64 = await fileToBase64(productImage);
      const modelBase64 = modelImage ? await fileToBase64(modelImage) : null;

      for (const collection of COLLECTIONS) {
        const prompts = getCollectionPrompts(collection.id);
        
        for (let i = 0; i < 4; i++) {
          const imageId = `${collection.id}-${i}`;
          try {
            const response = await axios.post('/generation/text-to-image', {
              prompt: prompts[i],
              productReference: productBase64,
              modelReference: modelBase64,
            });

            if (response.data.id) {
              let attempts = 0;
              const maxAttempts = 30;
              const pollInterval = setInterval(async () => {
                attempts++;
                try {
                  const statusRes = await axios.get(`/generation/${response.data.id}`);
                  if (statusRes.data.status === 'completed') {
                    clearInterval(pollInterval);
                    setGeneratedImages(prev => prev.map(img => 
                      img.id === imageId ? { ...img, imageUrl: statusRes.data.outputUrl, isGenerating: false } : img
                    ));
                  } else if (statusRes.data.status === 'failed' || attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    setGeneratedImages(prev => prev.map(img => 
                      img.id === imageId ? { ...img, isGenerating: false } : img
                    ));
                  }
                } catch (e) { console.error('Polling error:', e); }
              }, 2000);
            }
          } catch (error: any) {
            setGeneratedImages(prev => prev.map(img => 
              img.id === imageId ? { ...img, isGenerating: false } : img
            ));
          }
        }
      }

      toast.success('Generating 16 gambar...');
      const userRes = await axios.get('/auth/me');
      updateCredits(userRes.data.credits);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal generate');
    } finally {
      setIsGenerating(false);
    }
  };

  const getCollectionPrompts = (collectionId: string): string[] => {
    const product = description || 'product';
    const store = storeName || 'Premium Store';
    const clothing = modelClothing || 'casual outfit';
    const pose = modelPose || 'holding the product naturally';

    switch (collectionId) {
      case 'broll':
        return [
          `Professional product photography of ${product}. Extreme close-up shot, studio lighting, dark background, dramatic shadows. ${aspectRatio} aspect ratio. High-end commercial style.`,
          `Cinematic B-roll shot of ${product}. Hand reaching for the product, shallow depth of field, warm lighting. ${aspectRatio} aspect ratio. Premium feel.`,
          `Product detail shot of ${product}. Macro photography showing texture and quality, soft lighting. ${aspectRatio} aspect ratio. Luxury brand aesthetic.`,
          `Dynamic product shot of ${product}. Water droplets or steam effect, dramatic lighting, dark moody background. ${aspectRatio} aspect ratio. Commercial advertisement style.`,
        ];
      case 'store':
        return [
          `Professional store photography. Female model wearing ${clothing}, ${pose} with ${product}. Store interior with "${store}" signage on wall. Warm retail lighting. ${aspectRatio} aspect ratio.`,
          `Store scene with male staff and female customer. Staff presenting ${product} to customer. "${store}" wooden signage visible. Modern retail interior. ${aspectRatio} aspect ratio.`,
          `Model in store environment holding ${product}. "${store}" neon sign in background. Shelves with products. Professional retail photography. ${aspectRatio} aspect ratio.`,
          `Customer experience shot. Model examining ${product} in store. "${store}" branding visible. Natural store lighting. ${aspectRatio} aspect ratio.`,
        ];
      case 'commercial':
        return [
          `Commercial product display. Multiple ${product} arranged on modern shelves. Clean minimalist background, professional studio lighting. ${aspectRatio} aspect ratio.`,
          `Premium product showcase. ${product} in glass display case with spotlight. Luxury retail aesthetic. ${aspectRatio} aspect ratio.`,
          `Product lineup shot. Various colors/variants of ${product} on white surface. Clean commercial photography. ${aspectRatio} aspect ratio.`,
          `Hero product shot. Single ${product} on pedestal with dramatic lighting. Premium brand advertisement style. ${aspectRatio} aspect ratio.`,
        ];
      case 'ugc':
        return [
          `UGC style photo. Young woman wearing ${clothing}, pouring drink into ${product}. Morning kitchen scene, warm natural light. Authentic lifestyle feel. ${aspectRatio} aspect ratio.`,
          `Casual lifestyle shot. Person using ${product} while working on laptop. Home office setting, soft natural lighting. Relatable UGC aesthetic. ${aspectRatio} aspect ratio.`,
          `Outdoor lifestyle photo. Model with ${product} in nature/park setting. Golden hour lighting, candid feel. ${aspectRatio} aspect ratio.`,
          `Close-up lifestyle shot. Hands holding ${product}, blurred face in background. Authentic user-generated content style. ${aspectRatio} aspect ratio.`,
        ];
      default:
        return [];
    }
  };

  const updateVideoStyle = (imageId: string, style: string) => {
    setGeneratedImages(prev => prev.map(img => img.id === imageId ? { ...img, videoStyle: style } : img));
  };

  const generateVideoPrompt = async (imageId: string) => {
    const image = generatedImages.find(img => img.id === imageId);
    if (!image || !image.imageUrl) return;

    if ((user?.credits || 0) < 10) {
      toast.error('Credits tidak cukup! Butuh 10 credits');
      return;
    }

    setGeneratedImages(prev => prev.map(img => img.id === imageId ? { ...img, isGeneratingVideo: true } : img));
    const toastId = toast.loading('Generating video...');

    try {
      const imgResponse = await fetch(image.imageUrl);
      const blob = await imgResponse.blob();
      const imageBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });

      const stylePrompt = getVideoStylePrompt(image.videoStyle);
      const response = await axios.post('/veo/image-to-video', {
        imageBase64,
        prompt: stylePrompt,
        aspectRatio,
      });

      if (response.data.success) {
        const videoUrl = `data:video/mp4;base64,${response.data.videoBase64}`;
        setGeneratedImages(prev => prev.map(img => img.id === imageId ? { ...img, videoUrl, isGeneratingVideo: false } : img));
        toast.success('Video berhasil dibuat!', { id: toastId });
        const userRes = await axios.get('/auth/me');
        updateCredits(userRes.data.credits);
      }
    } catch (error: any) {
      setGeneratedImages(prev => prev.map(img => img.id === imageId ? { ...img, isGeneratingVideo: false } : img));
      toast.error('Gagal generate video', { id: toastId });
    }
  };

  const getVideoStylePrompt = (style: string): string => {
    switch (style) {
      case 'hard-selling': return 'Dynamic promotional video. Fast cuts, bold movements, urgency feel. Product showcase with price/discount emphasis.';
      case 'soft-selling': return 'Educational product video. Smooth movements, informative feel. Highlighting benefits and features naturally.';
      case 'story-selling': return 'Emotional storytelling video. Cinematic movements, narrative feel. Creating connection with viewer.';
      case 'cinematic': return 'Luxury cinematic video. Slow motion, dramatic lighting, premium aesthetic. High-end brand feel.';
      case 'review': return 'Authentic review style video. Natural movements, honest feel. Product demonstration and genuine reaction.';
      default: return 'Smooth product video. Natural camera movement, professional lighting. General commercial style.';
    }
  };

  const downloadImage = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#4f46e5' }}>
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Affiliate Content Creator</h1>
            <p className="text-sm text-gray-500">Generate konten produk untuk affiliate marketing</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Panel - Input Form */}
        <div className="space-y-4">
          {/* 1. Product & Photo */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center font-bold">1</span>
              PRODUK & FOTO
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">FOTO PRODUK UTAMA (WAJIB)</label>
                {!productPreview ? (
                  <div onClick={() => productInputRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400 h-32 flex flex-col items-center justify-center">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-xs text-gray-500">Upload foto</p>
                    <input ref={productInputRef} type="file" accept="image/*" onChange={(e) => handleImageSelect('product', e)} className="hidden" />
                  </div>
                ) : (
                  <div className="relative h-32">
                    <img src={productPreview} alt="Product" className="w-full h-full object-cover rounded-lg" />
                    <button onClick={() => { setProductImage(null); setProductPreview(null); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">FOTO PENDUKUNG (OPSIONAL)</label>
                {!supportPreview ? (
                  <div onClick={() => supportInputRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-400 h-20 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <input ref={supportInputRef} type="file" accept="image/*" onChange={(e) => handleImageSelect('support', e)} className="hidden" />
                  </div>
                ) : (
                  <div className="relative h-20">
                    <img src={supportPreview} alt="Support" className="w-full h-full object-cover rounded-lg" />
                    <button onClick={() => { setSupportImage(null); setSupportPreview(null); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Description */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center font-bold">2</span>
              DESKRIPSI & DETAIL
            </h3>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Jelaskan produk dan suasana yang diinginkan..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-500" rows={3} />
          </div>

          {/* 3. Model & Style */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center font-bold">3</span>
              MODEL & GAYA
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">WAJAH MODEL</label>
                <div className="flex gap-2">
                  {!modelPreview ? (
                    <div onClick={() => modelInputRef.current?.click()} className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400">
                      <Upload className="w-4 h-4 text-gray-400" />
                      <span className="text-[10px] text-gray-400 mt-1">WAJAH</span>
                      <span className="text-[10px] text-gray-400">MODEL</span>
                      <input ref={modelInputRef} type="file" accept="image/*" onChange={(e) => handleImageSelect('model', e)} className="hidden" />
                    </div>
                  ) : (
                    <div className="relative w-16 h-16">
                      <img src={modelPreview} alt="Model" className="w-full h-full object-cover rounded-lg" />
                      <button onClick={() => { setModelImage(null); setModelPreview(null); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
              </div>
              <input value={modelClothing} onChange={(e) => setModelClothing(e.target.value)} placeholder="Pakaian Model (Cth: Kaos Polos Hitam)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input value={modelPose} onChange={(e) => setModelPose(e.target.value)} placeholder="Pose (Cth: Memegang produk di sebelah pipi)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>

          {/* 4. Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center font-bold">4</span>
              PENGATURAN
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">RASIO</label>
                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {ASPECT_RATIOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">BAHASA</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">NAMA TOKO (SIGNAGE)</label>
                <input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Contoh: Toko Berkah" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">AKSEN (JAWA/JAKSEL)</label>
                <input value={accent} onChange={(e) => setAccent(e.target.value)} placeholder="Opsional" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button onClick={generateContent} disabled={isGenerating || !productImage || !description.trim()} className="w-full disabled:bg-gray-300 text-white font-semibold py-4 rounded-lg flex items-center justify-center gap-2" style={{ backgroundColor: isGenerating || !productImage || !description.trim() ? undefined : '#4f46e5' }}>
            {isGenerating ? (<><Loader2 className="w-5 h-5 animate-spin" />GENERATING...</>) : 'GENERATE KONTEN SEKARANG'}
          </button>
          <p className="text-xs text-center text-gray-500">16 gambar × 4 credits = 64 credits total</p>
        </div>

        {/* Right Panel - Results */}
        <div className="lg:col-span-2 space-y-6">
          {generatedImages.length > 0 ? (
            COLLECTIONS.map(collection => {
              const collectionImages = generatedImages.filter(img => img.collectionId === collection.id);
              const Icon = collection.icon;
              
              return (
                <div key={collection.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Icon className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-gray-900">{collection.name}</h3>
                    <span className="text-xs text-gray-400">{collection.subtitle}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {collectionImages.map((img) => (
                      <div key={img.id} className="space-y-2">
                        {/* Image */}
                        <div className="relative aspect-[9/16] bg-gray-100 rounded-lg overflow-hidden group">
                          {img.imageUrl ? (
                            <>
                              <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                <button onClick={() => window.open(img.imageUrl!, '_blank')} className="p-2 bg-white rounded-full"><Eye className="w-4 h-4" /></button>
                                <button onClick={() => downloadImage(img.imageUrl!, `${collection.id}`)} className="p-2 bg-white rounded-full"><Download className="w-4 h-4" /></button>
                                <button className="p-2 bg-white rounded-full"><RefreshCw className="w-4 h-4" /></button>
                              </div>
                            </>
                          ) : img.isGenerating ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
                          )}
                        </div>

                        {/* Video Style Selector */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">PILIH GAYA VIDEO:</label>
                          <select value={img.videoStyle} onChange={(e) => updateVideoStyle(img.id, e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs">
                            {VIDEO_STYLES.map(s => <option key={s.value} value={s.value}>{s.icon} {s.label}</option>)}
                          </select>
                        </div>

                        {/* Video Button */}
                        {img.videoUrl ? (
                          <div className="space-y-2">
                            <video src={img.videoUrl} controls className="w-full rounded-lg" />
                            <button onClick={() => downloadImage(img.videoUrl!, `video-${collection.id}`)} className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-xs font-medium flex items-center justify-center gap-1">
                              <Download className="w-3 h-3" />Download Video
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => generateVideoPrompt(img.id)} disabled={!img.imageUrl || img.isGeneratingVideo} className="w-full px-3 py-2 border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 rounded text-xs font-medium flex items-center justify-center gap-1">
                            {img.isGeneratingVideo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Video className="w-3 h-3" />}
                            BUAT VIDEO PROMPT
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Konten</h3>
              <p className="text-gray-500 text-sm">Upload foto produk dan generate untuk melihat hasil</p>
            </div>
          )}
        </div>
      </div>

      {/* Credits Info */}
      <div className="text-center text-sm text-gray-500">
        Credits tersisa: <span className="font-semibold" style={{ color: '#4f46e5' }}>{user?.credits || 0}</span>
        <span className="mx-2">•</span>
        <span>Image: 4 credits | Video: 10 credits</span>
      </div>
    </div>
  );
}
