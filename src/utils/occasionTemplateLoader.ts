import { CardTemplate, OccasionType, RecipientType, CardStyleType } from '../types/template';

export const FOLDER_OCCASION_MAP: Record<string, OccasionType> = {
  'birthday': 'Birthday',
  'anniversary': 'Anniversary',
  'wedding': 'Wedding',
  'new-baby': 'New Baby',
  'newbaby': 'New Baby',
  'baby': 'New Baby',
  'congratulations': 'Congratulations',
  'thank-you': 'Thank You',
  'thankyou': 'Thank You',
  'valentines-day': "Valentine's Day",
  'valentines': "Valentine's Day",
  'valentine': "Valentine's Day",
  'mothers-day': "Mother's Day",
  'mothersday': "Mother's Day",
  'fathers-day': "Father's Day",
  'fathersday': "Father's Day",
  'get-well': 'Get Well',
  'getwell': 'Get Well',
  'christmas': 'Christmas',
  'xmas': 'Christmas',
  'friendship': 'Friendship',
  'good-luck': 'Good Luck',
  'goodluck': 'Good Luck',
  'retirement': 'Retirement',
  'thinking-of-you': 'Thinking of You',
  'thinkingofyou': 'Thinking of You',
  'sympathy': 'Sympathy',
  'graduation': 'Graduation',
  'engagement': 'Engagement',
  'easter': 'Easter',
  'housewarming': 'Housewarming',
};

// Vite static import glob discovering all images inside src/assets/images/occasions/
// Adding any .jpg, .png, or .webp image to any occasion folder will automatically register it here.
export const occasionImageModules = import.meta.glob<{ default: string }>(
  '/src/assets/images/occasions/**/*.{jpg,jpeg,png,webp,svg,avif}',
  { eager: true }
);

export interface OccasionImageEntry {
  filePath: string;
  folderName: string;
  occasion: OccasionType;
  fileName: string;
  cleanName: string;
  imageUrl: string;
}

/**
 * Parses all image files found in the occasion folders into structured entries.
 */
export function getOccasionImageEntries(): OccasionImageEntry[] {
  const entries: OccasionImageEntry[] = [];

  for (const [filePath, module] of Object.entries(occasionImageModules)) {
    // Expected path format: /src/assets/images/occasions/<folder-name>/<filename>
    const match = filePath.match(/\/occasions\/([^/]+)\/(.+)$/);
    if (!match) continue;

    const folderName = match[1].toLowerCase();
    const fileNameWithExt = match[2];
    const occasion = FOLDER_OCCASION_MAP[folderName] || 'Birthday';

    // Format clean name from filename (e.g., 'warm_ivory_balloons.jpg' -> 'Warm Ivory Balloons')
    const baseName = fileNameWithExt.replace(/\.[^/.]+$/, '').replace(/_\d{10,}$/, '');
    const cleanName = baseName
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    const imageUrl = module?.default || filePath;

    entries.push({
      filePath,
      folderName,
      occasion,
      fileName: fileNameWithExt,
      cleanName: cleanName || `${occasion} Card`,
      imageUrl,
    });
  }

  return entries;
}

