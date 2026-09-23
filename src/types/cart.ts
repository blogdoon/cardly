import { CardSizeOption, EnvelopeColor } from './template';
import { UserDesign } from './design';

export interface CartAddon {
  id: string;
  name: string;
  price: number;
  description: string;
}

export type CardAddon = CartAddon;

export interface CartItem {
  id: string;
  templateId: string;
  designId?: string;
  title: string;
  thumbnail: string;
  cardSize: CardSizeOption;
  envelopeColor: EnvelopeColor;
  quantity: number;
  unitPrice: number;
  addons: CartAddon[];
  designSnapshot?: UserDesign;
  customSummary?: {
    recipientName?: string;
    customMessageSnippet?: string;
  };
}

export interface PromoCode {
  code: string;
  discountPercentage: number;
  description: string;
}
