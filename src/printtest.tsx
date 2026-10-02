/**
 * TEMPORARY print harness — not part of the app, delete after verification.
 * Mounts PrintPreview open, so headless Chromium can paginate it.
 */
import {createRoot} from 'react-dom/client';
import {PrintPreview} from './components/PrintPreview';
import type {CardPageDefinition, TextElement} from './types/template';
import './index.css';

const text = (id: string, value: string, fontSize: number, color: string): TextElement => ({
  id,
  type: 'text',
  text: value,
  x: 50,
  y: 50,
  width: 90,
  height: 30,
  rotation: 0,
  zIndex: 1,
  fontFamily: 'Inter',
  fontSize,
  color,
  textAlign: 'center',
  fontWeight: 'bold',
});

const page = (pageType: CardPageDefinition['pageType'], bg: string, label: string, size: number, color: string): CardPageDefinition => ({
  pageType,
  backgroundColor: bg,
  elements: [text(`${pageType}-1`, label, size, color)],
});

export const pages = {
  back: page('back', '#fef3c7', 'BACK COVER', 70, '#7c2d12'),
  front: page('front', '#ffe4e6', 'FRONT COVER', 90, '#9f1239'),
  insideLeft: page('inside-left', '#ffffff', 'INSIDE LEFT (blank)', 50, '#94a3b8'),
  insideRight: page('inside-right', '#ecfdf5', 'INSIDE RIGHT (message)', 70, '#065f46'),
};

createRoot(document.getElementById('root')!).render(
  <PrintPreview
    isOpen
    onClose={() => undefined}
    title="Harness card"
    pages={pages}
    templateId="harness"
  />,
);