// Occasion-specific default messages for generated templates
export const OCCASION_MESSAGES: Record<OccasionType, { headline: string; sub: string; inside: string; defaultColor: string }> = {
  'Birthday': {
    headline: 'Happiest of Birthdays',
    sub: 'Wishing you a wonderful celebration.',
    inside: 'May your day be filled with happiness, laughter, and everything you wished for!\n\nWith lots of love,\n[Your Name]',
    defaultColor: '#881337',
  },
  'Anniversary': {
    headline: 'Happy Anniversary',
    sub: 'Celebrating your beautiful love story.',
    inside: 'Wishing you both another incredible year of love, companionship, and joy.\n\nWarmest wishes,\n[Your Name]',
    defaultColor: '#4c1d95',
  },
  'Wedding': {
    headline: 'A Lifetime of Love',
    sub: 'Warmest congratulations on your marriage.',
    inside: 'May your life together be blessed with endless happiness, understanding, and affection.\n\nWith all our love,\n[Your Name]',
    defaultColor: '#1c1917',
  },
  'New Baby': {
    headline: 'Welcome to the World',
    sub: 'Congratulations on your new arrival.',
    inside: 'Wishing your growing family endless joy, sweet snuggles, and magical moments together.\n\nLots of love,\n[Your Name]',
    defaultColor: '#0f766e',
  },
  'Congratulations': {
    headline: 'Huge Congratulations!',
    sub: 'So proud of your achievement.',
    inside: 'Your hard work and dedication truly paid off. Wishing you continued success!\n\nBest wishes,\n[Your Name]',
    defaultColor: '#1e3a8a',
  },
  'Thank You': {
    headline: 'With Sincere Thanks',
    sub: 'Your kindness meant so much to me.',
    inside: 'Thank you from the bottom of my heart for your generosity and thoughtfulness.\n\nGratefully,\n[Your Name]',
    defaultColor: '#1e3a8a',
  },
  "Valentine's Day": {
    headline: 'Forever My Valentine',
    sub: 'With all my heart, today and always.',
    inside: 'Thank you for making my life brighter and fuller every single day. I love you!\n\nYours always,\n[Your Name]',
    defaultColor: '#be123c',
  },
  "Mother's Day": {
    headline: "Happy Mother's Day",
    sub: 'To the most wonderful Mum in the world.',
    inside: 'Thank you for your endless love, patience, and warmth. You are simply the best.\n\nWith all my love,\n[Your Name]',
    defaultColor: '#9d174d',
  },
  "Father's Day": {
    headline: "Happy Father's Day",
    sub: 'To an incredible Dad and role model.',
    inside: 'Thank you for always being there with great advice, warm hugs, and steady support.\n\nCheers Dad,\n[Your Name]',
    defaultColor: '#1e293b',
  },
  'Get Well': {
    headline: 'Thinking of You',
    sub: 'Sending warm hugs and healing thoughts.',
    inside: 'Rest up and take gentle care. Looking forward to seeing you back on your feet soon!\n\nGet well soon,\n[Your Name]',
    defaultColor: '#0369a1',
  },
  'Christmas': {
    headline: 'Merry & Bright',
    sub: 'Warmest holiday wishes to you and yours.',
    inside: 'May the peace and joy of the holiday season stay with you throughout the coming year.\n\nMerry Christmas,\n[Your Name]',
    defaultColor: '#166534',
  },
  'Friendship': {
    headline: 'Grateful for You',
    sub: 'To my absolute favourite person.',
    inside: 'Life is so much more fun with you as my friend. Thank you for always being you!\n\nCheers,\n[Your Name]',
    defaultColor: '#92400e',
  },
  'Good Luck': {
    headline: 'Best of Luck!',
    sub: 'You have got this completely.',
    inside: 'Cheering you on every step of the way! You have worked hard and you will do great.\n\nRooting for you,\n[Your Name]',
    defaultColor: '#15803d',
  },
  'Retirement': {
    headline: 'Happy Retirement',
    sub: 'Cheers to your well-deserved next chapter.',
    inside: 'Congratulations on a stellar career! May this new season be filled with fun, rest, and travel.\n\nBest wishes,\n[Your Name]',
    defaultColor: '#334155',
  },
  'Thinking of You': {
    headline: 'Just A Little Note',
    sub: 'Sending love across the miles.',
    inside: 'Holding you close in our thoughts today. Whenever you need a chat, I am right here.\n\nMuch love,\n[Your Name]',
    defaultColor: '#6b21a8',
  },
  'Sympathy': {
    headline: 'In Loving Thought',
    sub: 'Holding you close in our prayers.',
    inside: 'May the cherished memories of your loved one bring you comfort, peace, and solace.\n\nWith deepest sympathy,\n[Your Name]',
    defaultColor: '#334155',
  },
  'Graduation': {
    headline: 'Congratulations Graduate!',
    sub: 'The future is yours to shape.',
    inside: 'Caps off to you! So excited to see all the extraordinary things you will accomplish.\n\nProudly,\n[Your Name]',
    defaultColor: '#1e3a8a',
  },
  'Engagement': {
    headline: 'Congratulations on Your Engagement!',
    sub: 'Here is to your beautiful journey together.',
    inside: 'Wishing you both a lifetime of shared laughter, adventure, and boundless love!\n\nCheers to you both,\n[Your Name]',
    defaultColor: '#7c3aed',
  },
  'Easter': {
    headline: 'Happy Easter Wishes',
    sub: 'May your spring season bloom with joy.',
    inside: 'Wishing you a bright, sunny Easter filled with peace, sweet treats, and family warmth.\n\nWarmly,\n[Your Name]',
    defaultColor: '#ca8a04',
  },
  'Housewarming': {
    headline: 'Home Sweet Home',
    sub: 'Warmest wishes on your new home.',
    inside: 'May your new home be filled with warmth, wonderful memories, and lots of laughter!\n\nCongratulations,\n[Your Name]',
    defaultColor: '#9a3412',
  },
};

/**
 * Dynamically converts occasion folder images into fully functional, production-ready CardTemplates.
 * These templates automatically feature text-safe positioning and editable fields.
 */
