'use client';

import { useState, useEffect } from 'react';
import { History, Image as ImageIcon, Video, Music, Download, Loader2, Search, Filter, Trash2, Eye, Calendar, CreditCard } from 'lucide-react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';

interface Generation {
  id: string;
  type: string;
  prompt: string | null;
  inputUrl: string | null;
  outputUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata: any;
  createdAt: string;
}

const TYPE_ICONS: Record<string, any> = {
  'text-to-image': ImageIcon,
  'image-to-image': ImageIcon,
  'image-to-video': Video,
  'text-to-video': Video,
  'video-scene': Video,
  'long-video': Video,
  'video-extension': Video,
  'video-interpolation': Video,
  'video-with-references': Video,
  'text-to-speech': Music,
  'character-creation': ImageIcon,
  'food-photography': ImageIcon,
  'product-with-model': ImageIcon,
};

const TYPE_LABELS: Record<string, string> = {
  'text-to-image': 'Text to Image',
  'image-to-image': 'Image to Image',
  'image-to-video': 'Image to Video',
  'text-to-video': 'Text to Video',
  'video-scene': 'Video Scene',
  'long-video': 'Long Video',
  'video-extension': 'Video Extension',
  'video-interpolation': 'Interpolation',
  'video-with-references': 'Video + References',
  'text-to-speech': 'Text to Speech',
  'character-creation': 'Character',
  'food-photography': 'Food Photo',
  'product-with-model': 'Product + Model',
};

export default function HistoryPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [filteredGenerations, setFilteredGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<Generation | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    filterGenerations();
  }, [generations, searchQuery, typeFilter]);

  const fetchHistory = async () => {
    try {
      const response = await axios.get('/generation/history');
      setGenerations(response.data);
    } catch (error: any) {
      toast.error('Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  const filterGenerations = () => {
    let filtered = [...generations];
    
    if (searchQuery) {
      filtered = filtered.filter(g => 
        g.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(g => g.type === typeFilter);
    }
    
    setFilteredGenerations(filtered);
  };

  const downloadFile = (url: string, type: string) => {
    const link = document.createElement('a');
    link.href = url;
    const ext = type.includes('video') ? 'mp4' : type.includes('speech') ? 'wav' : 'png';
    link.download = `generation-${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started!');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUniqueTypes = () => {
    const types = new Set(generations.map(g => g.type));
    return Array.from(types);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'processing': return 'bg-yellow-100 text-yellow-700';
      case 'pending': return 'bg-blue-100 text-blue-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const isVideo = (type: string) => type.includes('video');
  const isAudio = (type: string) => type.includes('speech');

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-600">
            <History className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Generation History</h1>
            <p className="text-sm text-gray-500">View and download your previous generations</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by prompt..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Types</option>
              {getUniqueTypes().map(type => (
                <option key={type} value={type}>{TYPE_LABELS[type] || type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Generations</p>
          <p className="text-2xl font-bold text-gray-900">{generations.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Images</p>
          <p className="text-2xl font-bold text-indigo-600">
            {generations.filter(g => g.type.includes('image') || g.type.includes('character') || g.type.includes('food') || g.type.includes('product')).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Videos</p>
          <p className="text-2xl font-bold text-purple-600">
            {generations.filter(g => g.type.includes('video')).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Audio</p>
          <p className="text-2xl font-bold text-green-600">
            {generations.filter(g => g.type.includes('speech')).length}
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredGenerations.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No generations yet</h3>
          <p className="text-gray-500">Your generated content will appear here</p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && filteredGenerations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredGenerations.map((gen) => {
            const Icon = TYPE_ICONS[gen.type] || ImageIcon;
            return (
              <div
                key={gen.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedItem(gen)}
              >
                {/* Preview */}
                <div className="aspect-square bg-gray-100 relative">
                  {gen.status === 'completed' && gen.outputUrl ? (
                    isVideo(gen.type) ? (
                      <video
                        src={gen.outputUrl}
                        className="w-full h-full object-cover"
                        muted
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                      />
                    ) : isAudio(gen.type) ? (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-400 to-green-600">
                        <Music className="w-16 h-16 text-white" />
                      </div>
                    ) : (
                      <img src={gen.outputUrl} alt={gen.prompt || 'Generated'} className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon className="w-16 h-16 text-gray-300" />
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(gen.status)}`}>
                    {gen.status}
                  </div>
                  
                  {/* Type Badge */}
                  <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/50 text-white text-xs">
                    {TYPE_LABELS[gen.type] || gen.type}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-sm text-gray-900 line-clamp-2 mb-2">
                    {gen.prompt || 'No prompt'}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(gen.createdAt)}
                    </span>
                    {gen.metadata?.creditCost && (
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        {gen.metadata.creditCost} credits
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  {(() => { const Icon = TYPE_ICONS[selectedItem.type] || ImageIcon; return <Icon className="w-5 h-5 text-indigo-600" />; })()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{TYPE_LABELS[selectedItem.type] || selectedItem.type}</h3>
                  <p className="text-sm text-gray-500">{formatDate(selectedItem.createdAt)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Preview */}
              <div className="mb-4 rounded-lg overflow-hidden bg-gray-100">
                {selectedItem.status === 'completed' && selectedItem.outputUrl ? (
                  isVideo(selectedItem.type) ? (
                    <video src={selectedItem.outputUrl} controls className="w-full max-h-96 object-contain" />
                  ) : isAudio(selectedItem.type) ? (
                    <div className="p-8">
                      <audio src={selectedItem.outputUrl} controls className="w-full" />
                    </div>
                  ) : (
                    <img src={selectedItem.outputUrl} alt={selectedItem.prompt || 'Generated'} className="w-full max-h-96 object-contain" />
                  )
                ) : (
                  <div className="h-48 flex items-center justify-center">
                    <p className="text-gray-500">No preview available</p>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Prompt</label>
                  <p className="text-gray-900">{selectedItem.prompt || '-'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <p className={`inline-block px-2 py-1 rounded text-sm ${getStatusColor(selectedItem.status)}`}>
                      {selectedItem.status}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Credit Cost</label>
                    <p className="text-gray-900">{selectedItem.metadata?.creditCost || '-'} credits</p>
                  </div>
                </div>

                {selectedItem.metadata && Object.keys(selectedItem.metadata).length > 1 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Metadata</label>
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(selectedItem.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t flex gap-3">
              {selectedItem.status === 'completed' && selectedItem.outputUrl && (
                <button
                  onClick={() => downloadFile(selectedItem.outputUrl, selectedItem.type)}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              )}
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
