import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EditorToolbar } from '../components/Editor/EditorToolbar';
import { EditorSidebar, TabType } from '../components/Editor/EditorSidebar';
import { CardCanvas } from '../components/Editor/CardCanvas';
import { PropertyPanel } from '../components/Editor/PropertyPanel';
import { PreviewModal } from '../components/PreviewModal';
import { PrintPreview } from '../components/PrintPreview';
import { StickerLibraryPanel } from '../components/Editor/StickerLibraryPanel';
import { CardTemplate, CardPageType, CardPageDefinition, CardElement, TextElement, PhotoElement, StickerElement } from '../types/template';
import { UserDesign, AutosaveStatus } from '../types/design';
import { getTemplateById } from '../data/templates';
import {
  saveUserDesign,
  getDesignById,
  saveActiveDraftId,
  getLocalDesigns,
} from '../services/cardStorage';
import { auth } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { X, Sparkles, Undo2, Redo2 } from 'lucide-react';

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

  const [designId] = useState<string>(() => {
    if (initialDesign?.id) return initialDesign.id;
    try {
      // Only the URL's design id identifies an in-progress/existing design. A stale
      // active-draft id would silently reopen the card the user saved last time.
      const urlDesign = new URLSearchParams(window.location.search).get('design');
      if (urlDesign) return urlDesign;
    } catch (e) {
      console.warn(e);
    }
    return `design_${templateId}_${Date.now()}`;
  });

  const [saveToast, setSaveToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [title, setTitle] = useState<string>(
    initialDesign?.title || template?.title || 'Personalized Greeting Card'
  );
  const [currentPage, setCurrentPage] = useState<CardPageType>('front');
  const [zoom, setZoom] = useState<number>(0.9);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<TabType>('quick');
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [gridSize, setGridSize] = useState<number>(5);
  const [showCenterGuides, setShowCenterGuides] = useState<boolean>(true);
  const [showSafeMargin, setShowSafeMargin] = useState<boolean>(true);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(new Date());

  // Pages state — restores cached draft if user reloaded the page
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

    try {
      const activeDraftId = new URLSearchParams(window.location.search).get('design');
      if (activeDraftId) {
        const localDesigns = getLocalDesigns();
        // Match by id AND template: never fall back to "any design of this template",
        // which restored the previously saved card instead of the template defaults.
        const cached = localDesigns.find(
          (d) => d.id === activeDraftId && d.templateId === templateId
        );
        if (cached?.pages?.front) {
          return {
            front: cached.pages.front,
            insideLeft: cached.pages.insideLeft || { pageType: 'inside-left', backgroundColor: '#ffffff', elements: [] },
            insideRight: cached.pages.insideRight,
            back: cached.pages.back,
          };
        }
      }
    } catch (e) {
      console.warn(e);
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

  // Track last saved snapshot to prevent redundant writes
  const lastSavedPagesRef = useRef<string>(JSON.stringify(pages));
  const lastSavedTitleRef = useRef<string>(title);
  const isSavingRef = useRef<boolean>(false);

  // Undo / Redo history state (up to 50 snapshots)
  const [history, setHistory] = useState<Array<typeof pages>>([pages]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [undoToast, setUndoToast] = useState<{ message: string; action: 'undo' | 'redo' } | null>(null);
  const historyDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // The mobile properties sheet only exists while an element is selected
  useEffect(() => {
    if (!selectedElementId) setIsPropertiesOpen(false);
  }, [selectedElementId]);

  // Synchronize designId & templateId with browser URL so that pressing Reload preserves this exact design
  useEffect(() => {
    try {
      const currentUrl = new URL(window.location.href);
      if (
        currentUrl.searchParams.get('design') !== designId ||
        currentUrl.searchParams.get('template') !== templateId
      ) {
        currentUrl.searchParams.set('template', templateId);
        currentUrl.searchParams.set('design', designId);
        window.history.replaceState({}, '', currentUrl.toString());
      }
      saveActiveDraftId(templateId, designId);
    } catch (e) {
      console.warn(e);
    }
  }, [designId, templateId]);

  // Query Firestore asynchronously upon initial load if opening existing design
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const effectiveUserId = user?.uid || auth?.currentUser?.uid;
      if (effectiveUserId && designId && !initialDesign) {
        try {
          const remoteDoc = await getDesignById(designId, effectiveUserId);
          if (isMounted && remoteDoc && remoteDoc.pages?.front) {
            if (historyIndex === 0) {
              const loadedPages = {
                front: remoteDoc.pages.front,
                insideLeft: remoteDoc.pages.insideLeft || {
                  pageType: 'inside-left',
                  backgroundColor: '#ffffff',
                  elements: [],
                },
                insideRight: remoteDoc.pages.insideRight,
                back: remoteDoc.pages.back,
              };
              setPages(loadedPages);
              setHistory([loadedPages]);
              setHistoryIndex(0);
              if (remoteDoc.title) setTitle(remoteDoc.title);
              lastSavedPagesRef.current = JSON.stringify(loadedPages);
              lastSavedTitleRef.current = remoteDoc.title;
            }
          }
        } catch (e) {
          console.warn('Could not sync remote design:', e);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [designId, user, initialDesign, historyIndex]);

  // Push new state to history & mark autosave
  const pushState = useCallback(
    (newPages: typeof pages, mode: 'commit' | 'debounce' | 'live' = 'commit') => {
      // 1. Live mode: update canvas display state without creating a history step (e.g. while dragging)
      if (mode === 'live') {
        setPages(newPages);
        setAutosaveStatus('unsaved');
        return;
      }

      // 2. Debounce mode: batch rapid edits (e.g. typing text or sliding sliders) so 1 history step is created per pause
      if (mode === 'debounce') {
        setPages(newPages);
        setAutosaveStatus('unsaved');

        if (historyDebounceTimerRef.current) {
          clearTimeout(historyDebounceTimerRef.current);
        }

        historyDebounceTimerRef.current = setTimeout(() => {
          setHistory((prevHistory) => {
            const nextHistory = prevHistory.slice(0, historyIndex + 1);
            if (nextHistory.length >= 50) {
              nextHistory.shift();
            }
            nextHistory.push(newPages);
            setHistoryIndex(nextHistory.length - 1);
            return nextHistory;
          });
          historyDebounceTimerRef.current = null;
        }, 500);
        return;
      }

      // 3. Commit mode: immediate discrete snapshot
      if (historyDebounceTimerRef.current) {
        clearTimeout(historyDebounceTimerRef.current);
        historyDebounceTimerRef.current = null;
      }

      setHistory((prevHistory) => {
        const nextHistory = prevHistory.slice(0, historyIndex + 1);
        if (nextHistory.length >= 50) {
          nextHistory.shift();
        }
        nextHistory.push(newPages);
        setHistoryIndex(nextHistory.length - 1);
        return nextHistory;
      });

      setPages(newPages);
      setAutosaveStatus('unsaved');
    },
    [historyIndex]
  );

  // Central save function (persists to Firestore and localStorage)
  const performSave = useCallback(
    async (isManual: boolean = false): Promise<void> => {
      if (isSavingRef.current) return;

      const currentPagesStr = JSON.stringify(pages);
      const hasChanges =
        currentPagesStr !== lastSavedPagesRef.current ||
        title !== lastSavedTitleRef.current;

      if (!hasChanges && !isManual) {
        return;
      }

      isSavingRef.current = true;
      setAutosaveStatus('saving');

      try {
        const effectiveUserId = user?.uid || auth?.currentUser?.uid || 'guest_user';
        const designToSave: UserDesign = {
          id: designId,
          templateId,
          userId: effectiveUserId,
          title: title.trim() || template?.title || 'Personalized Greeting Card',
          pages,
          previewThumbnail: template?.thumbnail || '',
          createdAt: initialDesign?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await saveUserDesign(designToSave);

        lastSavedPagesRef.current = currentPagesStr;
        lastSavedTitleRef.current = title;
        setAutosaveStatus('saved');
        setLastSavedAt(new Date());

        if (isManual) {
          setSaveToast({ message: 'Customized design saved to cloud & device!', type: 'success' });
          setTimeout(() => setSaveToast(null), 3000);
        }
      } catch (err) {
        console.warn('Auto-save error:', err);
        setAutosaveStatus('unsaved');
        if (isManual) {
          setSaveToast({
            message: 'Saved to local device. Will sync to cloud once connected.',
            type: 'error',
          });
          setTimeout(() => setSaveToast(null), 3500);
        }
      } finally {
        isSavingRef.current = false;
      }
    },
    [pages, title, designId, templateId, user, template, initialDesign]
  );

  // Debounced auto-save (1.5 seconds after user stops typing/dragging)
  useEffect(() => {
    if (autosaveStatus !== 'unsaved') return;

    const timer = setTimeout(() => {
      performSave(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [autosaveStatus, performSave]);

  // Periodic Auto-Save Interval (runs every 15 seconds to ensure changes are synced to Firestore)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentPagesStr = JSON.stringify(pages);
      if (
        currentPagesStr !== lastSavedPagesRef.current ||
        title !== lastSavedTitleRef.current ||
        autosaveStatus === 'unsaved'
      ) {
        performSave(false);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [pages, title, autosaveStatus, performSave]);

  // Immediate synchronous flush before reload/unload or when tab is hidden
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const effectiveUserId = user?.uid || auth?.currentUser?.uid || 'guest_user';
        const designToSave: UserDesign = {
          id: designId,
          templateId,
          userId: effectiveUserId,
          title: title.trim() || template?.title || 'Personalized Greeting Card',
          pages,
          previewThumbnail: template?.thumbnail || '',
          createdAt: initialDesign?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        saveUserDesign(designToSave);
      } catch (e) {
        console.warn('Beforeunload auto-save error:', e);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        performSave(false);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pages, title, designId, templateId, user, template, initialDesign, performSave]);

  const handleUndo = useCallback(() => {
    if (historyDebounceTimerRef.current) {
      clearTimeout(historyDebounceTimerRef.current);
      historyDebounceTimerRef.current = null;
    }

    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      const targetPages = history[nextIndex];
      setHistoryIndex(nextIndex);
      setPages(targetPages);
      setAutosaveStatus('unsaved');

      const pageElements =
        currentPage === 'front'
          ? targetPages.front.elements
          : currentPage === 'inside-left'
          ? targetPages.insideLeft?.elements || []
          : currentPage === 'inside-right'
          ? targetPages.insideRight.elements
          : targetPages.back.elements;

      if (selectedElementId && !pageElements.some((el) => el.id === selectedElementId)) {
        setSelectedElementId(null);
      }

      setUndoToast({ message: 'Action undone', action: 'undo' });
      setTimeout(() => setUndoToast(null), 1200);
    }
  }, [historyIndex, history, currentPage, selectedElementId]);

  const handleRedo = useCallback(() => {
    if (historyDebounceTimerRef.current) {
      clearTimeout(historyDebounceTimerRef.current);
      historyDebounceTimerRef.current = null;
    }

    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const targetPages = history[nextIndex];
      setHistoryIndex(nextIndex);
      setPages(targetPages);
      setAutosaveStatus('unsaved');

      const pageElements =
        currentPage === 'front'
          ? targetPages.front.elements
          : currentPage === 'inside-left'
          ? targetPages.insideLeft?.elements || []
          : currentPage === 'inside-right'
          ? targetPages.insideRight.elements
          : targetPages.back.elements;

      if (selectedElementId && !pageElements.some((el) => el.id === selectedElementId)) {
        setSelectedElementId(null);
      }

      setUndoToast({ message: 'Action redone', action: 'redo' });
      setTimeout(() => setUndoToast(null), 1200);
    }
  }, [historyIndex, history, currentPage, selectedElementId]);

  // Global Keyboard Shortcuts for Undo & Redo (Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z / Cmd/Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (isInput) return;

      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      if (isCtrlOrCmd && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'z') ||
        (isCtrlOrCmd && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const handleZoomChange = (delta: number) => {
    setZoom((prev) => Math.min(1.5, Math.max(0.6, Math.round((prev + delta) * 10) / 10)));
  };

  // Update elements inside current page
  const updateCurrentPageElements = useCallback(
    (elements: CardElement[], mode: 'commit' | 'debounce' | 'live' = 'commit') => {
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
      pushState(updated, mode);
    },
    [pages, currentPage, activePageDefinition, pushState]
  );

  const handleUpdateElement = useCallback(
    (updated: CardElement, commitMode: boolean | 'commit' | 'debounce' | 'live' = 'commit') => {
      const currentElements = activePageDefinition.elements;
      const prevElement = currentElements.find((el) => el.id === updated.id);

      const nextElements = currentElements.map((el) =>
        el.id === updated.id ? updated : el
      );

      let mode: 'commit' | 'debounce' | 'live' = 'commit';
      if (typeof commitMode === 'boolean') {
        mode = commitMode ? 'commit' : 'live';
      } else {
        mode = commitMode;
      }

      if (mode === 'commit' && prevElement) {
        if (prevElement.type === 'text' && updated.type === 'text') {
          if (prevElement.text !== updated.text) {
            mode = 'debounce';
          }
        } else if (prevElement.type === 'photo' && updated.type === 'photo') {
          if (
            prevElement.brightness !== updated.brightness ||
            prevElement.contrast !== updated.contrast ||
            prevElement.blur !== updated.blur ||
            prevElement.overlayOpacity !== updated.overlayOpacity
          ) {
            mode = 'debounce';
          }
        } else if (prevElement.type === 'sticker' && updated.type === 'sticker') {
          if (prevElement.width !== updated.width) {
            mode = 'debounce';
          }
        }
      }

      updateCurrentPageElements(nextElements, mode);
    },
    [activePageDefinition, updateCurrentPageElements]
  );

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
    const hasPhotoOrBg = Boolean(
      activePageDefinition.backgroundImage ||
      activePageDefinition.elements.some((el) => el.type === 'photo')
    );

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
      hasBackground: hasPhotoOrBg,
      backgroundColor: '#ffffff',
      backgroundOpacity: 0.85,
      borderRadius: 10,
      backgroundPadding: 8,
      textShadow: hasPhotoOrBg ? 'soft-dark' : 'none',
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
    name?: string,
    sizePercent?: number
  ) => {
    const id = `stk_${Date.now()}`;
    const size = sizePercent || 22;
    // Stagger slightly so multiple stickers added in succession don't stack directly on top of each other
    const existingStickerCount = activePageDefinition.elements.filter((e) => e.type === 'sticker').length;
    const offset = (existingStickerCount % 4) * 4 - 6;

    const newSticker: StickerElement = {
      id,
      type: 'sticker',
      x: 50 + offset,
      y: 50 + offset,
      width: size,
      height: size,
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
        pushState(
          {
            ...pages,
            front: { ...pages.front, elements: frontElements },
          },
          'debounce'
        );
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
      pushState(
        {
          ...pages,
          insideRight: { ...pages.insideRight, elements: insideElements },
        },
        'debounce'
      );
    }
  };

  const handleManualSave = async () => {
    await performSave(true);
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

  // Shared inspector: rendered as the desktop right sidebar AND inside the mobile properties sheet
  const inspectorPanel = (
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
  );

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

      {/* Undo / Redo Floating Toast */}
      {undoToast && (
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full shadow-lg bg-slate-900/90 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-150"
        >
          {undoToast.action === 'undo' ? (
            <Undo2 className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <Redo2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>{undoToast.message}</span>
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
        lastSavedAt={lastSavedAt}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        onPreview={() => setIsPreviewOpen(true)}
        onPrint={() => setIsPrintPreviewOpen(true)}
        onOpenStickers={() => {
          setSidebarTab('elements');
        }}
        showGrid={showGrid}
        snapToGrid={snapToGrid}
        gridSize={gridSize}
        showCenterGuides={showCenterGuides}
        showSafeMargin={showSafeMargin}
        onToggleGrid={() => setShowGrid((prev) => !prev)}
        onToggleSnap={() => setSnapToGrid((prev) => !prev)}
        onGridSizeChange={setGridSize}
        onToggleCenterGuides={() => setShowCenterGuides((prev) => !prev)}
        onToggleSafeMargin={() => setShowSafeMargin((prev) => !prev)}
        onSave={handleManualSave}
        onAddToBasket={handleAddToBasket}
        onBack={onBack}
      />

      {/* Main editor split area
          Desktop: sidebar | canvas | inspector
          Mobile:  canvas | contextual bar / properties sheet | bottom dock */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Toolbar — desktop sidebar, mobile bottom dock */}
        <div className="order-3 shrink-0 md:order-1">
          <EditorSidebar
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onAddText={handleAddText}
            onAddPhoto={handleAddPhoto}
            onAddSticker={handleAddSticker}
            onBackgroundChange={handleBackgroundChange}
            quickFields={quickFields}
            onQuickFieldChange={handleQuickFieldChange}
            activeTab={sidebarTab}
            onTabChange={setSidebarTab}
          />
        </div>

        {/* Center Interactive Canvas */}
        <div className="order-1 flex flex-1 min-h-0 md:order-2">
          <CardCanvas
            page={activePageDefinition}
            zoom={zoom}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onUpdateElement={handleUpdateElement}
            onDeleteSelected={() => selectedElementId && handleDeleteElement(selectedElementId)}
            showGrid={showGrid}
            snapToGrid={snapToGrid}
            gridSize={gridSize}
            showCenterGuides={showCenterGuides}
            showSafeMargin={showSafeMargin}
            onToggleGrid={() => setShowGrid((prev) => !prev)}
            onToggleSnap={() => setSnapToGrid((prev) => !prev)}
            onGridSizeChange={setGridSize}
          />
        </div>

        {/* Mobile only: contextual bar while selected, properties sheet on explicit Edit/Style/Position tap.
            Both sit in normal flow, so they can never cover the canvas or intercept a drag. */}
        {selectedElement && (
          <div className="order-2 shrink-0 border-t border-slate-200 bg-white md:hidden">
            {isPropertiesOpen ? (
              <div className="flex max-h-[45vh] flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                    Element Properties
                  </span>
                  <button
                    onClick={() => setIsPropertiesOpen(false)}
                    className="p-2 text-slate-500 hover:text-slate-800"
                    title="Close properties"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="overflow-y-auto p-1">{inspectorPanel}</div>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-1.5 p-2">
                <button
                  onClick={() => setIsPropertiesOpen(true)}
                  className="min-h-11 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-700 active:bg-rose-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => setIsPropertiesOpen(true)}
                  className="min-h-11 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-700 active:bg-rose-50"
                >
                  Style
                </button>
                <button
                  onClick={() => setIsPropertiesOpen(true)}
                  className="min-h-11 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-700 active:bg-rose-50"
                >
                  Position
                </button>
                <button
                  onClick={() => handleDuplicateElement(selectedElement)}
                  className="min-h-11 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-700 active:bg-rose-50"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => handleDeleteElement(selectedElement.id)}
                  className="min-h-11 rounded-xl border border-rose-200 bg-rose-50 text-[11px] font-bold text-rose-600 active:bg-rose-100"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}

        {/* Right Inspector Property Panel — desktop only */}
        <div className="order-4 hidden shrink-0 md:order-3 md:flex md:w-64 lg:w-72">
          {inspectorPanel}
        </div>
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
        onOpenPrintPreview={() => {
          setIsPreviewOpen(false);
          setIsPrintPreviewOpen(true);
        }}
      />

      {/* Standard Paper Size Print Studio & Preview */}
      <PrintPreview
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        title={title}
        templateId={templateId}
        designId={designId}
        pages={pages}
      />

      {/* Expanded Full-Screen Sticker Library Modal */}
      {isStickerModalOpen && (
        <div className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Sticker & Decorative Element Library
                  </h2>
                  <p className="text-xs text-slate-500">
                    Select and place SVG-based decorative elements (hearts, stars, party hats) onto your card
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStickerModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <StickerLibraryPanel
                onAddSticker={(id, svg, emoji, col, name, size) => {
                  handleAddSticker(id, svg, emoji, col, name, size);
                }}
                isModal={true}
                onCloseModal={() => setIsStickerModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