export function generateTemplatesFromOccasionImages(): CardTemplate[] {
  const entries = getOccasionImageEntries();

  return entries.map((entry, index) => {
    const slug = entry.cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const templateId = `occ-${entry.folderName}-${slug}`;
    const occasionMeta = OCCASION_MESSAGES[entry.occasion] || OCCASION_MESSAGES['Birthday'];

    const title = `${entry.cleanName} ${entry.occasion}`;
    const desc = `Handcrafted ${entry.occasion.toLowerCase()} greeting card featuring artisanal artwork from the ${entry.occasion} collection.`;

    const recipient: RecipientType = 'Anyone';
    const style: CardStyleType = 'Floral';

    return {
      id: templateId,
      title,
      description: desc,
      category: entry.occasion,
      subcategory: 'Artisan Collection',
      recipient,
      style,
      tone: 'Heartfelt',
      tags: [
        entry.occasion.toLowerCase(),
        'artisan',
        'stationery',
        'botanical',
        'personalized',
        ...entry.cleanName.toLowerCase().split(' '),
      ],
      price: 4.29,
      rating: 4.9,
      reviewCount: 45 + (index * 13) % 180,
      isPhotoCard: false,
      isPopular: index % 2 === 0,
      isBestSeller: index === 0,
      isNew: true,
      thumbnail: entry.imageUrl,
      previewColors: ['#faf8f5', occasionMeta.defaultColor, '#d97706'],
      altText: `${title} - Front cover artwork`,
      season: 'all-year',
      defaultPages: {
        front: {
          pageType: 'front',
          backgroundColor: '#faf8f5',
          backgroundImage: entry.imageUrl,
          elements: [
            {
              id: 'headline-1',
              type: 'text',
              x: 32,
              y: 40,
              width: 44,
              height: 24,
              rotation: 0,
              zIndex: 10,
              text: occasionMeta.headline,
              fontFamily: "'Playfair Display', serif",
              fontSize: 28,
              color: occasionMeta.defaultColor,
              textAlign: 'left',
              fontWeight: 'bold',
              personalizationField: 'message',
              hasBackground: false,
              textShadow: 'none',
            },
            {
              id: 'subtext-1',
              type: 'text',
              x: 32,
              y: 56,
              width: 44,
              height: 16,
              rotation: 0,
              zIndex: 11,
              text: occasionMeta.sub,
              fontFamily: "'Playfair Display', serif",
              fontSize: 16,
              color: '#334155',
              textAlign: 'left',
              fontWeight: 'normal',
              personalizationField: 'name',
              hasBackground: false,
              textShadow: 'none',
            },
          ],
        },
        insideLeft: {
          pageType: 'inside-left',
          backgroundColor: '#fafafa',
          elements: [
            {
              id: 'inside-left-photo',
              type: 'photo',
              x: 50,
              y: 48,
              width: 65,
              height: 48,
              rotation: 0,
              zIndex: 1,
              imageUrl: entry.imageUrl,
              placeholder: true,
              borderRadius: 10,
            },
          ],
        },
        insideRight: {
          pageType: 'inside-right',
          backgroundColor: '#ffffff',
          elements: [
            {
              id: 'inside-greeting-msg',
              type: 'text',
              x: 50,
              y: 46,
              width: 78,
              height: 60,
              rotation: 0,
              zIndex: 1,
              text: occasionMeta.inside,
              fontFamily: "'Caveat', cursive",
              fontSize: 24,
              color: '#1e293b',
              textAlign: 'center',
              lineHeight: 1.5,
              personalizationField: 'message',
            },
          ],
        },
        back: {
          pageType: 'back',
          backgroundColor: '#faf8f5',
          elements: [
            {
              id: 'cardly-brandmark',
              type: 'text',
              x: 50,
              y: 88,
              width: 50,
              height: 8,
              rotation: 0,
              zIndex: 1,
              text: 'cardly. • Handcrafted in Great Britain',
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13,
              color: '#64748b',
              textAlign: 'center',
              fontWeight: '600',
            },
          ],
        },
      },
    };
  });
}

// Key for storing in-browser custom uploaded templates
const LOCAL_CUSTOM_TEMPLATES_KEY = 'cardly_custom_occasion_templates';

