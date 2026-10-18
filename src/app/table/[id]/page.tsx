'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { TableSession, MenuItem, OrderItemPayload, OrderWithItems } from '@/types/database';
import PinModal from '@/components/customer/PinModal';
import MenuCatalog from '@/components/customer/MenuCatalog';
import CartDrawer from '@/components/customer/CartDrawer';
import CafeLogo from '@/components/CafeLogo';
import LiveOrderStatus from '@/components/customer/LiveOrderStatus';
import { Utensils } from 'lucide-react';

function TableContent() {
  const params = useParams();
  const tableId = Number(params?.id) || 1;

  const [session, setSession] = useState<TableSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<OrderItemPayload[]>([]);
  const [activeOrders, setActiveOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Load Table session and menu data
  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        const { data: initialTableData, error: tErr } = await supabase
          .from('table_sessions')
          .select('*')
          .eq('table_number', tableId)
          .maybeSingle();

        if (tErr) throw new Error(tErr.message);

        let tableData = initialTableData;
        if (!tableData) {
          const { data: newTable, error: insErr } = await supabase
            .from('table_sessions')
            .upsert({ table_number: tableId, status: 'IDLE', current_pin: null })
            .select()
            .single();
          if (insErr) throw new Error(insErr.message);
          tableData = newTable;
        }

        if (active && tableData) setSession(tableData);

        const { data: menuData, error: mErr } = await supabase
          .from('menu_items')
          .select('*')
          .order('category');

        if (mErr) throw new Error(mErr.message);
        if (active && menuData) setMenu(menuData);
        if (active) setDbError(null);
      } catch (err: unknown) {
        const error = err as Error;
        if (active) setDbError(error.message);
      }
    }

    void loadInitialData();

    // Listen for desk settlements or session changes
    const sessionChannel = supabase
      .channel(`table-channel-${tableId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'table_sessions', filter: `table_number=eq.${tableId}` },
        (payload) => {
          const updated = payload.new as TableSession;
          if (updated && active) {
            setSession(updated);
            if (updated.status === 'IDLE') {
              setIsAuthenticated(false);
              setActiveOrders([]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(sessionChannel);
    };
  }, [tableId]);

  // Load table orders once authenticated
  useEffect(() => {
    if (!session?.session_id || !isAuthenticated) return;
    let active = true;

    async function loadOrders() {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('table_number', tableId)
        .eq('session_id', session!.session_id)
        .neq('status', 'COMPLETED');
      if (active && data) setActiveOrders(data as OrderWithItems[]);
    }

    void loadOrders();

    const ordersChannel = supabase
      .channel(`orders-channel-${tableId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `table_number=eq.${tableId}` },
        () => {
          void loadOrders();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => {
          void loadOrders();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ordersChannel);
    };
  }, [tableId, session, isAuthenticated]);

  // Saves the generated PIN into the database
  const handleSessionSuccess = async (userData: { name: string; phone: string; pin: string }) => {
    // 1. Update UI optimistically
    setSession((prev) =>
      prev
        ? {
            ...prev,
            status: 'ACTIVE',
            current_pin: userData.pin,
            customer_name: userData.name,
            customer_phone: userData.phone,
          }
        : null
    );
    setIsAuthenticated(true);

    // 2. Persist to Supabase
    if (session?.status === 'IDLE') {
      const { data, error } = await supabase
        .from('table_sessions')
        .update({
          status: 'ACTIVE',
          current_pin: userData.pin,
          customer_name: userData.name,
          customer_phone: userData.phone,
          session_id: crypto.randomUUID(),
        })
        .eq('table_number', tableId)
        .select()
        .single();

      if (error) {
        alert(`Error setting table session: ${error.message}`);
      } else if (data) {
        setSession(data);
      }
    }
  };

  // Reset helper if table was left occupied from testing
  const handleResetTable = async () => {
    const { data, error } = await supabase
      .from('table_sessions')
      .update({
        status: 'IDLE',
        current_pin: null,
        customer_name: null,
        customer_phone: null,
      })
      .eq('table_number', tableId)
      .select()
      .single();

    if (!error && data) {
      setSession(data);
      setIsAuthenticated(false);
      setActiveOrders([]);
    }
  };

  const handleAddToCart = (item: OrderItemPayload) => {
    setCart((prev) => [...prev, item]);
  };

  const handleRemoveFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !session) return;
    setLoading(true);

    const total = cart.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);

    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_type: 'TABLE',
        table_number: tableId,
        session_id: session.session_id,
        customer_name: session.customer_name || 'Guest',
        customer_phone: session.customer_phone || '',
        total_amount: total,
        status: 'RECEIVED',
      })
      .select()
      .single();

    if (orderErr || !orderData) {
      alert('Could not place order. Please try again.');
      setLoading(false);
      return;
    }

    const orderItems = cart.map((i) => ({
      order_id: orderData.id,
      menu_item_id: i.menu_item_id,
      item_name: i.item_name,
      quantity: i.quantity,
      price: i.price,
      notes: i.notes || '',
    }));

    await supabase.from('order_items').insert(orderItems);
    setCart([]);
    setLoading(false);
  };

  return (
    <main className="max-w-md mx-auto min-h-screen px-4 pt-6 pb-20 bg-cafe-ivory text-cafe-espresso">
      {/* Table Header with Live PIN Badge */}
      <header className="flex justify-between items-center mb-6">
        <div>
        <h1 className="font-heading font-black text-2xl text-cafe-deepEspresso flex items-center gap-2.5">
            <CafeLogo size={32} /> Lara’s Cafe
        </h1>
            <p className="text-xs text-cafe-espresso/70">College Campus Hub • Table {tableId}</p>
        </div>
        {session?.status === 'ACTIVE' && session.current_pin && (
            <div className="bg-cafe-oat/90 px-3 py-1.5 rounded-lg border border-cafe-warmGrey text-right shadow-sm">
                <span className="text-[10px] block uppercase font-bold text-cafe-espresso/60">Table PIN</span>
                <span className="font-mono font-bold text-base text-cafe-deepEspresso">{session.current_pin}</span>
            </div>
  )}
</header>

      {dbError && (
        <div className="p-3 mb-4 text-xs font-semibold bg-red-100 text-red-900 border border-red-300 rounded-xl">
          {dbError}
        </div>
      )}

      {!isAuthenticated && session && (
        <PinModal
          session={session}
          tableId={tableId}
          onSuccess={handleSessionSuccess}
          onResetTable={handleResetTable}
        />
      )}

      <LiveOrderStatus orders={activeOrders} />
      <MenuCatalog items={menu} onAddToCart={handleAddToCart} />
      <CartDrawer
        cart={cart}
        onRemove={handleRemoveFromCart}
        onCheckout={handleCheckout}
        isLoading={loading}
      />
    </main>
  );
}

export default function TablePage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-xs text-cafe-espresso">Loading Table...</div>}>
      <TableContent />
    </Suspense>
  );
}