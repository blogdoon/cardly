import React, { useState, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';

import { Home } from './pages/Home';
import { Browse } from './pages/Browse';
import { CardDetail } from './pages/CardDetail';
import { CardEditor } from './pages/CardEditor';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Favorites } from './pages/Favorites';
import { Account } from './pages/Account';
import { Admin } from './pages/Admin';
import { UserDesign } from './types/design';
import { getUserDesigns, getDesignById, getActiveDraftId } from './services/cardStorage';
import { getTemplateById } from './data/templates';
import { RouteType, parsePath, routePath, ROUTE_META } from './utils/routes';

function setPageMeta(title: string, desc: string) {
  const upsertMeta = (attr: 'name' | 'property', key: string, value: string) => {
    let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', value);
  };
  const url = window.location.origin + window.location.pathname + window.location.search;
  document.title = title;
  upsertMeta('name', 'description', desc);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', desc);
  upsertMeta('property', 'og:url', url);
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = url;
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <FavoritesProvider>
          <AppRoutes />
        </FavoritesProvider>
      </CartProvider>
    </AuthProvider>
  );
}

function AppRoutes() {
  const [currentRoute, setCurrentRoute] = useState<RouteType>(
    () => parsePath(window.location.pathname, window.location.search).route
  );
  const [routeParam, setRouteParam] = useState<string | undefined>(
    () => parsePath(window.location.pathname, window.location.search).param
  );
  const [activeDesign, setActiveDesign] = useState<UserDesign | null>(null);
  const { user, loading } = useAuth();
  const deepLinkHandled = useRef(false);

  // Deep-link handling: when a recipient scans the printed QR code, load their digital card/design.
  // Legacy links are query params on the root path (/?design=…, /?card=…, /?edit=…) and get
  // rewritten to their canonical path here; path-based links are parsed by parsePath above.
  // Runs once, after auth settles: the design may live in Firestore for a signed-in user, and a
  // recipient on their own device has no copy at all — then fall back to the template it was made from.
  React.useEffect(() => {
    if (loading || deepLinkHandled.current) return;
    if (window.location.pathname !== '/') return;

    const openEditor = (templateId: string, design?: string) => {
      setActiveDesign(null);
      setRouteParam(templateId);
      setCurrentRoute('editor');
      const query = design ? `?design=${encodeURIComponent(design)}` : '';
      window.history.replaceState({}, '', routePath('editor', templateId) + query);
    };

    (async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const designId = searchParams.get('design');
        const cardId = searchParams.get('card') || searchParams.get('template');
        const editId = searchParams.get('edit');

        if (!designId && !cardId && !editId) return;
        deepLinkHandled.current = true;

        if (designId) {
          const found = await getDesignById(designId, user?.uid);
          if (found) {
            setActiveDesign(found);
            setRouteParam(found.templateId);
            setCurrentRoute('editor');
            window.history.replaceState(
              {},
              '',
              routePath('editor', found.templateId) + `?design=${encodeURIComponent(found.id)}`
            );
            return;
          }
          // If not found by full ID, try finding in user designs list
          const designs = await getUserDesigns(user?.uid);
          const matched = designs.find((d) => d.id === designId);
          if (matched) {
            setActiveDesign(matched);
            setRouteParam(matched.templateId);
            setCurrentRoute('editor');
            window.history.replaceState(
              {},
              '',
              routePath('editor', matched.templateId) + `?design=${encodeURIComponent(matched.id)}`
            );
            return;
          }
          // Not on this device: ids are `design_<templateId>_<timestamp>`
          const templateId = designId.match(/^design_(.+)_\d+$/)?.[1];
          if (templateId && getTemplateById(templateId)) {
            openEditor(templateId);
          }
          return;
        }

        if (editId) {
          const draftId = getActiveDraftId(editId);
          if (draftId) {
            const foundDraft = await getDesignById(draftId, user?.uid);
            if (foundDraft) {
              openEditor(editId, foundDraft.id);
              return;
            }
          }
          openEditor(editId);
          return;
        }

        if (cardId) {
          setRouteParam(cardId);
          setCurrentRoute('card');
          window.history.replaceState({}, '', routePath('card', cardId));
        }
      } catch (e) {
        console.error('Error parsing route params:', e);
      }
    })();
  }, [loading, user]);

  // Keep UI state in sync with the back/forward buttons.
  React.useEffect(() => {
    const onPopState = () => {
      const { route, param } = parsePath(window.location.pathname, window.location.search);
      setActiveDesign(null);
      setCurrentRoute(route);
      setRouteParam(param);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Per-route <title>/description/canonical/og for SEO.
  React.useEffect(() => {
    const template =
      (currentRoute === 'card' || currentRoute === 'editor') && routeParam
        ? getTemplateById(routeParam)
        : undefined;
    const base = ROUTE_META[currentRoute];
    const title = template
      ? currentRoute === 'card'
        ? `${template.title} | Cardly ${template.category} Cards`
        : `Editing ${template.title} | Cardly`
      : base.title;
    setPageMeta(title, template ? template.description : base.desc);
  }, [currentRoute, routeParam]);

  const navigate = (route: RouteType, param?: string) => {
    // A pushed URL replaces any previous editor session's ?design=, so a fresh
    // "Personalize" never resumes the card that was saved last time.
    try {
      window.history.pushState({}, '', routePath(route, param));
    } catch (e) {
      console.warn(e);
    }
    setCurrentRoute(route);
    setRouteParam(param);
    setActiveDesign(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (route: string, param?: string) => {
    navigate(route as RouteType, param);
  };

  const handlePersonalize = (templateId: string) => {
    navigate('editor', templateId);
  };

  const handleEditDesign = (design: UserDesign) => {
    try {
      window.history.pushState({}, '', routePath('editor', design.templateId));
    } catch (e) {
      console.warn(e);
    }
    setActiveDesign(design);
    setRouteParam(design.templateId);
    setCurrentRoute('editor');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 font-sans text-slate-800 antialiased selection:bg-rose-500 selection:text-white">
      {/* If inside Editor, Editor renders full screen without generic Header/Footer */}
      {currentRoute === 'editor' && routeParam ? (
        <CardEditor
          templateId={routeParam}
          initialDesign={activeDesign}
          onBack={() => handleNavigate('card', routeParam)}
          onFinish={() => handleNavigate('cart')}
        />
      ) : (
        <>
          <Navbar onNavigate={handleNavigate} currentRoute={currentRoute} />

          <main className="flex-1">
            {currentRoute === 'home' && (
              <Home
                onNavigate={handleNavigate}
                onPersonalize={handlePersonalize}
              />
            )}

            {currentRoute === 'browse' && (
              <Browse
                initialCategory={routeParam}
                onSelectCard={(id) => handleNavigate('card', id)}
                onPersonalize={handlePersonalize}
              />
            )}

            {currentRoute === 'card' && routeParam && (
              <CardDetail
                templateId={routeParam}
                onBack={() => handleNavigate('browse')}
                onPersonalize={handlePersonalize}
                onSelectCard={(id) => handleNavigate('card', id)}
              />
            )}

            {currentRoute === 'cart' && (
              <Cart onNavigate={handleNavigate} />
            )}

            {currentRoute === 'checkout' && (
              <Checkout onNavigate={handleNavigate} />
            )}

            {currentRoute === 'favorites' && (
              <Favorites
                onNavigate={handleNavigate}
                onPersonalize={handlePersonalize}
              />
            )}

            {currentRoute === 'account' && (
              <Account
                initialTab={(routeParam as any) || 'designs'}
                onNavigate={handleNavigate}
                onEditDesign={handleEditDesign}
              />
            )}

            {currentRoute === 'admin' && (
              <Admin onNavigate={handleNavigate} />
            )}
          </main>

          <Footer onNavigate={handleNavigate} />

          {/* Sliding Cart Drawer accessible across all regular pages */}
          <CartDrawer onNavigate={handleNavigate} />
        </>
      )}
    </div>
  );
}
