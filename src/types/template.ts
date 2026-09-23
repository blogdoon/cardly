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
  filter?: string; // e.g., 'none', 'sepia', 'grayscale', 'warm'
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
  | 'Thinking of You';

export type RecipientType =
  | 'Her'
  | 'Him'
  | 'Mum'
  | 'Dad'
  | 'Sister'
  | 'Brother'
  | 'Wife'
  | 'Husband'
  | 'Partner'
  | 'Daughter'
  | 'Son'
  | 'Grandparent'
  | 'Friend'
  | 'Best Friend'
  | 'Colleague'
  | 'Kids'
  | 'Anyone';

export type CardStyleType =
  | 'Funny'
  | 'Cute'
  | 'Modern'
  | 'Elegant'
  | 'Floral'
  | 'Minimal'
  | 'Retro'
  | 'Colorful'
  | 'Photo'
  | 'Typography'
  | 'Luxury'
  | 'Cartoon'
  | 'Inspirational';

export interface CardTemplate {
  id: string;
  title: string;
  description: string;
  category: OccasionType;
  subcategory?: string;
  recipient: RecipientType;
  style: CardStyleType;
  tone: 'Humorous' | 'Heartfelt' | 'Cheeky' | 'Sweet' | 'Formal' | 'Playful';
  tags: string[];
  price: number;
  rating: number;
  reviewCount: number;
  isPhotoCard: boolean;
  isPopular?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  milestoneAge?: number;
  thumbnail: string;
  previewColors: string[];
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
