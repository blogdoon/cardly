import { CardTemplate, OccasionType, RecipientType, CardStyleType } from '../types/template';
import { buildTemplateFacets } from './templateFacets';

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
/**
 * Occasion defaults for generated templates.
 *
 * `headline` and `sub` were removed along with front-cover copy: the front is
 * artwork only and the customer writes their own wording (see
 * utils/frontCover.ts). Only the inside message and the accent colour remain.
 */
export const OCCASION_MESSAGES: Record<OccasionType, { inside: string; defaultColor: string }> = {
  'Birthday': {
    inside: 'May your day be filled with happiness, laughter, and everything you wished for!\n\nWith lots of love,\n[Your Name]',
    defaultColor: '#881337',
  },
  'Anniversary': {
    inside: 'Wishing you both another incredible year of love, companionship, and joy.\n\nWarmest wishes,\n[Your Name]',
    defaultColor: '#4c1d95',
  },
  'Wedding': {
    inside: 'May your life together be blessed with endless happiness, understanding, and affection.\n\nWith all our love,\n[Your Name]',
    defaultColor: '#1c1917',
  },
  'New Baby': {
    inside: 'Wishing your growing family endless joy, sweet snuggles, and magical moments together.\n\nLots of love,\n[Your Name]',
    defaultColor: '#0f766e',
  },
  'Congratulations': {
    inside: 'Your hard work and dedication truly paid off. Wishing you continued success!\n\nBest wishes,\n[Your Name]',
    defaultColor: '#1e3a8a',
  },
  'Thank You': {
    inside: 'Thank you from the bottom of my heart for your generosity and thoughtfulness.\n\nGratefully,\n[Your Name]',
    defaultColor: '#1e3a8a',
  },
  "Valentine's Day": {
    inside: 'Thank you for making my life brighter and fuller every single day. I love you!\n\nYours always,\n[Your Name]',
    defaultColor: '#be123c',
  },
  "Mother's Day": {
    inside: 'Thank you for your endless love, patience, and warmth. You are simply the best.\n\nWith all my love,\n[Your Name]',
    defaultColor: '#9d174d',
  },
  "Father's Day": {
    inside: 'Thank you for always being there with great advice, warm hugs, and steady support.\n\nCheers Dad,\n[Your Name]',
    defaultColor: '#1e293b',
  },
  'Get Well': {
    inside: 'Rest up and take gentle care. Looking forward to seeing you back on your feet soon!\n\nGet well soon,\n[Your Name]',
    defaultColor: '#0369a1',
  },
  'Christmas': {
    inside: 'May the peace and joy of the holiday season stay with you throughout the coming year.\n\nMerry Christmas,\n[Your Name]',
    defaultColor: '#166534',
  },
  'Friendship': {
    inside: 'Life is so much more fun with you as my friend. Thank you for always being you!\n\nCheers,\n[Your Name]',
    defaultColor: '#92400e',
  },
  'Good Luck': {
    inside: 'Cheering you on every step of the way! You have worked hard and you will do great.\n\nRooting for you,\n[Your Name]',
    defaultColor: '#15803d',
  },
  'Retirement': {
    inside: 'Congratulations on a stellar career! May this new season be filled with fun, rest, and travel.\n\nBest wishes,\n[Your Name]',
    defaultColor: '#334155',
  },
  'Thinking of You': {
    inside: 'Holding you close in our thoughts today. Whenever you need a chat, I am right here.\n\nMuch love,\n[Your Name]',
    defaultColor: '#6b21a8',
  },
  'Sympathy': {
    inside: 'May the cherished memories of your loved one bring you comfort, peace, and solace.\n\nWith deepest sympathy,\n[Your Name]',
    defaultColor: '#334155',
  },
  'Graduation': {
    inside: 'Caps off to you! So excited to see all the extraordinary things you will accomplish.\n\nProudly,\n[Your Name]',
    defaultColor: '#1e3a8a',
  },
  'Engagement': {
    inside: 'Wishing you both a lifetime of shared laughter, adventure, and boundless love!\n\nCheers to you both,\n[Your Name]',
    defaultColor: '#7c3aed',
  },
  'Easter': {
    inside: 'Wishing you a bright, sunny Easter filled with peace, sweet treats, and family warmth.\n\nWarmly,\n[Your Name]',
    defaultColor: '#ca8a04',
  },
  'Housewarming': {
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

  return entries.map((entry) => {
    const slug = entry.cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const templateId = `occ-${entry.folderName}-${slug}`;
    const occasionMeta = OCCASION_MESSAGES[entry.occasion] || OCCASION_MESSAGES['Birthday'];

    const title = `${entry.cleanName} ${entry.occasion}`;
    const desc = `Handcrafted ${entry.occasion.toLowerCase()} greeting card featuring artisanal artwork from the ${entry.occasion} collection.`;

    // Every browse facet is derived from the artwork (see utils/templateFacets).
    // The previous hardcoded recipient: 'Anyone' / style: 'Floral' made the
    // recipient, style, photo and milestone filters match nothing.
    const facets = buildTemplateFacets({
      occasion: entry.occasion,
      imageUrl: entry.imageUrl,
    });

    return {
      id: templateId,
      title,
      description: desc,
      ...facets,
      price: priceForStyles(facets.styles),
      thumbnail: entry.imageUrl,
      // The artwork's own palette, which `facets.colors` was derived from — so
      // the swatches a customer sees and the `?color=` facet cannot disagree.
      previewColors: facets.palette,
      altText: `${title} - Front cover artwork`,
      defaultPages: {
        front: {
          pageType: 'front',
          backgroundColor: '#faf8f5',
          backgroundImage: entry.imageUrl,
          // Artwork only. The customer adds their own wording on the front.
          elements: [],
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
              text: 'cardly. • Handcrafted in Europe',
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
 * Base price per style tier, in EUR.
 *
 * Every bundled card used to be stamped 4.29, which made `?maxPrice=` a no-op
 * and hid the price range filter entirely. Tiering by style is a real
 * merchandising decision — a foil/lacquered luxury card costs more to print than
 * a flat cartoon — so the price follows the style we already assign rather than
 * being invented per card. The stored `price` is the *standard* size price;
 * `priceRangeFor` in utils/templateFacets.ts derives the full band from the
 * size multipliers.
 */
const STYLE_PRICE_TIERS: { styles: CardStyleType[]; price: number }[] = [
  { styles: ['Luxury', 'Elegant', 'Minimal'], price: 5.49 },
  { styles: ['Retro', 'Typography', 'Inspirational', 'Floral'], price: 4.29 },
  { styles: ['Modern', 'Colorful', 'Photo'], price: 4.79 },
  { styles: ['Cute', 'Cartoon', 'Funny'], price: 3.99 },
];

/** The standard-size price for a set of styles, cheapest matching tier. */
export function priceForStyles(styles: readonly CardStyleType[]): number {
  for (const tier of STYLE_PRICE_TIERS) {
    if (styles.some((s) => tier.styles.includes(s))) return tier.price;
  }
  return 4.29;
}

/**
 * Creates a complete CardTemplate from an occasion image with customized text, price, and palette.
 */
export function createTemplateFromOccasionImage(options: {
  occasion: OccasionType;
  imageUrl: string;
  title?: string;
  /**
   * There is deliberately no headline/subtext option: the front cover ships as
   * artwork only and the customer writes their own wording (see
   * utils/frontCover.ts). `textColor` is still used for the catalog swatches.
   */
  textColor?: string;
  price?: number;
  /** Omit to derive from the artwork (see utils/templateFacets.ts). */
  recipients?: RecipientType[];
  styles?: CardStyleType[];
  tags?: string[];
  /**
   * Blank template where the customer supplies the cover photo. This is what
   * `isPhotoCard` and the "Photo Card" badge mean — before, nothing in the app
   * could ever set it, so `?photo=1` was permanently empty.
   */
  customerSuppliesPhoto?: boolean;
  /** Only for age-specific cards, e.g. 50 for "Turning 50". */
  milestoneAge?: number;
}): CardTemplate {
  const occasion = options.occasion;
  const occasionMeta = OCCASION_MESSAGES[occasion] || OCCASION_MESSAGES['Birthday'];
  const title = options.title || `${occasion} Artisan Stationery Card`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const id = `occ-user-${slug}-${Date.now().toString(36)}`;
  const textColor = options.textColor || occasionMeta.defaultColor;
  const price = options.price || 4.29;

  const createdAt = new Date().toISOString();

  // Facets come from the artwork where we have a reviewed entry for it, and
  // from the admin's explicit choice otherwise. `rating`/`reviewCount` start at
  // zero and are owned by recomputeTemplateRating — the generator used to write
  // `5.0 from 1 review` and `isPopular: true` for a card nobody had bought.
  const facets = buildTemplateFacets({
    occasion,
    imageUrl: options.imageUrl,
    // The studio's colour choice, over the artwork's own palette, so the
    // admin's pick is what the swatches and the colour facet both use.
    palette: ['#faf8f5', textColor, '#d97706'],
    createdAt,
    existing: {
      ...(options.recipients?.length ? { recipients: options.recipients } : {}),
      ...(options.styles?.length ? { styles: options.styles } : {}),
      // A blank photo card is text + photo; pre-printed artwork is text only.
      ...(options.customerSuppliesPhoto
        ? { personalization: ['photo', 'text'] as const }
        : {}),
      ...(options.tags?.length ? { tags: [occasion.toLowerCase(), 'custom', ...options.tags] } : {}),
    },
  });

  return {
    id,
    title,
    description: `Handcrafted ${occasion.toLowerCase()} card with premium artwork from the ${occasion} collection.`,
    ...facets,
    price,
    thumbnail: options.imageUrl,
    previewColors: facets.palette,
    altText: `${title} - Front cover artwork`,
    // Only stamped when the admin asked for an age-specific card; a general
    // birthday card must not claim to be "Turning 50".
    ...(options.milestoneAge ? { milestoneAge: options.milestoneAge } : {}),
    createdAt,
    defaultPages: {
      front: {
        pageType: 'front',
        backgroundColor: '#faf8f5',
        backgroundImage: options.imageUrl,
        // Artwork only — the customer writes their own message on the front.
        elements: [],
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
            text: 'cardly. • Handcrafted in Europe',
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
