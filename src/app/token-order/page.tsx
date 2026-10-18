'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { MenuItem, OrderItemPayload, OrderWithItems } from '@/types/database';
import MenuCatalog from '@/components/customer/MenuCatalog';
import CartDrawer from '@/components/customer/CartDrawer';
import LiveOrderStatus from '@/components/customer/LiveOrderStatus';
import CafeLogo from '@/components/CafeLogo';
import { User, Phone } from 'lucide-react';

function TokenOrderContent() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<OrderItemPayload[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [myTokenOrders, setMyTokenOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCustomerSet, setIsCustomerSet] = useState(false);

  // Inlined async fetch satisfies React 19 linter
  useEffect(() => {
    let active = true;

    async function fetchMenu() {
      const { data } = await supabase.from('menu_items').select('*').order('category');
      if (active && data) {
        setMenu(data as MenuItem[]);
      }
    }

    void fetchMenu();

    return () => {
      active = false;
    };
  }, []);

  // Realtime subscription for customer's token orders (updates when kitchen marks Ready)
  useEffect(() => {
    if (myTokenOrders.length === 0) return;

    const tokenIds = myTokenOrders.map((o) => o.id);
    const channel = supabase
      .channel('customer-tokens-stream')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updated = payload.new as OrderWithItems;
          if (tokenIds.includes(updated.id)) {
            setMyTokenOrders((prev) =>
              prev.map((o) => (o.id === updated.id ? { ...o, status: updated.status } : o))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myTokenOrders]);

  const handleCheckout = async () => {
    if (cart.length === 0 || !name.trim()) return;
    setLoading(true);

    const { data: tokenNum, error: tokenErr } = await supabase.rpc('get_next_token');
    if (tokenErr) {
      alert('Error allocating token. Please try again.');
      setLoading(false);
      return;
    }

    const total = cart.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);

    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_type: 'TOKEN',
        token_number: tokenNum,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        total_amount: total,
        status: 'RECEIVED',
        is_paid: false,
      })
      .select()
      .single();

    if (!orderErr && orderData) {
      const orderItems = cart.map((i) => ({
        order_id: orderData.id,
        menu_item_id: i.menu_item_id,
        item_name: i.item_name,
        quantity: i.quantity,
        price: i.price,
        notes: i.notes || '',
      }));
      await supabase.from('order_items').insert(orderItems);

      const { data: fullOrder } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderData.id)
        .single();

      if (fullOrder) {
        setMyTokenOrders((prev) => [fullOrder as OrderWithItems, ...prev]);
      }
      setCart([]);
    }
    setLoading(false);
  };

  return (
    <main className="max-w-md mx-auto min-h-screen px-4 pt-6 pb-20 bg-cafe-ivory text-cafe-espresso font-body">
      {/* Header with Centered Logo */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading font-black text-2xl text-cafe-deepEspresso flex items-center gap-2.5">
            <CafeLogo size={36} /> Takeaway Token
          </h1>
          <p className="text-xs text-cafe-espresso/70 mt-0.5">
            Lara’s Cafe • Pick up at the counter when called
          </p>
        </div>
      </header>

      {!isCustomerSet ? (
        <div className="bg-white/80 p-5 rounded-2xl border border-cafe-warmGrey shadow-sm mb-6">
          <h2 className="text-xs font-bold text-cafe-deepEspresso mb-3 uppercase tracking-wider">
            Enter Your Details
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-cafe-espresso/70">Name</label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-3 w-4 h-4 text-cafe-warmGrey" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-cafe-ivory border border-cafe-warmGrey rounded-lg focus:ring-1 focus:ring-cafe-clay outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-cafe-espresso/70">Phone (for order verification)</label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-cafe-warmGrey" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-cafe-ivory border border-cafe-warmGrey rounded-lg focus:ring-1 focus:ring-cafe-clay outline-none"
                />
              </div>
            </div>
            <button
              onClick={() => {
                if (name.trim()) setIsCustomerSet(true);
              }}
              className="w-full py-2.5 bg-cafe-clay text-white rounded-xl text-xs font-bold hover:bg-cafe-rosewood mt-2 transition shadow-sm cursor-pointer"
            >
              Start Ordering
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center bg-cafe-oat/50 p-3 rounded-xl border border-cafe-warmGrey/60 mb-6">
          <span className="text-xs font-semibold">
            Ordering as: <span className="text-cafe-clay font-bold">{name}</span>
          </span>
          <button
            onClick={() => setIsCustomerSet(false)}
            className="text-[11px] underline text-cafe-espresso/70 hover:text-cafe-deepEspresso cursor-pointer"
          >
            Change
          </button>
        </div>
      )}

      {myTokenOrders.length > 0 && (
        <div className="mb-6 space-y-2">
          <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-cafe-deepEspresso">
            Your Active Tokens
          </h3>
          {myTokenOrders.map((o) => (
            <div
              key={o.id}
              className="p-3.5 bg-cafe-midnightNavy text-white rounded-2xl flex justify-between items-center shadow-md"
            >
              <div>
                <span className="text-[10px] text-cafe-oat uppercase tracking-widest font-bold">
                  Token Number
                </span>
                <p className="text-3xl font-black font-heading text-cafe-ivory">#{o.token_number}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  o.status === 'READY'
                    ? 'bg-emerald-500 text-white animate-pulse'
                    : 'bg-cafe-clay text-white'
                }`}
              >
                {o.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <LiveOrderStatus orders={myTokenOrders} />
      <MenuCatalog items={menu} onAddToCart={(item) => setCart((prev) => [...prev, item])} />
      <CartDrawer
        cart={cart}
        onRemove={(idx) => setCart((prev) => prev.filter((_, i) => i !== idx))}
        onCheckout={handleCheckout}
        isLoading={loading}
      />
    </main>
  );
}

export default function TokenOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-cafe-espresso">
          Loading Takeaway Token Screen...
        </div>
      }
    >
      <TokenOrderContent />
    </Suspense>
  );
}