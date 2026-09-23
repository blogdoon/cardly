import React, { useState, useEffect } from 'react';
import {
  Palette,
  Package,
  MapPin,
  LogOut,
  Sparkles,
  ArrowRight,
  Trash2,
  Edit,
  Copy,
  Clock,
  CheckCircle,
  Truck,
  Plus,
  Eye,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserDesign } from '../types/design';
import { Order, DeliveryAddress } from '../types/order';
import { CartItem } from '../types/cart';
import {
  getUserDesigns,
  deleteUserDesign,
  saveUserDesign,
  getUserOrders
} from '../services/cardStorage';
import { getTemplateById } from '../data/templates';
import { PreviewModal } from '../components/PreviewModal';

interface AccountProps {
  initialTab?: 'designs' | 'orders' | 'addresses';
  onNavigate: (route: string, param?: string) => void;
  onEditDesign: (design: UserDesign) => void;
}

export const Account: React.FC<AccountProps> = ({
  initialTab = 'designs',
  onNavigate,
  onEditDesign,
}) => {
  const { user, signOut, signInWithGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState<'designs' | 'orders' | 'addresses'>(initialTab);

  const [designs, setDesigns] = useState<UserDesign[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<DeliveryAddress[]>(user?.savedAddresses || []);
  const [isLoading, setIsLoading] = useState(true);
  const [previewModalDesign, setPreviewModalDesign] = useState<UserDesign | null>(null);

  // Address add form modal state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddr, setNewAddr] = useState<Omit<DeliveryAddress, 'id'>>({
    name: user?.displayName || '',
    line1: '',
    line2: '',
    city: 'London',
    postcode: '',
    country: 'United Kingdom',
    isDefault: false,
  });

  const getOrderCardDesign = (item: CartItem): UserDesign => {
    if (item.designSnapshot) {
      return item.designSnapshot;
    }
    const template = getTemplateById(item.templateId);
    const front = template?.defaultPages.front
      ? JSON.parse(JSON.stringify(template.defaultPages.front))
      : { pageType: 'front', backgroundColor: '#ffffff', elements: [] };
    const insideLeft = template?.defaultPages.insideLeft
      ? JSON.parse(JSON.stringify(template.defaultPages.insideLeft))
      : { pageType: 'inside-left', backgroundColor: '#ffffff', elements: [] };
    const insideRight = template?.defaultPages.insideRight
      ? JSON.parse(JSON.stringify(template.defaultPages.insideRight))
      : { pageType: 'inside-right', backgroundColor: '#ffffff', elements: [] };
    const back = template?.defaultPages.back
      ? JSON.parse(JSON.stringify(template.defaultPages.back))
      : { pageType: 'back', backgroundColor: '#ffffff', elements: [] };

    if (item.customSummary?.recipientName) {
      const textEl = front.elements.find(
        (el: any) => el.type === 'text' && el.text.length < 30
      );
      if (textEl) {
        (textEl as any).text = item.customSummary.recipientName;
      }
    }

    if (item.customSummary?.customMessageSnippet) {
      const msgEl = insideRight.elements.find((el: any) => el.type === 'text');
      if (msgEl) {
        (msgEl as any).text = item.customSummary.customMessageSnippet;
      } else {
        insideRight.elements.push({
          id: `ord_msg_${Date.now()}`,
          type: 'text',
          x: 50,
          y: 50,
          width: 75,
          height: 35,
          rotation: 0,
          zIndex: 1,
          text: item.customSummary.customMessageSnippet,
          fontFamily: 'Caveat',
          fontSize: 22,
          color: '#334155',
          textAlign: 'center',
        });
      }
    }

    return {
      id: item.designId || `ord_design_${item.templateId}_${item.id}`,
      templateId: item.templateId,
      userId: user?.uid || 'guest_user',
      title: item.title,
      pages: { front, insideLeft, insideRight, back },
      previewThumbnail: item.thumbnail || template?.thumbnail || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const userDesigns = await getUserDesigns(user?.uid);
        const userOrders = await getUserOrders(user?.uid);
        setDesigns(userDesigns);
        setOrders(userOrders);
      } catch (err) {
        console.warn('Could not fetch account data:', err);
      } finally {
        if (user?.savedAddresses) {
          setAddresses(user.savedAddresses);
        }
        setIsLoading(false);
      }
    }
    loadData();
  }, [user]);

  const handleDeleteDesign = async (id: string) => {
    if (confirm('Are you sure you want to delete this saved card design?')) {
      await deleteUserDesign(id, user?.uid);
      setDesigns((prev) => prev.filter((d) => d.id !== id));
    }
  };

  const handleDuplicateDesign = async (design: UserDesign) => {
    const clone: UserDesign = {
      ...design,
      id: `design_${Date.now()}`,
      title: `${design.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveUserDesign(clone);
    setDesigns((prev) => [clone, ...prev]);
  };

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    const created: DeliveryAddress = {
      ...newAddr,
      id: `addr_${Date.now()}`,
    };
    setAddresses((prev) => [...prev, created]);
    setShowAddressForm(false);
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
          <Palette className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Sign in to Cardly</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Sign in to access your saved card creations, view order tracking timelines, and manage delivery addresses.
        </p>
        <button
          onClick={() => signInWithGoogle()}
          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
        >
          Sign In with Google
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xs">
        <div className="flex items-center space-x-4">
          <img
            src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
            alt={user.displayName || 'Profile'}
            className="w-16 h-16 rounded-full border-2 border-rose-200 object-cover shadow-xs"
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">{user.displayName}</h1>
            <p className="text-xs text-slate-500">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full uppercase">
                {user.role}
              </span>
              <span className="text-[11px] text-slate-400">
                Member since {new Date(user.createdAt).getFullYear()}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => signOut()}
          className="px-4 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('designs')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
            activeTab === 'designs'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Saved Designs ({designs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Order History ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('addresses')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
            activeTab === 'addresses'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Address Book ({addresses.length})</span>
        </button>
      </div>

      {/* Tab: Saved Designs */}
      {activeTab === 'designs' && (
        <div className="space-y-6">
          {designs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                <Palette className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No saved designs yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Whenever you personalize a card, Cardly automatically saves your work here so you can continue anytime.
              </p>
              <button
                onClick={() => onNavigate('browse')}
                className="px-5 py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Create a Card
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {designs.map((design) => (
                <div
                  key={design.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm truncate max-w-[180px]">
                        {design.title}
                      </h3>
                      <span className="text-[10px] text-slate-400">
                        Updated {new Date(design.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleDuplicateDesign(design)}
                        className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500"
                        title="Duplicate design"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDesign(design.id)}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-500 hover:text-rose-600"
                        title="Delete design"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 flex items-center justify-center aspect-[3/2] bg-slate-100/50">
                    {design.previewThumbnail ? (
                      <img
                        src={design.previewThumbnail}
                        alt="Design thumbnail"
                        className="h-full object-contain rounded-lg shadow-sm"
                      />
                    ) : (
                      <Sparkles className="w-8 h-8 text-rose-400" />
                    )}
                  </div>

                  <div className="p-4 bg-white border-t border-slate-100">
                    <button
                      onClick={() => onEditDesign(design)}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Continue Editing</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Order History */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {orders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
              <Package className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No previous orders</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your past card orders and delivery tracking receipts will appear right here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {ord.orderNumber}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          ord.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.status === 'dispatched'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {ord.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Placed on {new Date(ord.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400">Total: </span>
                      <span className="font-black text-slate-900 text-sm">£{ord.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Order tracking progress step bar */}
                  <div className="grid grid-cols-4 gap-2 pt-2 text-center text-[10px] font-bold">
                    <div className="flex flex-col items-center gap-1 text-emerald-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>Order Placed</span>
                    </div>
                    <div className={`flex flex-col items-center gap-1 ${
                      ['printed', 'dispatched', 'delivered'].includes(ord.status)
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                    }`}>
                      <CheckCircle className="w-4 h-4" />
                      <span>Printed & Folded</span>
                    </div>
                    <div className={`flex flex-col items-center gap-1 ${
                      ['dispatched', 'delivered'].includes(ord.status)
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                    }`}>
                      <Truck className="w-4 h-4" />
                      <span>Dispatched (Royal Mail)</span>
                    </div>
                    <div className={`flex flex-col items-center gap-1 ${
                      ord.status === 'delivered' ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                      <CheckCircle className="w-4 h-4" />
                      <span>Delivered</span>
                    </div>
                  </div>

                  {/* Item List */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Ordered Greeting Cards ({ord.items.length})
                    </span>
                    {ord.items.map((it) => {
                      const cardDesign = getOrderCardDesign(it);
                      const thumb = it.thumbnail || cardDesign.previewThumbnail;

                      return (
                        <div
                          key={it.id}
                          className="bg-slate-50 hover:bg-slate-100/80 transition rounded-2xl p-3 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center space-x-3.5 min-w-0">
                            <div className="w-14 h-18 sm:w-16 sm:h-20 rounded-xl overflow-hidden bg-white border border-slate-200 shadow-2xs shrink-0 flex items-center justify-center">
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt={it.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Sparkles className="w-6 h-6 text-rose-400" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 text-sm truncate">
                                {it.title}
                              </h4>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                                <span className="font-semibold text-slate-700">
                                  {it.quantity}x
                                </span>
                                <span>•</span>
                                <span className="capitalize">{it.cardSize} Card</span>
                                <span>•</span>
                                <span className="capitalize">{it.envelopeColor} Envelope</span>
                              </div>
                              {it.customSummary?.recipientName && (
                                <p className="text-[11px] text-rose-600 font-medium truncate mt-0.5">
                                  For: {it.customSummary.recipientName}
                                </p>
                              )}
                              {it.customSummary?.customMessageSnippet && (
                                <p className="text-[11px] text-slate-400 italic truncate max-w-xs mt-0.5">
                                  "{it.customSummary.customMessageSnippet}"
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {/* View / Open Card in 3D */}
                            <button
                              onClick={() => setPreviewModalDesign(cardDesign)}
                              className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs active:scale-95"
                              title="Open interactive 3D flip card viewer"
                            >
                              <Eye className="w-3.5 h-3.5 text-rose-500" />
                              <span>View Card</span>
                            </button>

                            {/* Reopen in Editor */}
                            <button
                              onClick={() => onEditDesign(cardDesign)}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs active:scale-95"
                              title="Open card in the Studio Editor to modify or re-order"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Open in Editor</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Saved Addresses */}
      {activeTab === 'addresses' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-sm">Saved Addresses</h3>
            <button
              onClick={() => setShowAddressForm(true)}
              className="px-3.5 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Address</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-2 text-xs"
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-900">{addr.name}</span>
                  {addr.isDefault && (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold text-[10px] rounded-md">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {addr.line1} {addr.line2 && <br />} {addr.line2}
                  <br />
                  {addr.city}, {addr.postcode}
                  <br />
                  {addr.country}
                </p>
              </div>
            ))}
          </div>

          {/* Add Address Form Modal */}
          {showAddressForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
              <form
                onSubmit={handleAddAddress}
                className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs"
              >
                <h3 className="font-bold text-slate-900 text-sm">Add New Address</h3>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newAddr.name}
                    onChange={(e) => setNewAddr({ ...newAddr, name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    value={newAddr.line1}
                    onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Town / City</label>
                  <input
                    type="text"
                    required
                    value={newAddr.city}
                    onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Postcode</label>
                  <input
                    type="text"
                    required
                    value={newAddr.postcode}
                    onChange={(e) => setNewAddr({ ...newAddr, postcode: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl uppercase font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold"
                  >
                    Save Address
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Interactive 3D Card Preview Modal for Ordered Cards */}
      {previewModalDesign && (
        <PreviewModal
          isOpen={Boolean(previewModalDesign)}
          onClose={() => setPreviewModalDesign(null)}
          title={previewModalDesign.title}
          pages={previewModalDesign.pages}
          onProceedToCart={() => {
            const d = previewModalDesign;
            setPreviewModalDesign(null);
            onEditDesign(d);
          }}
        />
      )}
    </div>
  );
};
