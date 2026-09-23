import { OccasionType, RecipientType, CardStyleType } from '../types/template';

export interface CategoryInfo {
  id: string;
  name: OccasionType;
  slug: string;
  description: string;
  heroHeadline: string;
  subcategories: string[];
  suggestedTags: string[];
  popularRecipients: RecipientType[];
}

export const OCCASIONS_LIST: CategoryInfo[] = [
  {
    id: 'birthday',
    name: 'Birthday',
    slug: 'birthday',
    description: 'Celebrate another fabulous year with personalized cards for everyone you love.',
    heroHeadline: 'Cards that make their birthday unforgettable',
    subcategories: ['Milestone Birthday', 'Funny Birthday', 'Photo Birthday', 'Kids Birthday', 'Cute Birthday', 'Elegant Birthday'],
    suggestedTags: ['birthday', 'celebration', 'party', 'cake', 'wishes'],
    popularRecipients: ['Her', 'Him', 'Mum', 'Dad', 'Best Friend', 'Sister', 'Brother', 'Kids'],
  },
  {
    id: 'anniversary',
    name: 'Anniversary',
    slug: 'anniversary',
    description: 'Celebrate your love story or send heartfelt wishes to the happy couple.',
    heroHeadline: 'To another year of laughter and love',
    subcategories: ['Wedding Anniversary', 'Paper (1st)', 'Silver (25th)', 'Ruby (40th)', 'Golden (50th)', 'Funny Anniversary'],
    suggestedTags: ['love', 'romance', 'couple', 'marriage', 'hearts'],
    popularRecipients: ['Wife', 'Husband', 'Partner', 'Friend'],
  },
  {
    id: 'wedding',
    name: 'Wedding',
    slug: 'wedding',
    description: 'Send best wishes to the newlyweds on their biggest and brightest day.',
    heroHeadline: 'Celebrate their forever beginning',
    subcategories: ['Mr & Mrs', 'Mr & Mr', 'Mrs & Mrs', 'Elegant Wedding', 'Funny Wedding', 'Modern Floral'],
    suggestedTags: ['wedding', 'newlyweds', 'celebration', 'champagne', 'marriage'],
    popularRecipients: ['Friend', 'Best Friend', 'Sister', 'Brother', 'Colleague'],
  },
  {
    id: 'new-baby',
    name: 'New Baby',
    slug: 'new-baby',
    description: 'Welcome the little bundle of joy with adorable pastel and photo keepsakes.',
    heroHeadline: 'A tiny arrival, a giant celebration',
    subcategories: ['Baby Boy', 'Baby Girl', 'Twins', 'Baby Shower', 'Proud Grandparents'],
    suggestedTags: ['baby', 'stork', 'cute', 'welcome', 'nursery'],
    popularRecipients: ['Friend', 'Sister', 'Brother', 'Daughter', 'Son', 'Colleague'],
  },
  {
    id: 'congratulations',
    name: 'Congratulations',
    slug: 'congratulations',
    description: 'Cheer on exams, driving tests, new jobs, promotions, and great milestones.',
    heroHeadline: 'You did it! Time to celebrate big',
    subcategories: ['New Job', 'Graduation', 'Passed Driving Test', 'New Home', 'Retirement'],
    suggestedTags: ['congrats', 'achievement', 'proud', 'success', 'trophy'],
    popularRecipients: ['Friend', 'Daughter', 'Son', 'Colleague', 'Brother', 'Sister'],
  },
  {
    id: 'thank-you',
    name: 'Thank You',
    slug: 'thank-you',
    description: 'Express your deepest gratitude with thoughtful words and memorable designs.',
    heroHeadline: 'Say thank you with all your heart',
    subcategories: ['Teacher Thank You', 'Doctor & Nurse', 'Friendship Thanks', 'General Gratitude', 'Floral Thanks'],
    suggestedTags: ['gratitude', 'kindness', 'thanks', 'floral'],
    popularRecipients: ['Friend', 'Colleague', 'Mum', 'Dad', 'Anyone'],
  },
  {
    id: 'valentines-day',
    name: 'Valentine\'s Day',
    slug: 'valentines-day',
    description: 'Romantic, cheeky, or cute cards for your special one.',
    heroHeadline: 'Love is in the air',
    subcategories: ['Romantic', 'Cheeky & Funny', 'Photo Valentine', 'First Valentine', 'Galentine\'s'],
    suggestedTags: ['valentines', 'love', 'sweetheart', 'romance', 'cupid'],
    popularRecipients: ['Wife', 'Husband', 'Partner', 'Best Friend'],
  },
  {
    id: 'mothers-day',
    name: 'Mother\'s Day',
    slug: 'mothers-day',
    description: 'Thank the wonderful mums, grandmas, and maternal figures who mean the world.',
    heroHeadline: 'Show Mum she is one of a kind',
    subcategories: ['First Mother\'s Day', 'Floral & Sweet', 'Funny Mum', 'From Pet', 'Grandma'],
    suggestedTags: ['mother', 'mum', 'mom', 'love', 'flowers'],
    popularRecipients: ['Mum', 'Grandparent', 'Wife'],
  },
  {
    id: 'fathers-day',
    name: 'Father\'s Day',
    slug: 'fathers-day',
    description: 'Cards packed with dad jokes, gratitude, beers, and warm wishes.',
    heroHeadline: 'For the world\'s greatest dad',
    subcategories: ['Dad Jokes', 'Beer & Sports', 'Sentimental', 'From Daughter', 'Grandad'],
    suggestedTags: ['father', 'dad', 'jokes', 'hero', 'tools'],
    popularRecipients: ['Dad', 'Grandparent', 'Husband'],
  },
  {
    id: 'get-well',
    name: 'Get Well',
    slug: 'get-well',
    description: 'Send healing vibes, warm hugs, and uplifting smiles for a speedy recovery.',
    heroHeadline: 'Sending hugs and healing thoughts',
    subcategories: ['Speedy Recovery', 'Surgery Recovery', 'Cheering Up', 'Uplifting Flowers'],
    suggestedTags: ['healing', 'comfort', 'health', 'flowers', 'hug'],
    popularRecipients: ['Friend', 'Colleague', 'Mum', 'Dad', 'Grandparent'],
  },
  {
    id: 'christmas',
    name: 'Christmas',
    slug: 'christmas',
    description: 'Spread holiday cheer, merry laughter, and seasonal warmth across the miles.',
    heroHeadline: 'Merry, bright, and personalized',
    subcategories: ['Family Photo Card', 'Funny Holiday', 'Traditional Snowy', 'Festive Foliage', 'Across the Miles'],
    suggestedTags: ['christmas', 'xmas', 'holiday', 'winter', 'santa', 'cheer'],
    popularRecipients: ['Anyone', 'Mum', 'Dad', 'Grandparent', 'Friend', 'Colleague'],
  },
  {
    id: 'friendship',
    name: 'Friendship',
    slug: 'friendship',
    description: 'Remind your besties how much they rock with hilarious and heartfelt cards.',
    heroHeadline: 'Because true friends deserve real recognition',
    subcategories: ['Best Friend', 'Long Distance', 'Inside Jokes', 'Gal Pals', 'Thinking of You'],
    suggestedTags: ['bestie', 'partner in crime', 'laughter', 'support'],
    popularRecipients: ['Friend', 'Best Friend', 'Colleague'],
  },
];

