export const translations = {
  en: {
    // Navbar
    features: 'Features',
    pricing: 'Pricing',
    login: 'Login',
    getStarted: 'Get Started',
    
    // Hero
    heroTitle: 'Create Amazing Content with AI',
    heroSubtitle: 'Generate stunning images, videos, and audio using the power of Google Gemini AI. Fast, easy, and professional results.',
    startFree: 'Start Free',
    viewPricing: 'View Pricing',
    
    // Features
    featuresTitle: 'Powerful AI Generation Tools',
    featuresSubtitle: 'Everything you need to create professional content',
    featureTextToImage: 'Text to Image',
    featureTextToImageDesc: 'Generate stunning images from text descriptions using advanced AI models.',
    featureImageToImage: 'Image to Image',
    featureImageToImageDesc: 'Transform and edit existing images with AI-powered modifications.',
    featureTextToVideo: 'Text to Video',
    featureTextToVideoDesc: 'Create dynamic videos from text descriptions using Google Veo AI.',
    featureTextToSpeech: 'Text to Speech',
    featureTextToSpeechDesc: 'Convert text into natural-sounding speech with AI voices.',
    
    // Pricing
    pricingTitle: 'Simple, Transparent Pricing',
    pricingSubtitle: 'Choose the plan that fits your needs',
    free: 'Free',
    freePrice: 'Free',
    pro: 'Pro',
    proPrice: 'Rp 100,000',
    perMonth: '/month',
    credits: 'credits',
    mostPopular: 'Most Popular',
    
    // Free plan features
    freeCredits: '50 generation credits',
    textToImage: 'Text to Image',
    textToVideoLimited: 'Text to Video (limited)',
    standardQuality: 'Standard quality',
    communitySupport: 'Community support',
    
    // Pro plan features
    proCredits: '500 generation credits',
    allGenerationTypes: 'All generation types',
    textToSpeech: 'Text to Speech (TTS)',
    hdQuality: 'HD & 4K quality output',
    priorityProcessing: 'Priority processing',
    emailSupport: 'Email support',
    commercialLicense: 'Commercial license',
    
    // Auth
    signIn: 'Sign In',
    signUp: 'Sign Up',
    email: 'Email',
    password: 'Password',
    name: 'Full Name',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    registerHere: 'Register here',
    loginHere: 'Login here',
  },
  id: {
    // Navbar
    features: 'Fitur',
    pricing: 'Harga',
    login: 'Masuk',
    getStarted: 'Mulai Sekarang',
    
    // Hero
    heroTitle: 'Buat Konten Menakjubkan dengan AI',
    heroSubtitle: 'Hasilkan gambar, video, dan audio yang memukau menggunakan kekuatan Google Gemini AI. Cepat, mudah, dan hasil profesional.',
    startFree: 'Mulai Gratis',
    viewPricing: 'Lihat Harga',
    
    // Features
    featuresTitle: 'Tools AI Generation yang Powerful',
    featuresSubtitle: 'Semua yang kamu butuhkan untuk membuat konten profesional',
    featureTextToImage: 'Text to Image',
    featureTextToImageDesc: 'Hasilkan gambar menakjubkan dari deskripsi teks menggunakan model AI canggih.',
    featureImageToImage: 'Image to Image',
    featureImageToImageDesc: 'Transformasi dan edit gambar yang ada dengan modifikasi bertenaga AI.',
    featureTextToVideo: 'Text to Video',
    featureTextToVideoDesc: 'Buat video dinamis dari deskripsi teks menggunakan Google Veo AI.',
    featureTextToSpeech: 'Text to Speech',
    featureTextToSpeechDesc: 'Ubah teks menjadi suara yang natural dengan suara AI.',
    
    // Pricing
    pricingTitle: 'Harga Sederhana & Transparan',
    pricingSubtitle: 'Pilih paket yang sesuai kebutuhanmu',
    free: 'Gratis',
    freePrice: 'Gratis',
    pro: 'Pro',
    proPrice: 'Rp 100.000',
    perMonth: '/bulan',
    credits: 'kredit',
    mostPopular: 'Paling Populer',
    
    // Free plan features
    freeCredits: '50 kredit generasi',
    textToImage: 'Text to Image',
    textToVideoLimited: 'Text to Video (terbatas)',
    standardQuality: 'Kualitas standar',
    communitySupport: 'Dukungan komunitas',
    
    // Pro plan features
    proCredits: '500 kredit generasi',
    allGenerationTypes: 'Semua tipe generasi',
    textToSpeech: 'Text to Speech (TTS)',
    hdQuality: 'Output kualitas HD & 4K',
    priorityProcessing: 'Pemrosesan prioritas',
    emailSupport: 'Dukungan email',
    commercialLicense: 'Lisensi komersial',
    
    // Auth
    signIn: 'Masuk',
    signUp: 'Daftar',
    email: 'Email',
    password: 'Kata Sandi',
    name: 'Nama Lengkap',
    noAccount: 'Belum punya akun?',
    hasAccount: 'Sudah punya akun?',
    registerHere: 'Daftar di sini',
    loginHere: 'Masuk di sini',
  },
};

export type Language = 'en' | 'id';
export type TranslationKey = keyof typeof translations.en;
