/**
 * Credit Cost Configuration
 * 
 * Sistem kredit berdasarkan estimasi cost API Gemini dan kompleksitas fitur.
 * 
 * Referensi Gemini API Pricing (per 1000 requests atau per output):
 * - Text-to-Image (Imagen 3): ~$0.04 per image
 * - Image-to-Image: ~$0.04 per image
 * - Image-to-Video (Veo): ~$0.10 per video (5-10s)
 * - Text-to-Speech: ~$0.016 per 1M characters (~$0.000016 per 1000 chars)
 * 
 * BATCH API: 50% cheaper than standard API!
 * 
 * Konversi ke Credits (1 Credit = $0.01):
 * - Kita set margin ~2-3x untuk cover operational cost
 */

export const CREDIT_COSTS = {
  // Text to Image - Imagen 3
  'text-to-image': {
    base: 4, // 4 credits per image (~$0.04)
    description: 'Generate image dari text prompt',
  },

  // Image to Image - Imagen 3 Edit
  'image-to-image': {
    base: 4, // 4 credits per image
    description: 'Transform atau edit image',
  },

  // Image to Video - Veo 3
  'image-to-video': {
    base: 10, // 10 credits per video (~$0.10)
    multiplier: {
      '5s': 1,    // 10 credits untuk 5 detik
      '10s': 1.5, // 15 credits untuk 10 detik
      '15s': 2,   // 20 credits untuk 15 detik
    },
    description: 'Generate video dari image',
  },

  // Text to Video - Veo 3
  'text-to-video': {
    base: 12, // 12 credits per video (lebih mahal karena generate dari scratch)
    multiplier: {
      '5s': 1,
      '10s': 1.5,
      '15s': 2,
    },
    description: 'Generate video dari text prompt',
  },

  // Text to Speech - Gemini TTS
  'text-to-speech': {
    base: 1, // 1 credit per request (murah, tapi tetap ada cost)
    multiplier: {
      perThousandChars: 0.5, // +0.5 credit per 1000 characters
    },
    description: 'Convert text ke audio',
  },

  // Character Creation (Multiple poses)
  'character-creation': {
    base: 4, // 4 credits per pose
    description: 'Generate character dengan pose',
  },

  // Food Photography (Multiple styles)
  'food-photography': {
    base: 4, // 4 credits per style
    description: 'Generate food photography',
  },

  // Product with Model (Multiple poses)
  'product-with-model': {
    base: 5, // 5 credits per pose (lebih kompleks, ada product + model)
    description: 'Generate product dengan model',
  },

  // Video Scene Creator (Veo Prompter)
  'video-scene': {
    base: 10, // 10 credits per scene
    description: 'Generate video scene',
  },

  // Video with Reference Images (Veo 3.1)
  'video-with-references': {
    base: 15, // 15 credits (more complex, uses reference images)
    description: 'Generate video dengan reference images untuk konsistensi',
  },

  // Video Interpolation (Veo 3.1)
  'video-interpolation': {
    base: 12, // 12 credits
    description: 'Generate video dari first dan last frame',
  },

  // Video Extension (Veo 3.1)
  'video-extension': {
    base: 8, // 8 credits per extension (~7 seconds)
    description: 'Extend video (+7 detik)',
  },

  // Long Video (Google Flow-like)
  'long-video': {
    base: 12, // Initial video cost
    extensionCost: 8, // Per extension
    description: 'Generate video panjang (up to 148 detik)',
  },

  // ============ BATCH API COSTS (50% CHEAPER!) ============
  
  // Batch Character Creation
  'batch-character': {
    base: 2, // 50% off from 4 credits
    description: 'Batch generate character (50% lebih murah)',
    isBatch: true,
  },

  // Batch Food Photography
  'batch-food': {
    base: 2, // 50% off from 4 credits
    description: 'Batch generate food photography (50% lebih murah)',
    isBatch: true,
  },

  // Batch Product with Model
  'batch-product': {
    base: 2.5, // 50% off from 5 credits
    description: 'Batch generate product dengan model (50% lebih murah)',
    isBatch: true,
  },

  // Batch Text to Image
  'batch-text-to-image': {
    base: 2, // 50% off from 4 credits
    description: 'Batch generate images (50% lebih murah)',
    isBatch: true,
  },
};

/**
 * Calculate credit cost untuk generation
 */
export function calculateCreditCost(
  type: string,
  options?: {
    duration?: string;
    textLength?: number;
    count?: number;
  }
): number {
  const config = CREDIT_COSTS[type];
  
  if (!config) {
    // Default fallback
    return 1;
  }

  let cost = config.base;

  // Apply multipliers based on type
  if (type === 'image-to-video' || type === 'text-to-video') {
    if (options?.duration && config.multiplier) {
      const multiplier = config.multiplier[options.duration] || 1;
      cost = Math.ceil(config.base * multiplier);
    }
  }

  if (type === 'text-to-speech') {
    if (options?.textLength && config.multiplier) {
      const thousandChars = Math.ceil(options.textLength / 1000);
      const extraCost = thousandChars * config.multiplier.perThousandChars;
      cost = Math.ceil(config.base + extraCost);
    }
  }

  // Apply count multiplier (for batch operations)
  if (options?.count && options.count > 1) {
    cost = cost * options.count;
  }

  return cost;
}

/**
 * Get credit cost info untuk display di UI
 */
export function getCreditCostInfo(type: string): {
  base: number;
  description: string;
  details?: string;
} {
  const config = CREDIT_COSTS[type];
  
  if (!config) {
    return {
      base: 1,
      description: 'AI Generation',
    };
  }

  let details = '';

  if (type === 'image-to-video' || type === 'text-to-video') {
    details = '5s: ' + config.base + ' credits, 10s: ' + Math.ceil(config.base * 1.5) + ' credits, 15s: ' + Math.ceil(config.base * 2) + ' credits';
  }

  if (type === 'text-to-speech') {
    details = 'Base: ' + config.base + ' credit + 0.5 per 1000 characters';
  }

  return {
    base: config.base,
    description: config.description,
    details,
  };
}

/**
 * Pricing tiers untuk user purchase
 */
export const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 100,
    price: 10, // $10
    pricePerCredit: 0.10,
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    credits: 500,
    price: 40, // $40 (20% discount)
    pricePerCredit: 0.08,
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    credits: 1000,
    price: 70, // $70 (30% discount)
    pricePerCredit: 0.07,
    popular: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    credits: 5000,
    price: 300, // $300 (40% discount)
    pricePerCredit: 0.06,
    popular: false,
  },
];