export const RECIPIENTS_LIST: { id: RecipientType; name: string; tag: string }[] = [
  { id: 'Her', name: 'For Her', tag: 'her' },
  { id: 'Him', name: 'For Him', tag: 'him' },
  { id: 'Mum', name: 'Mum', tag: 'mum' },
  { id: 'Dad', name: 'Dad', tag: 'dad' },
  { id: 'Sister', name: 'Sister', tag: 'sister' },
  { id: 'Brother', name: 'Brother', tag: 'brother' },
  { id: 'Wife', name: 'Wife', tag: 'wife' },
  { id: 'Husband', name: 'Husband', tag: 'husband' },
  { id: 'Partner', name: 'Partner', tag: 'partner' },
  { id: 'Daughter', name: 'Daughter', tag: 'daughter' },
  { id: 'Son', name: 'Son', tag: 'son' },
  { id: 'Grandparent', name: 'Grandparents', tag: 'grandparent' },
  { id: 'Friend', name: 'Friend', tag: 'friend' },
  { id: 'Best Friend', name: 'Best Friend', tag: 'best-friend' },
  { id: 'Colleague', name: 'Colleague', tag: 'colleague' },
  { id: 'Kids', name: 'Kids', tag: 'kids' },
];

export const STYLES_LIST: { id: CardStyleType; name: string }[] = [
  { id: 'Funny', name: 'Funny & Cheeky' },
  { id: 'Cute', name: 'Cute & Sweet' },
  { id: 'Modern', name: 'Modern Clean' },
  { id: 'Floral', name: 'Floral Botanical' },
  { id: 'Elegant', name: 'Elegant & Classic' },
  { id: 'Photo', name: 'Photo Upload' },
  { id: 'Typography', name: 'Bold Typography' },
  { id: 'Retro', name: 'Retro & Vintage' },
  { id: 'Minimal', name: 'Minimalist' },
  { id: 'Luxury', name: 'Luxury Gold' },
  { id: 'Cartoon', name: 'Cartoon & Doodles' },
  { id: 'Inspirational', name: 'Inspirational' },
];

export const MILESTONE_AGES = [1, 16, 18, 21, 30, 40, 50, 60, 70, 80, 90, 100];
