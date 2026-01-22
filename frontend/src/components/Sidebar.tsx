'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Mic, 
  Wand2, 
  Video, 
  Sparkles,
  User,
  Film,
  Utensils,
  ChevronLeft,
  ChevronRight,
  History,
  Settings
} from 'lucide-react';

const menuItems = [
  {
    title: 'MAIN TOOLS',
    items: [
      { icon: Mic, label: 'Text To Voice', subtitle: 'Gemini TTS', href: '/dashboard/tts' },
      { icon: Video, label: 'Video Scene Creator', subtitle: '4 Scene Otomatis', href: '/dashboard/veo-prompter' },
      { icon: Film, label: 'Veo 3 Story Prompter', subtitle: 'Story dengan Karakter', href: '/dashboard/text-to-video' },
      { icon: Wand2, label: 'Product With Model', subtitle: 'Virtual Photography', href: '/dashboard/image-to-image' },
      { icon: User, label: 'Create Karakter', subtitle: 'Character Design', href: '/dashboard/character' },
      { icon: Utensils, label: 'Food & Drink', subtitle: 'Culinary AI', href: '/dashboard/food' },
      { icon: Sparkles, label: 'Create Animasi', subtitle: 'Juicy Anime', href: '/dashboard/animation' },
    ]
  },
  {
    title: 'AFFILIATE',
    items: [
      { icon: Film, label: 'Affiliate Content', subtitle: '4 Collection Generator', href: '/dashboard/affiliate' },
    ]
  },
  {
    title: 'MY CONTENT',
    items: [
      { icon: History, label: 'Generation History', subtitle: 'View all results', href: '/dashboard/history' },
      { icon: Settings, label: 'Settings', subtitle: 'API Key & Account', href: '/dashboard/settings' },
    ]
  }
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        w-64 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-0 overflow-y-auto z-50 transition-transform duration-300
      `}>
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#4f46e5' }}>
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-gray-900">AI GENERATOR</h1>
            <p className="text-xs text-gray-500">CREATIVE TOOLS</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-4">
        {menuItems.map((section, idx) => (
          <div key={idx} className="mb-6">
            <div className="px-6 mb-3">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {section.title}
              </h2>
            </div>
            <nav>
              {section.items.map((item, itemIdx) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={itemIdx}
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-6 py-3 transition-colors
                      ${isActive 
                        ? 'text-white border-r-4' 
                        : 'text-gray-700'
                      }
                    `}
                    style={isActive ? { backgroundColor: '#4f46e5', borderRightColor: '#4338ca' } : { backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = '#eef2ff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.label}</div>
                      <div className={`text-xs truncate ${isActive ? 'text-indigo-100' : 'text-gray-500'}`}>
                        {item.subtitle}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

    </div>

    {/* Toggle Button - Desktop Only */}
    <button
      onClick={onToggle}
      className={`
        fixed top-32 bg-white border border-gray-300 rounded-full p-2 shadow-lg 
        hover:bg-gray-50 transition-all duration-300 z-[60] hidden lg:flex items-center justify-center
        ${isOpen ? 'left-[252px]' : 'left-4'}
      `}
    >
      {isOpen ? (
        <ChevronLeft className="w-4 h-4 text-gray-600" />
      ) : (
        <ChevronRight className="w-4 h-4 text-gray-600" />
      )}
    </button>
    </>
  );
}
