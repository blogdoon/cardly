export interface FontDefinition {
  id: string;
  name: string;
  family: string;
  category: 'Modern Sans' | 'Elegant Serif' | 'Handwritten' | 'Playful' | 'Bold Display';
  previewText?: string;
}

export const AVAILABLE_FONTS: FontDefinition[] = [
  // Modern Sans
  { id: 'inter', name: 'Inter', family: "'Inter', sans-serif", category: 'Modern Sans' },
  { id: 'outfit', name: 'Outfit', family: "'Outfit', sans-serif", category: 'Modern Sans' },
  { id: 'poppins', name: 'Poppins', family: "'Poppins', sans-serif", category: 'Modern Sans' },
  { id: 'montserrat', name: 'Montserrat', family: "'Montserrat', sans-serif", category: 'Modern Sans' },

  // Elegant Serif
  { id: 'playfair', name: 'Playfair Display', family: "'Playfair Display', serif", category: 'Elegant Serif' },
  { id: 'cormorant', name: 'Cormorant Garamond', family: "'Cormorant Garamond', serif", category: 'Elegant Serif' },

  // Handwritten & Script
  { id: 'caveat', name: 'Caveat', family: "'Caveat', cursive", category: 'Handwritten' },
  { id: 'dancing-script', name: 'Dancing Script', family: "'Dancing Script', cursive", category: 'Handwritten' },
  { id: 'great-vibes', name: 'Great Vibes', family: "'Great Vibes', cursive", category: 'Handwritten' },
  { id: 'satisfy', name: 'Satisfy', family: "'Satisfy', cursive", category: 'Handwritten' },
  { id: 'kalam', name: 'Kalam', family: "'Kalam', cursive", category: 'Handwritten' },

  // Playful & Fun
  { id: 'pacifico', name: 'Pacifico', family: "'Pacifico', cursive", category: 'Playful' },
  { id: 'bangers', name: 'Bangers', family: "'Bangers', cursive", category: 'Playful' },

  // Bold Display
  { id: 'oswald', name: 'Oswald', family: "'Oswald', sans-serif", category: 'Bold Display' },
  { id: 'roboto-mono', name: 'Typewriter Mono', family: "'Roboto Mono', monospace", category: 'Bold Display' },
];

export const PRESET_COLORS = [
  '#1e293b', // Deep Slate
  '#0f172a', // Midnight
  '#e11d48', // Berry Rose
  '#f43f5e', // Bright Pink
  '#ec4899', // Fuchsia
  '#8b5cf6', // Violet
  '#6366f1', // Indigo
  '#3b82f6', // Royal Blue
  '#0284c7', // Sky Blue
  '#0d9488', // Emerald Teal
  '#10b981', // Mint Green
  '#eab308', // Warm Gold
  '#f97316', // Vibrant Orange
  '#ef4444', // Warm Red
  '#78350f', // Warm Mocha
  '#ffffff', // Crisp White
];

export const CARD_SIZES = [
  {
    id: 'standard' as const,
    name: 'Standard (A5)',
    dimensions: '148 x 210 mm',
    priceMultiplier: 1.0,
    description: 'Our most popular size, perfect for mantlepieces and envelopes.',
  },
  {
    id: 'large' as const,
    name: 'Large (A4)',
    dimensions: '210 x 297 mm',
    priceMultiplier: 1.35,
    description: 'Make a statement with a generous, display-worthy card.',
  },
  {
    id: 'giant' as const,
    name: 'Giant (A3)',
    dimensions: '297 x 420 mm',
    priceMultiplier: 1.85,
    description: 'Huge wow-factor! Ideal for office group cards & milestones.',
  },
  {
    id: 'postcard' as const,
    name: 'Flat Postcard',
    dimensions: '105 x 148 mm',
    priceMultiplier: 0.75,
    description: 'Sleek single-sheet card with glossy finish.',
  },
];

export const ENVELOPE_COLORS = [
  { id: 'white', name: 'Classic White', hex: '#ffffff', price: 0 },
  { id: 'kraft', name: 'Kraft Brown', hex: '#d7ba89', price: 0 },
  { id: 'blush', name: 'Blush Pink', hex: '#fbcfe8', price: 0.50 },
  { id: 'scarlet', name: 'Scarlet Red', hex: '#f87171', price: 0.50 },
  { id: 'forest', name: 'Forest Green', hex: '#86efac', price: 0.50 },
  { id: 'navy', name: 'Navy Blue', hex: '#38bdf8', price: 0.50 },
  { id: 'gold', name: 'Golden Pearl', hex: '#fde047', price: 0.75 },
];

export const ENVELOPE_CHOICES = [
  { id: 'white' as const, name: 'Crisp White', color: '#ffffff', border: '#e2e8f0', extraPrice: 0 },
  { id: 'kraft' as const, name: 'Rustic Kraft', color: '#d7ba89', border: '#c4a673', extraPrice: 0.40 },
  { id: 'gold' as const, name: 'Shimmering Gold', color: '#f5d061', border: '#e5be49', extraPrice: 0.80 },
  { id: 'blush' as const, name: 'Blush Rose', color: '#ffd1dc', border: '#f7b8c7', extraPrice: 0.50 },
  { id: 'navy' as const, name: 'Royal Navy', color: '#1e293b', border: '#0f172a', extraPrice: 0.50 },
];
