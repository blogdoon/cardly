export interface StickerItem {
  id: string;
  name: string;
  category: 'Celebration' | 'Birthday' | 'Love' | 'Flowers & Nature' | 'Badges & Ribbons' | 'Animals & Pets' | 'Fun & Smileys' | 'Stars & Magic';
  svg?: string;
  emoji?: string;
  defaultColor?: string;
  tags?: string[];
}

export const STICKER_CATEGORIES: Array<{ id: string; name: string }> = [
  { id: 'all', name: 'All' },
  { id: 'Celebration', name: 'Celebration' },
  { id: 'Birthday', name: 'Birthday' },
  { id: 'Love', name: 'Love & Hearts' },
  { id: 'Flowers & Nature', name: 'Flowers' },
  { id: 'Badges & Ribbons', name: 'Badges' },
  { id: 'Animals & Pets', name: 'Animals' },
  { id: 'Fun & Smileys', name: 'Emojis' },
  { id: 'Stars & Magic', name: 'Stars & Sparkles' },
];

export const STICKER_CATALOG: StickerItem[] = [
  // --- Celebration ---
  {
    id: 'balloon-party',
    name: 'Party Balloons',
    category: 'Celebration',
    defaultColor: '#f43f5e',
    tags: ['balloon', 'party', 'birthday'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.69 2 6 4.69 6 8c0 2.97 2.16 5.43 5 5.91V17H9v2h2v3h2v-3h2v-2h-2v-3.09c2.84-.48 5-2.94 5-5.91 0-3.31-2.69-6-6-6zm-1 4c0-.55.45-1 1-1s1 .45 1 1v2c0 .55-.45 1-1 1s-1-.45-1-1V6z"/></svg>`
  },
  {
    id: 'party-popper',
    name: 'Party Popper',
    category: 'Celebration',
    defaultColor: '#f59e0b',
    tags: ['popper', 'confetti', 'cheers'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 3.5l1.41 1.41-2.12 2.12-1.41-1.41L12.5 3.5zM6 14.5l1.41 1.41-2.12 2.12L3.88 16.62 6 14.5zm11.5-6l1.41 1.41-2.12 2.12-1.41-1.41 2.12-2.12zM2 22l6.5-6.5 4.5 4.5L2 22zm19-17l-1.5 1.5 1 1L22 6l-1-1zm-6 2l1-1 1.5 1.5-1 1L15 7zm4 7l2-2 1.5 1.5-2 2L19 14z"/></svg>`
  },
  {
    id: 'champagne-toast',
    name: 'Champagne Flutes',
    category: 'Celebration',
    defaultColor: '#eab308',
    tags: ['champagne', 'wine', 'toast', 'cheers'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 2v4.07c-2.3.5-4 2.53-4 4.93 0 2.76 2.24 5 5 5s5-2.24 5-5c0-2.4-1.7-4.43-4-4.93V2h-2zm-3 9c0-1.66 1.34-3 3-3s3 1.34 3 3-1.34 3-3 3-3-1.34-3-3zm3 7v3H8v2h8v-2h-3v-3h-2z"/></svg>`
  },
  {
    id: 'gift-box',
    name: 'Wrapped Present',
    category: 'Celebration',
    defaultColor: '#8b5cf6',
    tags: ['gift', 'present', 'box'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.75-.5-.75C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1h-2v-1c0-.55.45-1 1-1zm-6 0c.55 0 1 .45 1 1v1H8c-.55 0-1-.45-1-1s.45-1 1-1zm11 15H4V8h7v11zm2-11h-2V8h2v11z"/></svg>`
  },
  {
    id: 'confetti-burst',
    name: 'Confetti Shower',
    category: 'Celebration',
    defaultColor: '#ec4899',
    tags: ['confetti', 'sprinkles', 'party'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="4" cy="5" r="2"/><circle cx="12" cy="3" r="1.5"/><circle cx="20" cy="6" r="2"/><circle cx="7" cy="12" r="1.5"/><circle cx="17" cy="11" r="2"/><circle cx="3" cy="18" r="1.5"/><circle cx="11" cy="19" r="2"/><circle cx="20" cy="18" r="1.5"/><rect x="8" y="7" width="2" height="4" rx="1" transform="rotate(30 9 9)"/><rect x="14" y="14" width="2" height="5" rx="1" transform="rotate(-40 15 16.5)"/></svg>`
  },

  // --- Birthday ---
  {
    id: 'birthday-cake',
    name: 'Birthday Cake',
    category: 'Birthday',
    defaultColor: '#ec4899',
    tags: ['cake', 'candles', 'bday', 'slice'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-.55 0-1 .45-1 1v1.17c-.83.21-1.5.83-1.8 1.63-.5-.19-1.07-.15-1.53.13-.5.31-.77.87-.7 1.45l.03.22V10H6c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1h1v5c0 .55.45 1 1 1h8c.55 0 1-.45 1-1v-5h1c.55 0 1-.45 1-1v-3c0-.55-.45-1-1-1h-1V7.6l.03-.22c.07-.58-.2-1.14-.7-1.45-.46-.28-1.03-.32-1.53-.13-.3-.8-.97-1.42-1.8-1.63V3c0-.55-.45-1-1-1zm0 2.5c.28 0 .5.22.5.5v1.08c-.16-.05-.33-.08-.5-.08s-.34.03-.5.08V5c0-.28.22-.5.5-.5zM8 12h8v2H8v-2zm1 4h6v4H9v-4z"/></svg>`
  },
  {
    id: 'cupcake-candle',
    name: 'Cupcake Candle',
    category: 'Birthday',
    defaultColor: '#f43f5e',
    tags: ['cupcake', 'icing', 'candle'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5c-.5 0-.9.4-.9.9 0 .5.9 1.6.9 1.6s.9-1.1.9-1.6c0-.5-.4-.9-.9-.9zm-.7 4.5v2h1.4v-2h-1.4zM4.5 11c0 2.2 1.8 4 4 4 .7 0 1.4-.2 2-.5.6.3 1.3.5 2 .5s1.4-.2 2-.5c.6.3 1.3.5 2 .5 2.2 0 4-1.8 4-4 0-.4-.1-.8-.2-1.2C19.7 9.3 19 9 18 9c-1 0-1.8.6-2.2 1.5C15 9.6 14.1 9 13 9c-1.1 0-2 .6-2.8 1.5C9.8 9.6 9 9 8 9c-1 0-1.7.3-2.3.8-.1.4-.2.8-.2 1.2zm1.5 5.5l1.5 6h9l1.5-6H6z"/></svg>`
  },
  {
    id: 'party-hat',
    name: 'Party Cone Hat',
    category: 'Birthday',
    defaultColor: '#3b82f6',
    tags: ['hat', 'cone', 'celebrate'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-1.2 4.2L4.2 19c-.4.9.2 1.9 1.2 2h13.2c1 0 1.6-1.1 1.2-2L13.2 6.2a1.3 1.3 0 00-2.4 0zM7.5 19l2.2-4.5h4.6l2.2 4.5H7.5z"/></svg>`
  },
  {
    id: 'cheers-mug',
    name: 'Cheers Pint',
    category: 'Birthday',
    defaultColor: '#f59e0b',
    tags: ['beer', 'cheers', 'drink', 'pint'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h10v13c0 2.2-1.8 4-4 4H9c-2.2 0-4-1.8-4-4V3zm10 3h3c1.7 0 3 1.3 3 3v4c0 1.7-1.3 3-3 3h-3V6zm3 8c.6 0 1-.4 1-1V9c0-.6-.4-1-1-1h-1v6h1z"/></svg>`
  },

  // --- Love & Hearts ---
  {
    id: 'heart-full',
    name: 'Sweet Heart',
    category: 'Love',
    defaultColor: '#e11d48',
    tags: ['heart', 'love', 'valentine'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
  },
  {
    id: 'double-hearts',
    name: 'Linked Hearts',
    category: 'Love',
    defaultColor: '#f43f5e',
    tags: ['double', 'hearts', 'couple', 'together'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/></svg>`
  },
  {
    id: 'heart-arrow',
    name: 'Cupid Arrow Heart',
    category: 'Love',
    defaultColor: '#ec4899',
    tags: ['cupid', 'arrow', 'romance'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35zM2 2l5 2-2 5 2 2-7-9zm20 20l-5-2 2-5-2-2 7 9z"/></svg>`
  },
  {
    id: 'kiss-lips',
    name: 'Kiss Lips',
    category: 'Love',
    defaultColor: '#e11d48',
    tags: ['kiss', 'lips', 'xoxo'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 15c-3.1 0-6.2-.9-8-2.6 1.8 3.5 4.9 5.6 8 5.6s6.2-2.1 8-5.6c-1.8 1.7-4.9 2.6-8 2.6zm6.8-6.1c-1.5.9-3.9 1.6-6.8 1.6s-5.3-.7-6.8-1.6c1.3-1.6 3.6-2.9 6.8-2.9s5.5 1.3 6.8 2.9z"/></svg>`
  },
  {
    id: 'love-letter',
    name: 'Love Letter Envelope',
    category: 'Love',
    defaultColor: '#fb7185',
    tags: ['letter', 'envelope', 'mail', 'heart'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2zm-8 4.2l3 2.8h-6l3-2.8z"/></svg>`
  },

  // --- Flowers & Nature ---
  {
    id: 'flower-bloom',
    name: 'Blooming Flower',
    category: 'Flowers & Nature',
    defaultColor: '#ec4899',
    tags: ['flower', 'petal', 'bloom'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1.66 0 3 1.34 3 3 0 .44-.1.85-.28 1.22.4-.14.83-.22 1.28-.22 2.21 0 4 1.79 4 4 0 .45-.08.88-.22 1.28.37-.18.78-.28 1.22-.28 1.66 0 3 1.34 3 3s-1.34 3-3 3c-.44 0-.85-.1-1.22-.28.14.4.22.83.22 1.28 0 2.21-1.79 4-4 4-.45 0-.88-.08-1.28-.22.18.37.28.78.28 1.22 0 1.66-1.34 3-3 3s-3-1.34-3-3c0-.44.1-.85.28-1.22-.4.14-.83.22-1.28.22-2.21 0-4-1.79-4-4 0-.45.08-.88.22-1.28-.37.18-.78.28-1.22.28-1.66 0-3-1.34-3-3s1.34-3 3-3c.44 0 .85.1 1.22.28-.14-.4-.22-.83-.22-1.28 0-2.21 1.79-4 4-4 .45 0 .88.08 1.28.22-.18-.37-.28-.78-.28-1.22 0-1.66 1.34-3 3-3zm0 7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`
  },
  {
    id: 'rose-flower',
    name: 'Romantic Rose',
    category: 'Flowers & Nature',
    defaultColor: '#e11d48',
    tags: ['rose', 'romance', 'nature'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.4 0-8 3.6-8 8 0 2.8 1.4 5.3 3.6 6.7L7 21h2l.4-2.5c.8.3 1.7.5 2.6.5s1.8-.2 2.6-.5L15 21h2l-.6-3.3c2.2-1.4 3.6-3.9 3.6-6.7 0-4.4-3.6-8-8-8zm0 2.5c2.5 0 4.5 1.8 4.5 4s-2 4-4.5 4-4.5-1.8-4.5-4 2-4 4.5-4z"/></svg>`
  },
  {
    id: 'leaf-branch',
    name: 'Olive Laurel',
    category: 'Flowers & Nature',
    defaultColor: '#10b981',
    tags: ['leaf', 'branch', 'laurel', 'greenery'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66C7.54 17.5 9.5 13 17 11V8zm0-6c-1.3 0-2.5.4-3.5 1.1-.3-.4-.7-.7-1.1-1C11.5 1.4 10.3 1 9 1 5.7 1 3 3.7 3 7c0 1.3.4 2.5 1.1 3.5-.4.3-.7.7-1 1.1-.7.9-1.1 2.1-1.1 3.4 0 3.3 2.7 6 6 6 1.3 0 2.5-.4 3.5-1.1.3.4.7.7 1.1 1 .9.7 2.1 1.1 3.4 1.1 3.3 0 6-2.7 6-6 0-1.3-.4-2.5-1.1-3.5.4-.3.7-.7 1-1.1.7-.9 1.1-2.1 1.1-3.4 0-3.3-2.7-6-6-6z"/></svg>`
  },
  {
    id: 'sunflower',
    name: 'Bright Sunflower',
    category: 'Flowers & Nature',
    defaultColor: '#f59e0b',
    tags: ['sunflower', 'sun', 'yellow'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3m-3.9-7.1l-2.1 2.1m-9.9 9.9l-2.1 2.1m14.1 0l-2.1-2.1m-9.9-9.9l-2.1-2.1" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`
  },
  {
    id: 'butterfly',
    name: 'Flutter Butterfly',
    category: 'Flowers & Nature',
    defaultColor: '#8b5cf6',
    tags: ['butterfly', 'insect', 'wings'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C11.5 2 9.5 1 7.5 1 4.5 1 2 3.5 2 6.5c0 4 5 7 10 12 5-5 10-8 10-12C22 3.5 19.5 1 16.5 1c-2 0-4 1-4.5 3.5zM12 9c-1 0-1.8.8-1.8 1.8v5.4c0 1 .8 1.8 1.8 1.8s1.8-.8 1.8-1.8v-5.4c0-1-.8-1.8-1.8-1.8z"/></svg>`
  },

  // --- Badges & Ribbons ---
  {
    id: 'crown-gold',
    name: 'Royalty Crown',
    category: 'Badges & Ribbons',
    defaultColor: '#eab308',
    tags: ['crown', 'king', 'queen', 'royal'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1v-1h14v1z"/></svg>`
  },
  {
    id: 'ribbon-badge',
    name: 'Award Rosette',
    category: 'Badges & Ribbons',
    defaultColor: '#3b82f6',
    tags: ['award', 'ribbon', 'winner', 'medal'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V22l4-2 4 2v-7.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm0 11c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>`
  },
  {
    id: 'trophy-cup',
    name: 'Winner Trophy',
    category: 'Badges & Ribbons',
    defaultColor: '#f59e0b',
    tags: ['trophy', 'first', 'number1', 'cup'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/></svg>`
  },
  {
    id: 'best-badge',
    name: 'No. 1 Star Badge',
    category: 'Badges & Ribbons',
    defaultColor: '#e11d48',
    tags: ['best', 'star', 'seal', 'stamp'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 3.3 4.4-.7 1.5 4.2 4.2 1.5-.7 4.4 3.3 2.9-3.3 2.9.7 4.4-4.2 1.5-1.5 4.2-4.4-.7L12 22l-2.9-3.3-4.4.7-1.5-4.2-4.2-1.5.7-4.4L-3.6 6.4l3.3-2.9-.7-4.4 4.2-1.5 1.5-4.2 4.4.7L12 2zm0 6a4 4 0 100 8 4 4 0 000-8z"/></svg>`
  },

  // --- Animals & Pets ---
  {
    id: 'cute-dog',
    name: 'Playful Pup',
    category: 'Animals & Pets',
    defaultColor: '#d97706',
    tags: ['dog', 'pup', 'pet'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l-2 2h-4l-2-2-4 3 2 4.5c.3 1.5 1.5 2.5 3 2.5h6c1.5 0 2.7-1 3-2.5L22 7l-4-3zm-9 6c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm6 0c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm-3 4c-1.1 0-2-.9-2-2h4c0 1.1-.9 2-2 2zm-8 4v2h16v-2c0-2-2-3-4-3h-8c-2 0-4 1-4 3z"/></svg>`
  },
  {
    id: 'cute-cat',
    name: 'Whiskers Cat',
    category: 'Animals & Pets',
    defaultColor: '#475569',
    tags: ['cat', 'kitten', 'pet'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5c-4.4 0-8 3.1-8 7 0 2.2 1.3 4.2 3.3 5.4L6 20l4.5-1.6c.5.1 1 .1 1.5.1 4.4 0 8-3.1 8-7s-3.6-7-8-7zM8.5 10c.8 0 1.5.7 1.5 1.5S9.3 13 8.5 13 7 12.3 7 11.5 7.7 10 8.5 10zm7 0c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5-1.5-.7-1.5-1.5.7-1.5 1.5-1.5zm-3.5 5c-1.1 0-2-.5-2-1h4c0 .5-.9 1-2 1zM4 3l4 3M20 3l-4 3"/></svg>`
  },
  {
    id: 'teddy-bear',
    name: 'Cuddly Bear',
    category: 'Animals & Pets',
    defaultColor: '#92400e',
    tags: ['bear', 'teddy', 'cuddle'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 4a2.5 2.5 0 00-2.5 2.5c0 1.1.7 2 1.7 2.3A7.5 7.5 0 003 12c0 2.3.9 4.3 2.4 5.7L4 21h4l.7-.6c1 .4 2.1.6 3.3.6s2.3-.2 3.3-.6l.7.6h4l-1.4-3.3c1.5-1.4 2.4-3.4 2.4-5.7 0-1.1-.2-2.1-.7-3.2 1-.3 1.7-1.2 1.7-2.3a2.5 2.5 0 00-5-1.1c-1.2-.7-2.7-1-4.4-1s-3.2.3-4.4 1A2.5 2.5 0 004.5 4zm4.5 7c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zm6 0c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zm-3 2c1.1 0 2 .5 2 1.2S13.1 16 12 16s-2-.8-2-1.8.9-1.2 2-1.2z"/></svg>`
  },

  // --- Fun & Smileys ---
  {
    id: 'smiley-wink',
    name: 'Winking Smile',
    category: 'Fun & Smileys',
    defaultColor: '#f59e0b',
    tags: ['wink', 'smile', 'happy'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3.5-9c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm7.5-1h-3v-1h3v1zm-4 6c1.93 0 3.68-1.07 4.5-2.67-.33-.2-.71-.33-1.12-.33-.6 0-1.14.28-1.5.72-.51.4-1.17.65-1.88.65s-1.37-.25-1.88-.65c-.36-.44-.9-.72-1.5-.72-.41 0-.79.13-1.12.33.82 1.6 2.57 2.67 4.5 2.67z"/></svg>`
  },
  {
    id: 'cool-sunglasses',
    name: 'Party Shades',
    category: 'Fun & Smileys',
    defaultColor: '#1e293b',
    tags: ['sunglasses', 'cool', 'rockstar'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 6.5V6H2v.5C2 7.88 3.12 9 4.5 9h.09C4.84 10.74 6.3 12 8 12c1.78 0 3.25-1.32 3.44-3.08.34-.14.73-.23 1.13-.23.4 0 .79.09 1.13.23.19 1.76 1.66 3.08 3.44 3.08 1.7 0 3.16-1.26 3.41-3h.09C20.88 9 22 7.88 22 6.5zM8 10.5c-1.1 0-2-.9-2-2h4c0 1.1-.9 2-2 2zm8 0c-1.1 0-2-.9-2-2h4c0 1.1-.9 2-2 2z"/></svg>`
  },
  {
    id: 'laughing-tears',
    name: 'Laughing Joy',
    category: 'Fun & Smileys',
    defaultColor: '#f59e0b',
    tags: ['laugh', 'lol', 'funny', 'tears'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm5 11c-.7 2.3-2.8 4-5 4s-4.3-1.7-5-4h10zM8.5 8.5l2 1.5-2 1.5-1-1.5 1-1.5zm7 0l1 1.5-1 1.5-2-1.5 2-1.5z"/></svg>`
  },

  // --- Stars & Magic ---
  {
    id: 'sparkle-star',
    name: 'Magic Sparkles',
    category: 'Stars & Magic',
    defaultColor: '#facc15',
    tags: ['star', 'sparkle', 'magic', 'shine'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.2L21.6 12l-7.2 2.8L12 22l-2.4-7.2L2.4 12l7.2-2.8L12 2z"/></svg>`
  },
  {
    id: 'shooting-star',
    name: 'Shooting Star',
    category: 'Stars & Magic',
    defaultColor: '#eab308',
    tags: ['shooting', 'star', 'wish'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.5 2.5l1.6 3.5 3.8.4-2.8 2.6.8 3.8-3.4-1.9-3.4 1.9.8-3.8-2.8-2.6 3.8-.4 1.6-3.5zM3 21l8-8m-7 4l5-5m-6 9l4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
  },
  {
    id: 'glitter-cluster',
    name: 'Glitter Burst',
    category: 'Stars & Magic',
    defaultColor: '#f43f5e',
    tags: ['glitter', 'burst', 'shine'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l1.8 6.2L20 8l-6.2 1.8L12 16l-1.8-6.2L4 8l6.2-1.8L12 0zm7 15l.9 3.1 3.1.9-3.1.9-.9 3.1-.9-3.1-3.1-.9 3.1-.9.9-3.1zM5 14l.9 3.1 3.1.9-3.1.9-.9 3.1-.9-3.1-3.1-.9 3.1-.9.9-3.1z"/></svg>`
  },
  {
    id: 'rainbow-arc',
    name: 'Bright Rainbow',
    category: 'Stars & Magic',
    defaultColor: '#06b6d4',
    tags: ['rainbow', 'color', 'sky', 'hope'],
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4C6.5 4 2 8.5 2 14h3c0-3.9 3.1-7 7-7s7 3.1 7 7h3c0-5.5-4.5-10-10-10zm0 5c-2.8 0-5 2.2-5 5h2c0-1.7 1.3-3 3-3s3 1.3 3 3h2c0-2.8-2.2-5-5-5z"/></svg>`
  },

  // --- Expressive Emojis Stickers ---
  { id: 'emoji-party', name: 'Party Popper Face', category: 'Celebration', emoji: '🥳', tags: ['party', 'face', 'celebrate'] },
  { id: 'emoji-cake', name: 'Layer Cake', category: 'Birthday', emoji: '🎂', tags: ['cake', 'slice', 'candle'] },
  { id: 'emoji-champagne', name: 'Bubbly Bottle', category: 'Celebration', emoji: '🍾', tags: ['champagne', 'drink', 'bottle'] },
  { id: 'emoji-sparkles', name: 'Gold Sparkles', category: 'Stars & Magic', emoji: '✨', tags: ['sparkles', 'magic'] },
  { id: 'emoji-heart-eyes', name: 'Heart Eyes', category: 'Love', emoji: '😍', tags: ['love', 'eyes', 'smile'] },
  { id: 'emoji-red-heart', name: 'Red Heart', category: 'Love', emoji: '❤️', tags: ['heart', 'red'] },
  { id: 'emoji-fireworks', name: 'Fireworks', category: 'Celebration', emoji: '🎆', tags: ['fireworks', 'night', 'blast'] },
  { id: 'emoji-bouquet', name: 'Flower Bouquet', category: 'Flowers & Nature', emoji: '💐', tags: ['bouquet', 'flower', 'wedding'] },
  { id: 'emoji-sunflower-em', name: 'Sunflower', category: 'Flowers & Nature', emoji: '🌻', tags: ['sunflower', 'bright'] },
  { id: 'emoji-clinking-beer', name: 'Clinking Beers', category: 'Celebration', emoji: '🍻', tags: ['beer', 'cheers'] },
  { id: 'emoji-cocktail', name: 'Tropical Cocktail', category: 'Celebration', emoji: '🍹', tags: ['cocktail', 'drink', 'vacation'] },
  { id: 'emoji-balloon', name: 'Red Balloon', category: 'Celebration', emoji: '🎈', tags: ['balloon', 'party'] },
  { id: 'emoji-corgi', name: 'Cute Doggo', category: 'Animals & Pets', emoji: '🐶', tags: ['dog', 'corgi', 'pet'] },
  { id: 'emoji-kitten', name: 'Kitty Cat', category: 'Animals & Pets', emoji: '🐱', tags: ['cat', 'kitten'] },
  { id: 'emoji-unicorn', name: 'Magic Unicorn', category: 'Stars & Magic', emoji: '🦄', tags: ['unicorn', 'magic', 'horse'] },
  { id: 'emoji-butterfly-em', name: 'Purple Butterfly', category: 'Flowers & Nature', emoji: '🦋', tags: ['butterfly', 'wings'] },
  { id: 'emoji-crown', name: 'Gold Crown', category: 'Badges & Ribbons', emoji: '👑', tags: ['crown', 'queen', 'king'] },
  { id: 'emoji-medal-1', name: '1st Place Medal', category: 'Badges & Ribbons', emoji: '🥇', tags: ['medal', 'gold', '1st'] },
  { id: 'emoji-star-struck', name: 'Star-Struck', category: 'Fun & Smileys', emoji: '🤩', tags: ['star', 'eyes', 'excited'] },
  { id: 'emoji-kiss-face', name: 'Blowing Kiss', category: 'Love', emoji: '😘', tags: ['kiss', 'heart', 'love'] },
  { id: 'emoji-rainbow', name: 'Rainbow', category: 'Stars & Magic', emoji: '🌈', tags: ['rainbow', 'clouds'] },
  { id: 'emoji-sparkler', name: 'Firework Sparkler', category: 'Celebration', emoji: '🎇', tags: ['sparkler', 'celebration'] },
  { id: 'emoji-present', name: 'Ribbon Box', category: 'Celebration', emoji: '🎁', tags: ['present', 'gift'] },
  { id: 'emoji-tada', name: 'Party Horn', category: 'Celebration', emoji: '🎉', tags: ['tada', 'party'] },
];
