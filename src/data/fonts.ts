export interface FontDefinition {
  id: string;
  name: string;
  family: string;
  category: 'Modern Sans' | 'Elegant Serif' | 'Handwritten' | 'Playful' | 'Bold Display';
  previewText?: string;
  description?: string;
  styleTag?: string;
}

export const AVAILABLE_FONTS: FontDefinition[] = [
  // Elegant Serif
  {
    id: 'playfair',
    name: 'Playfair Display',
    family: "'Playfair Display', serif",
    category: 'Elegant Serif',
    description: 'High-contrast editorial serif, classic & timeless',
    styleTag: 'Editorial'
  },
  {
    id: 'cormorant',
    name: 'Cormorant Garamond',
    family: "'Cormorant Garamond', serif",
    category: 'Elegant Serif',
    description: 'Regal French Renaissance serif for poetry & vows',
    styleTag: 'Regal'
  },
  {
    id: 'cinzel',
    name: 'Cinzel',
    family: "'Cinzel', serif",
    category: 'Elegant Serif',
    description: 'Classical Roman luxury monument serif',
    styleTag: 'Luxury'
  },
  {
    id: 'cinzel-decorative',
    name: 'Cinzel Decorative',
    family: "'Cinzel Decorative', serif",
    category: 'Elegant Serif',
    description: 'Majestic ornate flourishes for milestones & weddings',
    styleTag: 'Ornate'
  },
  {
    id: 'prata',
    name: 'Prata',
    family: "'Prata', serif",
    category: 'Elegant Serif',
    description: 'Didone luxury serif with teardrop terminals',
    styleTag: 'Haute'
  },
  {
    id: 'lora',
    name: 'Lora',
    family: "'Lora', serif",
    category: 'Elegant Serif',
    description: 'Calligraphic contemporary serif with brushed curves',
    styleTag: 'Warm Serif'
  },
  {
    id: 'merriweather',
    name: 'Merriweather',
    family: "'Merriweather', serif",
    category: 'Elegant Serif',
    description: 'Sturdy, highly readable literary serif',
    styleTag: 'Literary'
  },
  {
    id: 'eb-garamond',
    name: 'EB Garamond',
    family: "'EB Garamond', serif",
    category: 'Elegant Serif',
    description: 'Vintage Renaissance book serif, academic & cultured',
    styleTag: 'Vintage'
  },
  {
    id: 'castoro',
    name: 'Castoro',
    family: "'Castoro', serif",
    category: 'Elegant Serif',
    description: 'Warm humanist Italian renaissance serif',
    styleTag: 'Humanist'
  },
  {
    id: 'marcellus',
    name: 'Marcellus',
    family: "'Marcellus', serif",
    category: 'Elegant Serif',
    description: 'Roman flare-serif with refined grandeur',
    styleTag: 'Refined'
  },

  // Modern Sans
  {
    id: 'plus-jakarta-sans',
    name: 'Plus Jakarta Sans',
    family: "'Plus Jakarta Sans', sans-serif",
    category: 'Modern Sans',
    description: 'Crisp geometric grotesque, modern luxury stationery',
    styleTag: 'Luxury Sans'
  },
  {
    id: 'outfit',
    name: 'Outfit',
    family: "'Outfit', sans-serif",
    category: 'Modern Sans',
    description: 'Contemporary geometric display with friendly rhythm',
    styleTag: 'Modern'
  },
  {
    id: 'inter',
    name: 'Inter',
    family: "'Inter', sans-serif",
    category: 'Modern Sans',
    description: 'Clean, hyper-legible neutral sans',
    styleTag: 'Neutral'
  },
  {
    id: 'poppins',
    name: 'Poppins',
    family: "'Poppins', sans-serif",
    category: 'Modern Sans',
    description: 'Balanced geometric rounded sans, warm & inviting',
    styleTag: 'Geometric'
  },
  {
    id: 'montserrat',
    name: 'Montserrat',
    family: "'Montserrat', sans-serif",
    category: 'Modern Sans',
    description: 'Architectural urban geometric sans with bold presence',
    styleTag: 'Architectural'
  },
  {
    id: 'dm-sans',
    name: 'DM Sans',
    family: "'DM Sans', sans-serif",
    category: 'Modern Sans',
    description: 'Warm, low-contrast contemporary geometric sans',
    styleTag: 'Contemporary'
  },
  {
    id: 'raleway',
    name: 'Raleway',
    family: "'Raleway', sans-serif",
    category: 'Modern Sans',
    description: 'Art-deco inspired elegant sans with delicate curves',
    styleTag: 'Art Deco'
  },
  {
    id: 'nunito',
    name: 'Nunito',
    family: "'Nunito', sans-serif",
    category: 'Modern Sans',
    description: 'Soft rounded corners, cozy & friendly aesthetic',
    styleTag: 'Rounded'
  },
  {
    id: 'josefin-sans',
    name: 'Josefin Sans',
    family: "'Josefin Sans', sans-serif",
    category: 'Modern Sans',
    description: 'Vintage 1930s geometric Scandinavian feel',
    styleTag: 'Retro Sans'
  },
  {
    id: 'work-sans',
    name: 'Work Sans',
    family: "'Work Sans', sans-serif",
    category: 'Modern Sans',
    description: 'Clean, balanced grotesque sans for card captions',
    styleTag: 'Balanced'
  },
  {
    id: 'quicksand',
    name: 'Quicksand',
    family: "'Quicksand', sans-serif",
    category: 'Modern Sans',
    description: 'Soft rounded geometric sans, gentle & sweet',
    styleTag: 'Soft'
  },

  // Handwritten & Script
  {
    id: 'alex-brush',
    name: 'Alex Brush',
    family: "'Alex Brush', cursive",
    category: 'Handwritten',
    description: 'Flowing classical copperplate calligraphy for weddings',
    styleTag: 'Calligraphy'
  },
  {
    id: 'caveat',
    name: 'Caveat',
    family: "'Caveat', cursive",
    category: 'Handwritten',
    description: 'Playful, lively brush handwriting with personal warmth',
    styleTag: 'Warm Brush'
  },
  {
    id: 'dancing-script',
    name: 'Dancing Script',
    family: "'Dancing Script', cursive",
    category: 'Handwritten',
    description: 'Bouncy, spontaneous script with joyful energy',
    styleTag: 'Bouncy'
  },
  {
    id: 'great-vibes',
    name: 'Great Vibes',
    family: "'Great Vibes', cursive",
    category: 'Handwritten',
    description: 'Graceful looping luxury script with dramatic swashes',
    styleTag: 'Flourished'
  },
  {
    id: 'parisienne',
    name: 'Parisienne',
    family: "'Parisienne', cursive",
    category: 'Handwritten',
    description: 'Chic French casual calligraphy with intentional bounce',
    styleTag: 'Parisian'
  },
  {
    id: 'allura',
    name: 'Allura',
    family: "'Allura', cursive",
    category: 'Handwritten',
    description: 'Silky, romantic flowing ribbon script',
    styleTag: 'Romantic'
  },
  {
    id: 'satisfy',
    name: 'Satisfy',
    family: "'Satisfy', cursive",
    category: 'Handwritten',
    description: 'Smooth retro brush script with timeless charm',
    styleTag: 'Retro Script'
  },
  {
    id: 'sacramento',
    name: 'Sacramento',
    family: "'Sacramento', cursive",
    category: 'Handwritten',
    description: 'Monoline semi-connected 1950s hand lettering',
    styleTag: 'Monoline'
  },
  {
    id: 'homemade-apple',
    name: 'Homemade Apple',
    family: "'Homemade Apple', cursive",
    category: 'Handwritten',
    description: 'Authentic pen & paper note handwriting, intimate & real',
    styleTag: 'Authentic'
  },
  {
    id: 'marck-script',
    name: 'Marck Script',
    family: "'Marck Script', cursive",
    category: 'Handwritten',
    description: 'Easy-flowing handwritten calligraphy with free rhythm',
    styleTag: 'Fluid'
  },
  {
    id: 'indie-flower',
    name: 'Indie Flower',
    family: "'Indie Flower', cursive",
    category: 'Handwritten',
    description: 'Carefree, bubbly handwriting for casual & friendly cards',
    styleTag: 'Carefree'
  },
  {
    id: 'shadows-into-light',
    name: 'Shadows Into Light',
    family: "'Shadows Into Light', cursive",
    category: 'Handwritten',
    description: 'Neat feminine handwriting with soft curves',
    styleTag: 'Neat'
  },
  {
    id: 'reenie-beanie',
    name: 'Reenie Beanie',
    family: "'Reenie Beanie', cursive",
    category: 'Handwritten',
    description: 'Casual ballpoint pen doodle & quick note script',
    styleTag: 'Quick Note'
  },
  {
    id: 'kalam',
    name: 'Kalam',
    family: "'Kalam', cursive",
    category: 'Handwritten',
    description: 'Rich textured marker handwriting with organic feel',
    styleTag: 'Marker'
  },

  // Playful & Fun
  {
    id: 'pacifico',
    name: 'Pacifico',
    family: "'Pacifico', cursive",
    category: 'Playful',
    description: 'California surf brush script for happy celebrations',
    styleTag: 'Surf Brush'
  },
  {
    id: 'bangers',
    name: 'Bangers',
    family: "'Bangers', cursive",
    category: 'Playful',
    description: 'Comic pop-art burst font for humorous & bold cards',
    styleTag: 'Comic Pop'
  },

  // Bold Display & Retro
  {
    id: 'oswald',
    name: 'Oswald',
    family: "'Oswald', sans-serif",
    category: 'Bold Display',
    description: 'Condensed gothic headline sans for punchy typography',
    styleTag: 'Punchy'
  },
  {
    id: 'roboto-mono',
    name: 'Typewriter Mono',
    family: "'Roboto Mono', monospace",
    category: 'Bold Display',
    description: 'Vintage mechanical typewriter font for nostalgia',
    styleTag: 'Typewriter'
  },
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
