'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { MenuItem, TableSession } from '@/types/database';
import CafeLogo from '@/components/CafeLogo';
import {
  Store,
  LayoutDashboard,
  PackageCheck,
  TrendingUp,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Star,
  ShoppingBag,
  ArrowLeft,
} from 'lucide-react';

interface CartItem {
  item: MenuItem;
  quantity: number;
}

function PosContent() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<TableSession[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Bestsellers');
  const [searchTerm, setSearchTerm] = useState('');

  // Order Tray State
  const [orderType, setOrderType] = useState<'TOKEN' | 'TABLE'>('TOKEN');
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const [customerName, setCustomerName] = useState('Counter Walk-in');
  const [isPaidImmediate, setIsPaidImmediate] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      const { data: menuData } = await supabase.from('menu_items').select('*').order('category');
      if (active && menuData) setMenu(menuData as MenuItem[]);

      const { data: tableData } = await supabase.from('table_sessions').select('*').order('table_number');
      if (active && tableData) setTables(tableData);
    }

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  // Distinct category partitions from the menu
  const categories = useMemo(() => {
    const unique = Array.from(new Set(menu.map((m) => m.category))).filter(Boolean);
    return ['Bestsellers', 'All', ...unique];
  }, [menu]);

  // Filtered menu grid
  const filteredItems = useMemo(() => {
    return menu.filter((item) => {
      let matchesCategory = true;
      if (selectedCategory === 'Bestsellers') {
        matchesCategory = item.is_bestseller;
      } else if (selectedCategory !== 'All') {
        matchesCategory = item.category === selectedCategory;
      }

      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [menu, selectedCategory, searchTerm]);

  // Cart Handlers
  const handleAddToCart = (item: MenuItem) => {
    if (!item.is_available) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        return prev.map((i) => (i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.item.id === itemId) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, i) => sum + Number(i.item.price) * i.quantity, 0);
  }, [cart]);

  // Submit Order to Kitchen & Database
  const handlePunchOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setOrderSuccessMsg(null);

    let tokenNum = null;
    let targetSessionId = null;

    if (orderType === 'TOKEN') {
      const { data: nextTkn } = await supabase.rpc('get_next_token');
      tokenNum = nextTkn || Math.floor(Math.random() * 100) + 1;
    } else {
      const targetTbl = tables.find((t) => t.table_number === selectedTable);
      if (targetTbl && targetTbl.status === 'ACTIVE') {
        targetSessionId = targetTbl.session_id;
      } else {
        const autoPin = Math.floor(1000 + Math.random() * 9000).toString();
        const newSessionId = crypto.randomUUID();
        await supabase
          .from('table_sessions')
          .update({
            status: 'ACTIVE',
            current_pin: autoPin,
            customer_name: customerName,
            customer_phone: 'Desk POS',
            session_id: newSessionId,
          })
          .eq('table_number', selectedTable);
        targetSessionId = newSessionId;
      }
    }

    const { data: newOrder, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_type: orderType,
        table_number: orderType === 'TABLE' ? selectedTable : null,
        token_number: tokenNum,
        session_id: targetSessionId,
        customer_name: customerName || 'Walk-in',
        customer_phone: 'Counter Order',
        total_amount: cartTotal,
        status: 'RECEIVED',
        is_paid: isPaidImmediate,
      })
      .select()
      .single();

    if (!orderErr && newOrder) {
      const itemsPayload = cart.map((i) => ({
        order_id: newOrder.id,
        menu_item_id: i.item.id,
        item_name: i.item.name,
        quantity: i.quantity,
        price: i.item.price,
        notes: 'Counter Order',
      }));

      await supabase.from('order_items').insert(itemsPayload);

      setOrderSuccessMsg(
        orderType === 'TOKEN'
          ? `Token #${tokenNum} punched successfully!`
          : `Order added to Table ${selectedTable} tab!`
      );
      setCart([]);
      setCustomerName('Counter Walk-in');
      setIsPaidImmediate(false);

      setTimeout(() => setOrderSuccessMsg(null), 4000);
    } else {
      alert('Failed to punch order. Please try again.');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-cafe-ivory text-cafe-espresso flex flex-col font-body">
      {/* Top Header with Centered Logo */}
      <header className="bg-white border-b border-cafe-warmGrey/60 px-4 py-3 flex flex-wrap justify-between items-center gap-3 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/desk"
            className="p-2 bg-cafe-oat/60 hover:bg-cafe-oat rounded-xl text-cafe-espresso transition cursor-pointer"
            title="Back to Terminal"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <CafeLogo size={30} />
            <div>
              <h1 className="font-heading font-black text-xl text-cafe-deepEspresso">
                Counter POS Register
              </h1>
              <p className="text-[11px] text-cafe-espresso/60">Lara’s Cafe • Fast Walk-in Punch Terminal</p>
            </div>
          </div>
        </div>

        {/* Global Navigation Hub */}
        <div className="flex items-center gap-2 text-xs">
          <Link
            href="/desk"
            className="px-3 py-1.5 rounded-xl font-bold bg-white border border-cafe-warmGrey hover:bg-cafe-oat text-cafe-espresso transition flex items-center gap-1.5"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-cafe-clay" /> Terminal
          </Link>
          <Link
            href="/desk/pos"
            className="px-3 py-1.5 rounded-xl font-bold bg-cafe-espresso text-cafe-ivory shadow-sm flex items-center gap-1.5"
          >
            <Store className="w-3.5 h-3.5 text-cafe-clay" /> Counter POS
          </Link>
          <Link
            href="/desk/stock"
            className="px-3 py-1.5 rounded-xl font-bold bg-white border border-cafe-warmGrey hover:bg-cafe-oat text-cafe-espresso transition flex items-center gap-1.5"
          >
            <PackageCheck className="w-3.5 h-3.5 text-cafe-clay" /> Stock
          </Link>
          <Link
            href="/desk/analytics"
            className="px-3 py-1.5 rounded-xl font-bold bg-white border border-cafe-warmGrey hover:bg-cafe-oat text-cafe-espresso transition flex items-center gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-700" /> Analytics
          </Link>
        </div>
      </header>

      {/* Main Split Screen Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side (70%): Menu Partition Navigator & Item Grid */}
        <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-y-auto">
          {/* Search & Stats Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-cafe-warmGrey" />
              <input
                type="text"
                placeholder="Search by item name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-cafe-warmGrey rounded-xl text-xs outline-none focus:ring-1 focus:ring-cafe-clay shadow-sm"
              />
            </div>
            <span className="text-xs font-semibold text-cafe-espresso/60 self-start sm:self-center">
              Showing {filteredItems.length} items
            </span>
          </div>

          {/* Category Partitions (Pills) */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar shrink-0">
            {categories.map((cat) => {
              const isBestsellerTab = cat === 'Bestsellers';
              const isSelected = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shadow-sm ${
                    isSelected
                      ? isBestsellerTab
                        ? 'bg-amber-500 text-cafe-deepEspresso shadow-md'
                        : 'bg-cafe-espresso text-cafe-ivory'
                      : isBestsellerTab
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                      : 'bg-white border border-cafe-warmGrey/70 text-cafe-espresso hover:bg-cafe-oat'
                  }`}
                >
                  {isBestsellerTab && <Star className="w-3.5 h-3.5 fill-current" />}
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Menu Items Grid */}
          <div className="flex-1 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="p-12 text-center text-xs text-cafe-espresso/60 bg-white/50 rounded-2xl border border-dashed border-cafe-warmGrey">
                No items found. Try another search or category.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    disabled={!item.is_available}
                    onClick={() => handleAddToCart(item)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between group cursor-pointer ${
                      item.is_available
                        ? 'bg-white border-cafe-warmGrey/70 hover:border-cafe-clay hover:shadow-md active:scale-98'
                        : 'bg-cafe-warmGrey/15 border-cafe-warmGrey/30 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-1 mb-1">
                        <span className="text-[10px] font-bold text-cafe-clay uppercase tracking-wider line-clamp-1">
                          {item.category}
                        </span>
                        {item.is_bestseller && (
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <h3 className="font-heading font-bold text-xs text-cafe-deepEspresso line-clamp-2">
                        {item.name}
                      </h3>
                    </div>

                    <div className="mt-3 pt-2 border-t border-cafe-warmGrey/20 flex justify-between items-center">
                      <span className="font-mono font-bold text-sm text-cafe-deepEspresso">
                        ₹{Number(item.price).toFixed(0)}
                      </span>
                      {item.is_available ? (
                        <span className="p-1.5 bg-cafe-oat text-cafe-clay group-hover:bg-cafe-clay group-hover:text-white rounded-lg transition">
                          <Plus className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                          Sold Out
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side (30%): Live Order Slip / Cart Tray */}
        <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-cafe-warmGrey/60 flex flex-col shrink-0 shadow-lg">
          {/* Order Configuration Box */}
          <div className="p-4 border-b border-cafe-warmGrey/40 space-y-3 bg-cafe-oat/20">
            <div className="flex justify-between items-center">
              <h2 className="font-heading font-black text-sm uppercase text-cafe-deepEspresso flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-cafe-clay" /> Active Order Slip
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-[10px] text-red-600 font-semibold hover:underline cursor-pointer"
                >
                  Clear Tray
                </button>
              )}
            </div>

            {/* Destination Toggle: Token vs Table */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setOrderType('TOKEN')}
                className={`py-2 rounded-xl font-bold transition cursor-pointer ${
                  orderType === 'TOKEN'
                    ? 'bg-cafe-espresso text-cafe-ivory shadow-sm'
                    : 'bg-white border border-cafe-warmGrey text-cafe-espresso hover:bg-cafe-oat/50'
                }`}
              >
                Takeaway Token
              </button>
              <button
                type="button"
                onClick={() => setOrderType('TABLE')}
                className={`py-2 rounded-xl font-bold transition cursor-pointer ${
                  orderType === 'TABLE'
                    ? 'bg-cafe-espresso text-cafe-ivory shadow-sm'
                    : 'bg-white border border-cafe-warmGrey text-cafe-espresso hover:bg-cafe-oat/50'
                }`}
              >
                Table Tab
              </button>
            </div>

            {/* Dynamic Destination Inputs */}
            {orderType === 'TABLE' ? (
              <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-cafe-warmGrey/60">
                <span className="font-semibold text-cafe-espresso">Select Table:</span>
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(Number(e.target.value))}
                  className="bg-cafe-oat/60 border border-cafe-warmGrey rounded-lg px-2.5 py-1 font-bold text-cafe-deepEspresso outline-none cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => (
                    <option key={t} value={t}>
                      Table {t}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  placeholder="Customer Name (optional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-cafe-warmGrey rounded-xl text-xs outline-none focus:ring-1 focus:ring-cafe-clay"
                />
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 p-4 overflow-y-auto divide-y divide-cafe-warmGrey/20 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-cafe-espresso/50 py-12">
                <Store className="w-8 h-8 text-cafe-warmGrey mb-2" />
                <p className="text-xs font-semibold">Your order tray is empty.</p>
                <p className="text-[11px] text-cafe-espresso/40">Tap menu items on the left to add.</p>
              </div>
            ) : (
              cart.map((cartItem) => (
                <div key={cartItem.item.id} className="pt-2 flex justify-between items-center gap-2 text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-cafe-deepEspresso truncate">{cartItem.item.name}</p>
                    <p className="text-[10px] text-cafe-espresso/50">
                      ₹{Number(cartItem.item.price).toFixed(0)} each
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleUpdateQty(cartItem.item.id, -1)}
                      className="p-1 bg-cafe-oat/60 hover:bg-cafe-oat rounded-lg transition cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono font-bold w-5 text-center">{cartItem.quantity}</span>
                    <button
                      onClick={() => handleUpdateQty(cartItem.item.id, 1)}
                      className="p-1 bg-cafe-oat/60 hover:bg-cafe-oat rounded-lg transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleUpdateQty(cartItem.item.id, -cartItem.quantity)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-lg ml-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Tray Footer & Punch Actions */}
          <div className="p-4 border-t border-cafe-warmGrey/40 bg-cafe-oat/30 space-y-3">
            {orderSuccessMsg && (
              <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-300">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{orderSuccessMsg}</span>
              </div>
            )}

            {/* Immediate Payment Checkbox (For Tokens) */}
            {orderType === 'TOKEN' && (
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPaidImmediate}
                  onChange={(e) => setIsPaidImmediate(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
                <span className="text-cafe-espresso">Cash / UPI collected immediately</span>
              </label>
            )}

            {/* Bill Summary */}
            <div className="flex justify-between items-center text-sm font-bold pt-1">
              <span className="text-cafe-espresso/70">Total Bill (incl. GST):</span>
              <span className="text-xl font-heading font-black text-cafe-deepEspresso font-mono">
                ₹{cartTotal.toFixed(2)}
              </span>
            </div>

            {/* Punch Button */}
            <button
              disabled={cart.length === 0 || isSubmitting}
              onClick={handlePunchOrder}
              className="w-full py-3 bg-cafe-clay hover:bg-cafe-rosewood text-white font-bold rounded-xl transition shadow-md text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting
                ? 'Sending to Kitchen...'
                : `Punch & Send to Kitchen (₹${cartTotal.toFixed(2)})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PosPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-cafe-espresso">
          Loading Register POS...
        </div>
      }
    >
      <PosContent />
    </Suspense>
  );
}