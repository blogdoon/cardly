import { CardElement, CardPageDefinition, CardPageType } from './template';

export interface UserDesign {
  id: string;
  templateId: string;
  userId: string;
  title: string;
  previewThumbnail?: string;
  pages: {
    front: CardPageDefinition;
    insideLeft?: CardPageDefinition;
    insideRight: CardPageDefinition;
    back: CardPageDefinition;
  };
  currentPage?: CardPageType;
  selectedElementId?: string | null;
  history?: Array<{
    pages: {
      front: CardPageDefinition;
      insideLeft?: CardPageDefinition;
      insideRight: CardPageDefinition;
      back: CardPageDefinition;
    };
  }>;
  historyIndex?: number;
  createdAt: string;
  updatedAt: string;
}

export type AutosaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';
