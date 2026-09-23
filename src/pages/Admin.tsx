import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Database,
  Package,
  Layers,
  CheckCircle,
  Eye,
  Edit,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { ALL_TEMPLATES } from '../data/templates';
import { CardTemplate } from '../types/template';
import { getLocalOrders } from '../services/cardStorage';
import { Order } from '../types/order';
import { useAuth } from '../context/AuthContext';
import { isFirebaseConfigured } from '../services/firebase';

interface AdminProps {
  onNavigate: (route: string) => void;
}

export const Admin: React.FC<AdminProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<CardTemplate[]>(ALL_TEMPLATES);
  const [orders, setOrders] = useState<Order[]>(getLocalOrders());
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState<'catalog' | 'orders' | 'system'>('catalog');

  const filteredTemplates = templates.filter((t) => {
    if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleToggleBestSeller = (id: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isBestSeller: !t.isBestSeller } : t))
    );
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
  };

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigate('home')}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Admin Control Center</h1>
              <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-xs font-bold rounded-full uppercase">
                Staff Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Logged in as {user?.email || 'blogdoontv@gmail.com'}
            </p>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'catalog' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
            }`}
          >
            Catalog ({templates.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'orders' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
            }`}
          >
            Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'system' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
            }`}
          >
            System & Firebase
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Total Catalog Cards</span>
            <Layers className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">{templates.length}</div>
          <div className="text-[11px] text-emerald-600 font-semibold">100% active & ready for print</div>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Total Orders Placed</span>
            <Package className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">{orders.length}</div>
          <div className="text-[11px] text-slate-500">Fast letterbox dispatch</div>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Total Card Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">£{totalRevenue.toFixed(2)}</div>
          <div className="text-[11px] text-emerald-600 font-semibold">Processed securely</div>
        </div>
      </div>

      {/* Tab: Catalog Management */}
      {activeTab === 'catalog' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search templates by ID, title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <span className="text-xs text-slate-500">
              Showing {filteredTemplates.length} cards
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-bold">Thumbnail</th>
                  <th className="py-3 px-4 font-bold">Card Title</th>
                  <th className="py-3 px-4 font-bold">Category</th>
                  <th className="py-3 px-4 font-bold">Price</th>
                  <th className="py-3 px-4 font-bold">Type</th>
                  <th className="py-3 px-4 font-bold">Best Seller</th>
                  <th className="py-3 px-4 font-bold">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTemplates.slice(0, 50).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2 px-4">
                      <img
                        src={t.thumbnail}
                        alt="thumb"
                        className="w-10 h-14 object-contain rounded border border-slate-200 bg-white"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <div className="font-bold text-slate-900">{t.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{t.id}</div>
                    </td>
                    <td className="py-2 px-4">
                      <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-medium">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-2 px-4 font-bold text-slate-800">£{t.price.toFixed(2)}</td>
                    <td className="py-2 px-4">
                      {t.isPhotoCard ? (
                        <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-semibold text-[10px]">
                          Photo Card
                        </span>
                      ) : (
                        <span className="text-slate-500">Standard</span>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      <button
                        onClick={() => handleToggleBestSeller(t.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.isBestSeller
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {t.isBestSeller ? 'Yes' : 'No'}
                      </button>
                    </td>
                    <td className="py-2 px-4 font-medium text-slate-700">★ {t.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Orders Management */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-6">
          <h2 className="font-bold text-slate-900 text-base">All Customer Orders</h2>

          <div className="space-y-4">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-900">{ord.orderNumber}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(ord.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Ship to: <strong className="text-slate-800">{ord.shippingAddress.name}</strong> •{' '}
                    {ord.shippingAddress.city}, {ord.shippingAddress.postcode}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {ord.items.map((i) => `${i.quantity}x ${i.title}`).join(', ')}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="font-black text-slate-900 text-sm">£{ord.total.toFixed(2)}</span>
                  <select
                    value={ord.status}
                    onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as any)}
                    className="p-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                  >
                    <option value="processing">Processing</option>
                    <option value="printed">Printed</option>
                    <option value="dispatched">Dispatched</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: System & Firebase */}
      {activeTab === 'system' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-6">
          <h2 className="font-bold text-slate-900 text-base">System Configuration & Security</h2>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Security Rules Audit (firestore.rules)</span>
            </div>
            <p className="leading-relaxed text-slate-600">
              Production security rules configured with request.auth checks, user isolation for designs & orders, and admin-only catalog write access for <code className="font-mono text-rose-600">blogdoontv@gmail.com</code>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Database className="w-4 h-4 text-rose-500" />
              <span>Firebase Connection Status</span>
            </div>
            <p className="leading-relaxed text-slate-600">
              {isFirebaseConfigured
                ? 'Connected to live Firebase instance. Real authentication, Firestore persistence, and storage uploads active.'
                : 'Preview & LocalStorage Mode Active. All user actions, card editing, favorites, orders, and Google login are fully responsive and persistent.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
