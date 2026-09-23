import React, { useState, useEffect, useRef } from 'react';
import { EditorToolbar } from '../components/Editor/EditorToolbar';
import { EditorSidebar } from '../components/Editor/EditorSidebar';
import { CardCanvas } from '../components/Editor/CardCanvas';
import { PropertyPanel } from '../components/Editor/PropertyPanel';
import { PreviewModal } from '../components/PreviewModal';
import { CardTemplate, CardPageType, CardPageDefinition, CardElement, TextElement, PhotoElement, StickerElement } from '../types/template';
import { UserDesign, AutosaveStatus } from '../types/design';
import { getTemplateById } from '../data/templates';
import { saveUserDesign } from '../services/cardStorage';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

interface CardEditorProps {
  templateId: string;
  initialDesign?: UserDesign | null;
  onBack: () => void;
  onFinish: () => void;
}

export const CardEditor: React.FC<CardEditorProps> = ({
  templateId,
  initialDesign,
  onBack,
  onFinish,
}) => {
  const template = getTemplateById(templateId);
  const { user } = useAuth();
  const { addItem } = useCart();

  const [designId] = useState<string>(
    () => initialDesign?.id || `design_${templateId}_${Date.now()}`
  );
  const [saveToast, setSaveToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [title, setTitle] = useState<string>(
    initialDesign?.title || template?.title || 'Personalized Greeting Card'
  );
  const [currentPage, setCurrentPage] = useState<CardPageType>('front');
  const [zoom, setZoom] = useState<number>(0.9);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('saved');

  // Pages state
  const [pages, setPages] = useState<{
    front: CardPageDefinition;
    insideLeft: CardPageDefinition;
    insideRight: CardPageDefinition;
    back: CardPageDefinition;
  }>(() => {
    if (initialDesign) {
      return {
        front: initialDesign.pages.front,
        insideLeft: initialDesign.pages.insideLeft || { pageType: 'inside-left', backgroundColor: '#ffffff', elements: [] },
        insideRight: initialDesign.pages.insideRight,
        back: initialDesign.pages.back,
      };
    }

    if (template) {
      return {
        front: JSON.parse(JSON.stringify(template.defaultPages.front)),
        insideLeft: template.defaultPages.insideLeft
          ? JSON.parse(JSON.stringify(template.defaultPages.insideLeft))
          : { pageType: 'inside-left', backgroundColor: '#ffffff', elements: [] },
        insideRight: JSON.parse(JSON.stringify(template.defaultPages.insideRight)),
        back: JSON.parse(JSON.stringify(template.defaultPages.back)),
      };
    }

    return {
      front: { pageType: 'front', backgroundColor: '#ffffff', elements: [] },
      insideLeft: { pageType: 'inside-left', backgroundColor: '#ffffff', elements: [] },
      insideRight: { pageType: 'inside-right', backgroundColor: '#ffffff', elements: [] },
      back: { pageType: 'back', backgroundColor: '#ffffff', elements: [] },
    };
  });

  // Undo / Redo history
  const [history, setHistory] = useState<Array<typeof pages>>([pages]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Quick fill fields
  const [quickFields, setQuickFields] = useState({
    name: template?.recipient || '',
    message: 'Wishing you a very Happy Birthday! With lots of love x',
  });

  const activePageDefinition =
    currentPage === 'front'
      ? pages.front
      : currentPage === 'inside-left'
      ? pages.insideLeft
      : currentPage === 'inside-right'
      ? pages.insideRight
      : pages.back;

  const selectedElement =
    activePageDefinition.elements.find((el) => el.id === selectedElementId) || null;

  // Push new state to history & mark autosave
  const pushState = (newPages: typeof pages) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newPages);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setPages(newPages);
    setAutosaveStatus('unsaved');
  };

  // Autosave effect (debounced 1.5 seconds)
  useEffect(() => {
    if (autosaveStatus !== 'unsaved') return;

    setAutosaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const designToSave: UserDesign = {
          id: designId,
          templateId,
          userId: user?.uid || 'guest_user',
          title,
          pages,
          previewThumbnail: template?.thumbnail || '',
          createdAt: initialDesign?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await saveUserDesign(designToSave);
        setAutosaveStatus('saved');
      } catch (err) {
        console.warn('Autosave warning:', err);
        setAutosaveStatus('unsaved');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [pages, title, autosaveStatus, initialDesign, templateId, user, template, designId]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setPages(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setPages(history[historyIndex + 1]);
    }
  };

  const handleZoomChange = (delta: number) => {
    setZoom((prev) => Math.min(1.5, Math.max(0.6, Math.round((prev + delta) * 10) / 10)));
  };

  // Update elements inside current page
  const updateCurrentPageElements = (elements: CardElement[]) => {
    const updated = {
      ...pages,
      [currentPage === 'front'
        ? 'front'
        : currentPage === 'inside-left'
        ? 'insideLeft'
        : currentPage === 'inside-right'
        ? 'insideRight'
        : 'back']: {
        ...activePageDefinition,
        elements,
      },
    };
    pushState(updated);
  };

  const handleUpdateElement = (updated: CardElement) => {
    const nextElements = activePageDefinition.elements.map((el) =>
      el.id === updated.id ? updated : el
    );
    updateCurrentPageElements(nextElements);
  };

  const handleDeleteElement = (id: string) => {
    const nextElements = activePageDefinition.elements.filter((el) => el.id !== id);
    updateCurrentPageElements(nextElements);
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const handleDuplicateElement = (element: CardElement) => {
    const clone: CardElement = {
      ...element,
      id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      x: Math.min(90, element.x + 5),
      y: Math.min(90, element.y + 5),
      zIndex: activePageDefinition.elements.length + 1,
    };
    updateCurrentPageElements([...activePageDefinition.elements, clone]);
    setSelectedElementId(clone.id);
  };

  const handleBringForward = (id: string) => {
    const elements = [...activePageDefinition.elements];
    const index = elements.findIndex((el) => el.id === id);
    if (index < elements.length - 1) {
      const temp = elements[index];
      elements[index] = elements[index + 1];
      elements[index + 1] = temp;
      elements.forEach((el, i) => (el.zIndex = i + 1));
      updateCurrentPageElements(elements);
    }
  };

  const handleSendBackward = (id: string) => {
    const elements = [...activePageDefinition.elements];
    const index = elements.findIndex((el) => el.id === id);
    if (index > 0) {
      const temp = elements[index];
      elements[index] = elements[index - 1];
      elements[index - 1] = temp;
      elements.forEach((el, i) => (el.zIndex = i + 1));
      updateCurrentPageElements(elements);
    }
  };

  const handleBringToFront = (id: string) => {
    const elements = [...activePageDefinition.elements];
    const index = elements.findIndex((el) => el.id === id);
    if (index >= 0 && index < elements.length - 1) {
      const [item] = elements.splice(index, 1);
      elements.push(item);
      elements.forEach((el, i) => (el.zIndex = i + 1));
      updateCurrentPageElements(elements);
    }
  };

  const handleSendToBack = (id: string) => {
    const elements = [...activePageDefinition.elements];
    const index = elements.findIndex((el) => el.id === id);
    if (index > 0) {
      const [item] = elements.splice(index, 1);
      elements.unshift(item);
      elements.forEach((el, i) => (el.zIndex = i + 1));
      updateCurrentPageElements(elements);
    }
  };

  // Adding new elements
  const handleAddText = (type: 'heading' | 'subheading' | 'body') => {
    const id = `txt_${Date.now()}`;
    const newText: TextElement = {
      id,
      type: 'text',
      x: 50,
      y: 50,
      width: type === 'body' ? 70 : 60,
      height: 20,
      rotation: 0,
      zIndex: activePageDefinition.elements.length + 1,
      text:
        type === 'heading'
          ? 'Happy Birthday!'
          : type === 'subheading'
          ? 'To Someone Special'
          : 'Wishing you a wonderful day filled with happiness.',
      fontFamily: type === 'heading' ? 'Playfair Display' : type === 'subheading' ? 'Montserrat' : 'Caveat',
      fontSize: type === 'heading' ? 36 : type === 'subheading' ? 22 : 18,
      color: '#1e293b',
      textAlign: 'center',
      fontWeight: type === 'heading' ? 'bold' : 'normal',
    };
    updateCurrentPageElements([...activePageDefinition.elements, newText]);
    setSelectedElementId(id);
  };

  const handleAddPhoto = (imageUrl: string) => {
    const id = `img_${Date.now()}`;
    const newPhoto: PhotoElement = {
      id,
      type: 'photo',
      x: 50,
      y: 50,
      width: 50,
      height: 40,
      rotation: 0,
      zIndex: activePageDefinition.elements.length + 1,
      imageUrl,
      borderRadius: 12,
      scale: 1,
    };
    updateCurrentPageElements([...activePageDefinition.elements, newPhoto]);
    setSelectedElementId(id);
  };

  const handleAddSticker = (
    stickerId: string,
    svg?: string,
    emoji?: string,
    color?: string,
    name?: string
  ) => {
    const id = `stk_${Date.now()}`;
    const newSticker: StickerElement = {
      id,
      type: 'sticker',
      x: 50,
      y: 50,
      width: 22,
      height: 22,
      rotation: 0,
      zIndex: activePageDefinition.elements.length + 1,
      stickerId,
      svg,
      emoji,
      color: color || '#e11d48',
      name,
    };
    updateCurrentPageElements([...activePageDefinition.elements, newSticker]);
    setSelectedElementId(id);
  };

  const handleBackgroundChange = (color: string, gradient?: string) => {
    const updated = {
      ...pages,
      [currentPage === 'front'
        ? 'front'
        : currentPage === 'inside-left'
        ? 'insideLeft'
        : currentPage === 'inside-right'
        ? 'insideRight'
        : 'back']: {
        ...activePageDefinition,
        backgroundColor: color,
        backgroundGradient: gradient,
      },
    };
    pushState(updated);
  };

  // Quick field updates (updates text element on active page or front page)
  const handleQuickFieldChange = (field: 'name' | 'message', val: string) => {
    setQuickFields((prev) => ({ ...prev, [field]: val }));

    if (field === 'name') {
      // Find recipient text on front page
      const frontElements = [...pages.front.elements];
      const nameIndex = frontElements.findIndex(
        (el) => el.type === 'text' && (el as TextElement).text.length < 25
      );
      if (nameIndex >= 0) {
        (frontElements[nameIndex] as TextElement).text = val;
        pushState({
          ...pages,
          front: { ...pages.front, elements: frontElements },
        });
      }
    } else if (field === 'message') {
      // Update inside right message
      const insideElements = [...pages.insideRight.elements];
      const msgIndex = insideElements.findIndex((el) => el.type === 'text');
      if (msgIndex >= 0) {
        (insideElements[msgIndex] as TextElement).text = val;
      } else {
        insideElements.push({
          id: `txt_msg_${Date.now()}`,
          type: 'text',
          x: 50,
          y: 50,
          width: 70,
          height: 30,
          rotation: 0,
          zIndex: 1,
          text: val,
          fontFamily: 'Caveat',
          fontSize: 22,
          color: '#334155',
          textAlign: 'center',
        });
      }
      pushState({
        ...pages,
        insideRight: { ...pages.insideRight, elements: insideElements },
      });
    }
  };

  const handleManualSave = async () => {
    try {
      setAutosaveStatus('saving');
      const designToSave: UserDesign = {
        id: designId,
        templateId,
        userId: user?.uid || 'guest_user',
        title,
        pages,
        previewThumbnail: template?.thumbnail || '',
        createdAt: initialDesign?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveUserDesign(designToSave);
      setAutosaveStatus('saved');
      setSaveToast({ message: 'Customized design saved successfully!', type: 'success' });
      setTimeout(() => setSaveToast(null), 3000);
    } catch (err) {
      console.error('Save design error:', err);
      setAutosaveStatus('unsaved');
      setSaveToast({ message: 'Could not save design. Please try again.', type: 'error' });
      setTimeout(() => setSaveToast(null), 3500);
    }
  };

  const handleAddToBasket = async () => {
    const designToSave: UserDesign = {
      id: designId,
      templateId,
      userId: user?.uid || 'guest_user',
      title,
      pages,
      previewThumbnail: template?.thumbnail || '',
      createdAt: initialDesign?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveUserDesign(designToSave);
    } catch (e) {
      console.warn('Could not save design before checkout:', e);
    }

    addItem({
      templateId,
      designId,
      designSnapshot: designToSave,
      title,
      thumbnail: template?.thumbnail || '',
      cardSize: 'standard',
      envelopeColor: 'white',
      quantity: 1,
      unitPrice: template?.price || 3.99,
      addons: [],
      customSummary: {
        recipientName: quickFields.name || 'Friend',
        customMessageSnippet: quickFields.message.slice(0, 45) + '...',
      },
    });
    onFinish();
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-white relative">
      {/* Toast Notification */}
      {saveToast && (
        <div
          className={`absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-lg border text-xs font-bold flex items-center gap-2 transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            saveToast.type === 'success'
              ? 'bg-emerald-900/95 text-emerald-100 border-emerald-700/60'
              : 'bg-rose-900/95 text-rose-100 border-rose-700/60'
          }`}
        >
          <span>{saveToast.message}</span>
        </div>
      )}

      {/* Top action toolbar */}
      <EditorToolbar
        title={title}
        onTitleChange={setTitle}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        autosaveStatus={autosaveStatus}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        onPreview={() => setIsPreviewOpen(true)}
        onSave={handleManualSave}
        onAddToBasket={handleAddToBasket}
        onBack={onBack}
      />

      {/* Main editor split area: Left sidebar | Center Canvas | Right inspector */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <EditorSidebar
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onAddText={handleAddText}
          onAddPhoto={handleAddPhoto}
          onAddSticker={handleAddSticker}
          onBackgroundChange={handleBackgroundChange}
          quickFields={quickFields}
          onQuickFieldChange={handleQuickFieldChange}
        />

        {/* Center Interactive Canvas */}
        <CardCanvas
          page={activePageDefinition}
          zoom={zoom}
          selectedElementId={selectedElementId}
          onSelectElement={setSelectedElementId}
          onUpdateElement={handleUpdateElement}
          onDeleteSelected={() => selectedElementId && handleDeleteElement(selectedElementId)}
        />

        {/* Right Inspector Property Panel */}
        <PropertyPanel
          selectedElement={selectedElement}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteElement}
          onDuplicateElement={handleDuplicateElement}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
        />
      </div>

      {/* Realistic 3D & Flat Preview Modal */}
      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={title}
        pages={pages}
        onProceedToCart={() => {
          setIsPreviewOpen(false);
          handleAddToBasket();
        }}
      />
    </div>
  );
};
