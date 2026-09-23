import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Heart,
  ShoppingBag,
  User,
  Menu,
  X,
  Sparkles,
  ChevronDown,
  LogOut,
  Palette,
  Package,
  Shield,
  Layers,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { OCCASIONS_LIST, RECIPIENTS_LIST } from '../data/categories';
import { FirebaseModal } from './FirebaseModal';

interface NavbarProps {
  onNavigate: (route: string, param?: string) => void;
  currentRoute: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentRoute }) => {
  const { user, signInWithGoogle, signOut, isAdmin, isFirebaseActive } = useAuth();
  const { itemCount, setIsCartDrawerOpen } = useCart();
  const { count: favCount } = useFavorites();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'occasions' | 'recipients' | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const popularSearches = [
    'funny birthday',
    'mum birthday',
    'anniversary',
    'best friend',
    'christmas',
    'new baby',
    'photo cards',
    'milestone 30th'
  ];

  // Close popovers when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchOpen(false);
      onNavigate('browse', searchQuery.trim());
    }
  };

  const handlePopularSearchClick = (term: string) => {
    setSearchQuery(term);
    setIsSearchOpen(false);
    onNavigate('browse', term);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-rose-100 shadow-xs">
        {/* Top announcement bar */}
        <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 text-white text-xs font-medium py-1.5 px-4 text-center flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-200" />
          <span>Special Offer: Use code <strong className="underline tracking-wider font-bold">CARDLY20</strong> for 20% off your entire card order!</span>
          <button
            onClick={() => setIsFirebaseModalOpen(true)}
            className="hidden md:inline-flex items-center gap-1 ml-4 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-full text-[10px] tracking-wide uppercase transition"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isFirebaseActive ? 'bg-emerald-300' : 'bg-amber-300'}`} />
            {isFirebaseActive ? 'Firebase Live' : 'Demo Mode'}
          </button>
        </div>

        {/* Main Header bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 focus:outline-hidden"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Brand Logo */}
            <div
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2 cursor-pointer select-none group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center shadow-md shadow-rose-200 group-hover:scale-105 transition-transform duration-200">
                <div className="w-5 h-6 bg-white rounded-xs shadow-xs rotate-[-6deg] flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tight text-slate-900 flex items-center">
                  card<span className="text-rose-500">ly</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 ml-0.5 inline-block" />
                </span>
              </div>
            </div>

            {/* Search Bar - Center */}
            <div ref={searchRef} className="hidden md:flex flex-1 max-w-lg relative mx-4">
              <form onSubmit={handleSearchSubmit} className="w-full relative">
                <input
                  type="text"
                  placeholder="Search cards, occasions, people (e.g. mum birthday, funny)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchOpen(true)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-800 placeholder-slate-400 text-sm rounded-full border border-slate-200 focus:border-rose-400 focus:ring-4 focus:ring-rose-50 transition-all outline-hidden"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </form>

              {/* Live search dropdown suggestions */}
              {isSearchOpen && (
                <div className="absolute top-12 left-0 right-0 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 animate-in fade-in duration-150">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Popular Searches
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {popularSearches.map((term) => (
                      <button
                        key={term}
                        onClick={() => handlePopularSearchClick(term)}
                        className="px-3 py-1 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-700 rounded-full text-xs font-medium transition"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <button
                      onClick={() => {
                        setIsSearchOpen(false);
                        onNavigate('browse');
                      }}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center justify-between w-full"
                    >
                      <span>Explore all 300+ Greeting Cards</span>
                      <span>&rarr;</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Action Icons: Favorites, Cart, Account */}
            <div className="flex items-center space-x-1 sm:space-x-3">
              {/* Favorites icon */}
              <button
                onClick={() => onNavigate('favorites')}
                className={`relative p-2.5 rounded-full hover:bg-rose-50 transition text-slate-700 hover:text-rose-600 ${
                  currentRoute === 'favorites' ? 'bg-rose-50 text-rose-600' : ''
                }`}
                title="View Saved Favorites"
                aria-label="Favorites"
              >
                <Heart className={`w-5 h-5 ${favCount > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
                {favCount > 0 && (
                  <span className="absolute top-1 right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs animate-in zoom-in">
                    {favCount}
                  </span>
                )}
              </button>

              {/* Shopping Basket Drawer trigger */}
              <button
                onClick={() => setIsCartDrawerOpen(true)}
                className="relative p-2.5 rounded-full hover:bg-rose-50 transition text-slate-700 hover:text-rose-600 group"
                title="Shopping Basket"
                aria-label="Shopping Basket"
              >
                <ShoppingBag className="w-5 h-5 group-hover:scale-105 transition-transform" />
                {itemCount > 0 && (
                  <span className="absolute top-1 right-1 bg-rose-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs animate-in zoom-in">
                    {itemCount}
                  </span>
                )}
              </button>

              {/* User Account Popover */}
              <div ref={userMenuRef} className="relative">
                {user ? (
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1.5 pr-2.5 rounded-full hover:bg-slate-100 transition border border-slate-200"
                    aria-label="User Account Menu"
                  >
                    <img
                      src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                      alt={user.displayName || 'Profile'}
                      className="w-7 h-7 rounded-full object-cover border border-rose-200"
                    />
                    <span className="hidden sm:inline text-xs font-semibold text-slate-800 max-w-[90px] truncate">
                      {user.displayName?.split(' ')[0] || 'Account'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                ) : (
                  <button
                    onClick={() => signInWithGoogle()}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-semibold shadow-xs transition"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                )}

                {/* Popover menu for logged-in user */}
                {isUserMenuOpen && user && (
                  <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in duration-150">
                    <div className="p-3 border-b border-slate-100">
                      <div className="font-bold text-slate-900 text-sm truncate">{user.displayName}</div>
                      <div className="text-xs text-slate-500 truncate">{user.email}</div>
                      {isAdmin && (
                        <span className="inline-block mt-1 text-[10px] font-semibold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
                          Admin Access
                        </span>
                      )}
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onNavigate('account', 'designs');
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-lg flex items-center gap-2.5 transition"
                      >
                        <Palette className="w-4 h-4 text-slate-400" />
                        <span>My Saved Designs</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onNavigate('account', 'orders');
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-lg flex items-center gap-2.5 transition"
                      >
                        <Package className="w-4 h-4 text-slate-400" />
                        <span>Previous Orders</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onNavigate('favorites');
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-lg flex items-center gap-2.5 transition"
                      >
                        <Heart className="w-4 h-4 text-slate-400" />
                        <span>Favorited Cards</span>
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onNavigate('admin');
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2.5 transition"
                        >
                          <Shield className="w-4 h-4 text-rose-500" />
                          <span>Admin Dashboard</span>
                        </button>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          signOut();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2.5 transition"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Category Navigation Bar (Desktop) */}
        <nav className="hidden lg:block border-t border-slate-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-6 h-11 overflow-x-auto text-xs font-semibold text-slate-700 scrollbar-none">
              <button
                onClick={() => onNavigate('browse')}
                className={`shrink-0 hover:text-rose-600 transition flex items-center gap-1 ${
                  currentRoute === 'browse' ? 'text-rose-600 font-bold border-b-2 border-rose-500 pb-0.5' : ''
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                All Cards
              </button>

              <button
                onClick={() => onNavigate('browse', 'Birthday')}
                className="shrink-0 hover:text-rose-600 transition"
              >
                Birthday
              </button>

              <button
                onClick={() => onNavigate('browse', "Mother's Day")}
                className="shrink-0 hover:text-rose-600 transition"
              >
                Mother's Day
              </button>

              <button
                onClick={() => onNavigate('browse', "Father's Day")}
                className="shrink-0 hover:text-rose-600 transition"
              >
                Father's Day
              </button>

              <button
                onClick={() => onNavigate('browse', 'Anniversary')}
                className="shrink-0 hover:text-rose-600 transition"
              >
                Anniversary
              </button>

              <button
                onClick={() => onNavigate('browse', 'Wedding')}
                className="shrink-0 hover:text-rose-600 transition"
              >
                Wedding
              </button>

              <button
                onClick={() => onNavigate('browse', 'Thank You')}
                className="shrink-0 hover:text-rose-600 transition"
              >
                Thank You
              </button>

              <button
                onClick={() => onNavigate('browse', 'Congratulations')}
                className="shrink-0 hover:text-rose-600 transition"
              >
                Congratulations
              </button>

              <button
                onClick={() => onNavigate('browse', 'New Baby')}
                className="shrink-0 hover:text-rose-600 transition"
              >
                New Baby
              </button>

              <button
                onClick={() => onNavigate('browse', 'Christmas')}
                className="shrink-0 hover:text-rose-600 transition text-emerald-700 font-bold"
              >
                Christmas
              </button>

              <button
                onClick={() => onNavigate('browse', 'Photo Cards')}
                className="shrink-0 hover:text-rose-600 transition flex items-center gap-1 text-purple-700 font-bold"
              >
                <Sparkles className="w-3 h-3 text-purple-500" />
                Photo Cards
              </button>

              <button
                onClick={() => onNavigate('browse', 'Funny')}
                className="shrink-0 hover:text-rose-600 transition text-amber-700 font-bold"
              >
                Funny
              </button>

              <button
                onClick={() => onNavigate('browse', 'Her')}
                className="shrink-0 hover:text-rose-600 transition"
              >
                For Her
              </button>

              <button
                onClick={() => onNavigate('browse', 'Him')}
                className="shrink-0 hover:text-rose-600 transition"
              >
                For Him
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-200 px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top duration-200">
            {/* Mobile search bar */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search occasions, people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 text-slate-800 text-sm rounded-xl border border-slate-200 focus:outline-rose-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            </form>

            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onNavigate('browse');
                }}
                className="p-2.5 bg-slate-50 rounded-xl text-left hover:bg-rose-50 hover:text-rose-600 font-bold text-slate-900"
              >
                All 300+ Cards
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onNavigate('browse', 'Birthday');
                }}
                className="p-2.5 bg-slate-50 rounded-xl text-left hover:bg-rose-50 hover:text-rose-600 text-slate-700"
              >
                Birthday Cards
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onNavigate('browse', 'Photo Cards');
                }}
                className="p-2.5 bg-purple-50 text-purple-700 rounded-xl text-left font-bold"
              >
                Photo Cards
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onNavigate('browse', 'Funny');
                }}
                className="p-2.5 bg-amber-50 text-amber-800 rounded-xl text-left font-bold"
              >
                Funny Cards
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onNavigate('browse', 'Anniversary');
                }}
                className="p-2.5 bg-slate-50 rounded-xl text-left hover:bg-rose-50 hover:text-rose-600 text-slate-700"
              >
                Anniversary
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onNavigate('browse', 'Wedding');
                }}
                className="p-2.5 bg-slate-50 rounded-xl text-left hover:bg-rose-50 hover:text-rose-600 text-slate-700"
              >
                Wedding
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onNavigate('browse', "Mother's Day");
                }}
                className="p-2.5 bg-slate-50 rounded-xl text-left hover:bg-rose-50 hover:text-rose-600 text-slate-700"
              >
                Mother's Day
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onNavigate('browse', "Father's Day");
                }}
                className="p-2.5 bg-slate-50 rounded-xl text-left hover:bg-rose-50 hover:text-rose-600 text-slate-700"
              >
                Father's Day
              </button>
            </div>

            {/* Quick account action on mobile */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              {user ? (
                <div className="flex items-center gap-2">
                  <img
                    src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                    alt="avatar"
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">{user.displayName}</div>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onNavigate('account');
                      }}
                      className="text-[11px] text-rose-600 font-semibold"
                    >
                      Manage Account
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    signInWithGoogle();
                  }}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold text-center"
                >
                  Sign in with Google
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Firebase Setup & Status Modal */}
      <FirebaseModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
      />
    </>
  );
};
