export type CardPageType = 'front' | 'inside-left' | 'inside-right' | 'back';

export type ElementType = 'text' | 'photo' | 'sticker' | 'shape';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number; // percentage 0-100 or pixels in 800x1120 canvas
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees -180 to 180
  zIndex: number;
  opacity?: number;
  locked?: boolean;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number; // pt or px
  color: string;
  textAlign: 'left' | 'center' | 'right';
  fontWeight?: 'normal' | 'bold' | '600' | '700' | '800';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  lineHeight?: number;
  letterSpacing?: number;
  placeholder?: string;
  personalizationField?: 'name' | 'age' | 'message' | 'senderName' | 'custom';

  // Readability & contrast over pictures/backgrounds
  hasBackground?: boolean;
  backgroundColor?: string; // hex or rgb
  backgroundOpacity?: number; // 0 to 1 (e.g. 0.75 for semi-transparent)
  backgroundPadding?: number; // px (e.g. 6 to 16)
  borderRadius?: number; // px (0 = sharp, 8 = rounded, 16 = curved, 9999 = pill)
  backdropBlur?: boolean; // frosted glass blur
  textShadow?: 'none' | 'soft-dark' | 'strong-dark' | 'soft-light' | 'outline-dark' | 'outline-light';
}

export interface PhotoElement extends BaseElement {
  type: 'photo';
  imageUrl: string;
  cropX?: number;
  cropY?: number;
  cropZoom?: number;
  scale?: number;
  aspectRatio?: number;
  placeholder?: boolean;
  filter?: string; // e.g. 'none', 'grayscale', 'sepia', 'warm', 'vintage', 'vivid', 'dim', 'lighten', 'soft'
  brightness?: number; // 40 to 180 percentage (100 = normal)
  contrast?: number; // 50 to 160 percentage (100 = normal)
  blur?: number; // 0 to 10 px soft focus
  overlayTint?: 'none' | 'dark-wash' | 'light-wash' | 'warm-wash' | 'rose-wash';
  overlayOpacity?: number; // 0 to 80 percentage
  borderRadius?: number;
}

export interface StickerElement extends BaseElement {
  type: 'sticker';
  stickerId: string;
  name?: string;
  svgIcon?: string;
  svg?: string;
  emoji?: string;
  color?: string;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'heart' | 'star' | 'badge';
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

export type CardElement = TextElement | PhotoElement | StickerElement | ShapeElement;

export interface CardPageDefinition {
  pageType: CardPageType;
  backgroundColor: string;
  backgroundGradient?: string;
  backgroundImage?: string;
  elements: CardElement[];
}

export type OccasionType =
  | 'Birthday'
  | 'Anniversary'
  | 'Wedding'
  | 'Engagement'
  | 'New Baby'
  | 'Congratulations'
  | 'Thank You'
  | 'Get Well'
  | 'Good Luck'
  | 'Retirement'
  | 'Valentine\'s Day'
  | 'Mother\'s Day'
  | 'Father\'s Day'
  | 'Christmas'
  | 'Easter'
  | 'Friendship'
  | 'Thinking of You'
  | 'Sympathy'
  | 'Graduation'
  | 'Housewarming';

// The recipient/style/tone/season vocabularies are declared once as runtime
// arrays in `utils/templateFacets.ts` — the catalog is Postgres-backed now, so
// these double as the set of values the Browse facets will accept, and a stored
// value outside them would silently drop a card from that filter. The types
// below are derived from those arrays so the two cannot drift.
import type {
  RecipientType,
  CardStyleType,
  CardToneType,
  CardSeasonType,
  PersonalizationType,
  ColorFamily,
} from '../utils/templateFacets';

export type {
  RecipientType,
  CardStyleType,
  CardToneType,
  CardSeasonType,
  PersonalizationType,
  ColorFamily,
};

export interface CardTemplate {
  id: string;
  title: string;
  description: string;
  category: OccasionType;
  subcategory?: string;
  /**
   * Multi-valued on purpose. A card for a friend is also for a "Best Friend",
   * and a felt-craft card is both "Cute" and "Retro"; a single value made those
   * cards unreachable from half the facets. Values already on the card win, and
   * a stored scalar `recipient`/`style` is widened to a one-element array on
   * read, so templates written before this change keep working.
   */
  recipients: RecipientType[];
  styles: CardStyleType[];
  tone: CardToneType;
  /** What the customer personalises. Drives the "Photo Card" badge. */
  personalization: PersonalizationType[];
  tags: string[];
  price: number;
  rating: number;
  reviewCount: number;
  isPhotoCard: boolean;
  isPopular?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  /** Set for age-specific cards ("Turning 50"). Omitted for general art. */
  milestoneAge?: number;
  altText?: string;
  season?: CardSeasonType;
  thumbnail: string;
  previewColors: string[];
  /**
   * Filterable colour facets, derived from `previewColors`. Stored so a
   * `?color=` query is an indexable equality match rather than a scan.
   */
  colors?: ColorFamily[];
  /** ISO timestamp. `isNew` is derived from this rather than latched on. */
  createdAt?: string;
  defaultPages: {
    front: CardPageDefinition;
    insideLeft?: CardPageDefinition;
    insideRight: CardPageDefinition;
    back: CardPageDefinition;
  };
}

export type CardSizeOption = 'standard' | 'large' | 'giant' | 'postcard';
export type CardSize = CardSizeOption;

export interface CardSizeDetail {
  id: CardSizeOption;
  name: string;
  dimensions: string;
  priceMultiplier: number;
  description: string;
}

export type EnvelopeColor = 'white' | 'kraft' | 'gold' | 'blush' | 'navy';

export type CardFinishOption = 'satin' | 'matte' | 'gloss' | 'foil';
