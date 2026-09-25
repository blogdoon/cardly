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
import { getUserDesigns } from './services/cardStorage';
import { getTemplateById } from './data/templates';

type RouteType =
  | 'home'
  | 'browse'
  | 'card'
  | 'editor'
  | 'cart'
  | 'checkout'
  | 'favorites'
  | 'account'
  | 'admin';

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
  const [currentRoute, setCurrentRoute] = useState<RouteType>('home');
  const [routeParam, setRouteParam] = useState<string | undefined>(undefined);
  const [activeDesign, setActiveDesign] = useState<UserDesign | null>(null);
  const { user, loading } = useAuth();
  const deepLinkHandled = useRef(false);

  // Deep-link handling: when a recipient scans the printed QR code, load their digital card/design.
  // Runs once, after auth settles: the design may live in Firestore for a signed-in user, and a
  // recipient on their own device has no copy at all — then fall back to the template it was made from.
  React.useEffect(() => {
    if (loading || deepLinkHandled.current) return;

    (async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const designId = searchParams.get('design');
        const cardId = searchParams.get('card') || searchParams.get('template');
        const editId = searchParams.get('edit');

        if (!designId && !cardId && !editId) return;
        deepLinkHandled.current = true;

        if (designId) {
          const designs = await getUserDesigns(user?.uid);
          const found = designs.find((d) => d.id === designId);
          if (found) {
            setActiveDesign(found);
            setRouteParam(found.templateId);
            setCurrentRoute('editor');
            return;
          }
          // Not on this device: ids are `design_<templateId>_<timestamp>`
          const templateId = designId.match(/^design_(.+)_\d+$/)?.[1];
          if (templateId && getTemplateById(templateId)) {
            setActiveDesign(null);
            setRouteParam(templateId);
            setCurrentRoute('editor');
          }
          return;
        }

        if (editId) {
          setRouteParam(editId);
          setCurrentRoute('editor');
          return;
        }

        if (cardId) {
          setRouteParam(cardId);
          setCurrentRoute('card');
        }
      } catch (e) {
        console.error('Error parsing route params:', e);
      }
    })();
  }, [loading, user]);

  const handleNavigate = (route: string, param?: string) => {
    setCurrentRoute(route as RouteType);
    setRouteParam(param);
    setActiveDesign(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePersonalize = (templateId: string) => {
    setRouteParam(templateId);
    setActiveDesign(null);
    setCurrentRoute('editor');
  };

  const handleEditDesign = (design: UserDesign) => {
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