export function getCustomUploadedTemplates(): CardTemplate[] {
  try {
    const raw = localStorage.getItem(LOCAL_CUSTOM_TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomUploadedTemplate(template: CardTemplate): void {
  try {
    const current = getCustomUploadedTemplates();
    const idx = current.findIndex((t) => t.id === template.id);
    if (idx >= 0) {
      current[idx] = template;
    } else {
      current.unshift(template);
    }
    localStorage.setItem(LOCAL_CUSTOM_TEMPLATES_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Could not save custom uploaded template to localStorage:', e);
  }
}

export function deleteCustomUploadedTemplate(id: string): void {
  try {
    const current = getCustomUploadedTemplates().filter((t) => t.id !== id);
    localStorage.setItem(LOCAL_CUSTOM_TEMPLATES_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Could not delete custom uploaded template:', e);
  }
}

/**
 * Creates a complete CardTemplate from an occasion image with customized text, price, and palette.
 */
export function createTemplateFromOccasionImage(options: {
  occasion: OccasionType;
  imageUrl: string;
  title?: string;
  headline?: string;
  subText?: string;
  textColor?: string;
  price?: number;
  recipient?: RecipientType;
  style?: CardStyleType;
  tags?: string[];
}): CardTemplate {
  const occasion = options.occasion;
  const occasionMeta = OCCASION_MESSAGES[occasion] || OCCASION_MESSAGES['Birthday'];
  const title = options.title || `${occasion} Artisan Stationery Card`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const id = `occ-user-${slug}-${Date.now().toString(36)}`;
  const headline = options.headline || occasionMeta.headline;
  const subText = options.subText || occasionMeta.sub;
  const textColor = options.textColor || occasionMeta.defaultColor;
  const price = options.price || 4.29;
  const recipient = options.recipient || 'Anyone';
  const style = options.style || 'Floral';

  return {
    id,
    title,
    description: `Handcrafted ${occasion.toLowerCase()} card with premium artwork from the ${occasion} collection.`,
    category: occasion,
    subcategory: 'Artisan Collection',
    recipient,
    style,
    tone: 'Heartfelt',
    tags: [
      occasion.toLowerCase(),
      'artisan',
      'stationery',
      'botanical',
      'custom',
      ...(options.tags || []),
    ],
    price,
    rating: 5.0,
    reviewCount: 1,
    isPhotoCard: false,
    isPopular: true,
    isBestSeller: false,
    isNew: true,
    thumbnail: options.imageUrl,
    previewColors: ['#faf8f5', textColor, '#d97706'],
    altText: `${title} - Front cover artwork`,
    season: 'all-year',
    defaultPages: {
      front: {
        pageType: 'front',
        backgroundColor: '#faf8f5',
        backgroundImage: options.imageUrl,
        elements: [
          {
            id: 'headline-1',
            type: 'text',
            x: 32,
            y: 40,
            width: 44,
            height: 24,
            rotation: 0,
            zIndex: 10,
            text: headline,
            fontFamily: "'Playfair Display', serif",
            fontSize: 28,
            color: textColor,
            textAlign: 'left',
            fontWeight: 'bold',
            personalizationField: 'message',
            hasBackground: false,
            textShadow: 'none',
          },
          {
            id: 'subtext-1',
            type: 'text',
            x: 32,
            y: 56,
            width: 44,
            height: 16,
            rotation: 0,
            zIndex: 11,
            text: subText,
            fontFamily: "'Playfair Display', serif",
            fontSize: 16,
            color: '#334155',
            textAlign: 'left',
            fontWeight: 'normal',
            personalizationField: 'name',
            hasBackground: false,
            textShadow: 'none',
          },
        ],
      },
      insideLeft: {
        pageType: 'inside-left',
        backgroundColor: '#fafafa',
        elements: [
          {
            id: 'inside-left-photo',
            type: 'photo',
            x: 50,
            y: 48,
            width: 65,
            height: 48,
            rotation: 0,
            zIndex: 1,
            imageUrl: options.imageUrl,
            placeholder: true,
            borderRadius: 10,
          },
        ],
      },
      insideRight: {
        pageType: 'inside-right',
        backgroundColor: '#ffffff',
        elements: [
          {
            id: 'inside-greeting-msg',
            type: 'text',
            x: 50,
            y: 46,
            width: 78,
            height: 60,
            rotation: 0,
            zIndex: 1,
            text: occasionMeta.inside,
            fontFamily: "'Caveat', cursive",
            fontSize: 24,
            color: '#1e293b',
            textAlign: 'center',
            lineHeight: 1.5,
            personalizationField: 'message',
          },
        ],
      },
      back: {
        pageType: 'back',
        backgroundColor: '#faf8f5',
        elements: [
          {
            id: 'cardly-brandmark',
            type: 'text',
            x: 50,
            y: 88,
            width: 50,
            height: 8,
            rotation: 0,
            zIndex: 1,
            text: 'cardly. • Handcrafted in Great Britain',
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13,
            color: '#64748b',
            textAlign: 'center',
            fontWeight: '600',
          },
        ],
      },
    },
  };
}
