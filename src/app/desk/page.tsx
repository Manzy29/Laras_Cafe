'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { TableSession, OrderWithItems } from '@/types/database';
import CafeLogo from '@/components/CafeLogo';
import {
  LayoutDashboard,
  CheckCircle2,
  ChefHat,
  Check,
  CheckSquare,
  Square,
  DollarSign,
  PackageCheck,
  TrendingUp,
  Search,
  Filter,
  Utensils,
  Store,
  ArrowRight,
} from 'lucide-react';

function DeskContent() {
  const [tables, setTables] = useState<TableSession[]>([]);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TABLES' | 'TOKENS'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTableForPayment, setSelectedTableForPayment] = useState<number | null>(null);

  const loadData = async () => {
    try {
      const { data: tData } = await supabase.from('table_sessions').select('*').order('table_number');
      if (tData) setTables(tData);

      // Keep unpaid orders (for table tabs) OR tickets still being prepared in the kitchen
      const { data: oData } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .or('is_paid.eq.false,status.neq.COMPLETED')
        .order('created_at', { ascending: false });

      if (oData) setOrders(oData as OrderWithItems[]);
    } catch (err) {
      console.error('Error fetching desk data:', err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();

    const channel = supabase
      .channel('desk-terminal-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Running bill for each table sums all unpaid orders
  const tableRunningTotals = useMemo(() => {
    const map: { [tableNum: number]: number } = {};
    tables.forEach((t) => (map[t.table_number] = 0));
    orders.forEach((o) => {
      if (o.order_type === 'TABLE' && o.table_number && !o.is_paid) {
        map[o.table_number] = (map[o.table_number] || 0) + Number(o.total_amount);
      }
    });
    return map;
  }, [tables, orders]);

  // Toggle item check-off
  const handleToggleItemServed = async (itemId: string, currentStatus: boolean) => {
    await supabase.from('order_items').update({ is_served: !currentStatus }).eq('id', itemId);
  };

  // Table Kitchen Ticket: Food stage progression (Does NOT touch is_paid)
  const handleUpdateTableOrderStatus = async (orderId: string, nextStatus: string) => {
    await supabase.from('orders').update({ status: nextStatus }).eq('id', orderId);
  };

  // Token Order: Toggle Paid state (Turns Token Card Green)
  const handleToggleTokenPaid = async (orderId: string, currentPaidState: boolean) => {
    await supabase.from('orders').update({ is_paid: !currentPaidState }).eq('id', orderId);
  };

  // Token Order: Complete Order (Removes Token from active feed)
  const handleCompleteTokenOrder = async (orderId: string) => {
    await supabase
      .from('orders')
      .update({
        status: 'COMPLETED',
        is_paid: true,
      })
      .eq('id', orderId);
  };

  // Tables 1-9: Settle and Close Table Tab
  const handleSettleAndClose = async (tableNum: number) => {
    setIsProcessing(true);

    // 1. Mark all unpaid table orders as completed and paid
    await supabase
      .from('orders')
      .update({ is_paid: true, status: 'COMPLETED' })
      .eq('table_number', tableNum)
      .eq('is_paid', false);

    // 2. Reset Table to IDLE
    await supabase
      .from('table_sessions')
      .update({
        status: 'IDLE',
        current_pin: null,
        customer_name: null,
        customer_phone: null,
      })
      .eq('table_number', tableNum);

    setSelectedTableForPayment(null);
    setIsProcessing(false);
  };

  // Force reset abandoned table
  const handleForceReset = async (tableNum: number) => {
    if (!confirm(`Force reset Table ${tableNum}? This will unlock the table and clear its PIN.`)) return;

    await supabase
      .from('table_sessions')
      .update({
        status: 'IDLE',
        current_pin: null,
        customer_name: null,
        customer_phone: null,
      })
      .eq('table_number', tableNum);
  };

  // Active tickets in the queue (cleared tickets are excluded)
  const activeKitchenOrders = useMemo(() => {
    return orders.filter((o) => {
      if (o.status === 'COMPLETED') return false;

      const matchesType =
        statusFilter === 'ALL' ||
        (statusFilter === 'TABLES' && o.order_type === 'TABLE') ||
        (statusFilter === 'TOKENS' && o.order_type === 'TOKEN');

      const matchesSearch =
        o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customer_phone?.includes(searchTerm) ||
        (o.table_number && `table ${o.table_number}`.includes(searchTerm.toLowerCase())) ||
        (o.token_number && `token ${o.token_number}`.includes(searchTerm.toLowerCase()));

      return matchesType && matchesSearch;
    });
  }, [orders, statusFilter, searchTerm]);

  return (
    <div className="min-h-screen bg-cafe-ivory text-cafe-espresso p-4 lg:p-8 font-body">
      {/* Top Header with Centered Logo */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 mb-6 border-b border-cafe-warmGrey/50">
        <div>
          <h1 className="font-heading font-black text-2xl lg:text-3xl text-cafe-deepEspresso flex items-center gap-2.5">
            <CafeLogo size={36} /> Lara’s Cafe Terminal
          </h1>
          <p className="text-xs text-cafe-espresso/70 mt-1">
            Cashier Desk, Table Sessions &amp; Kitchen Dispatch
          </p>
        </div>

        {/* Global Navigation Hub */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Link
            href="/desk"
            className="px-3.5 py-2 rounded-xl font-bold bg-cafe-espresso text-cafe-ivory shadow-sm flex items-center gap-1.5"
          >
            <LayoutDashboard className="w-4 h-4 text-cafe-clay" /> Terminal
          </Link>
          <Link
            href="/desk/pos"
            className="px-3.5 py-2 rounded-xl font-bold bg-white/80 border border-cafe-warmGrey hover:bg-cafe-oat text-cafe-espresso transition flex items-center gap-1.5"
          >
            <Store className="w-4 h-4 text-cafe-clay" /> Counter POS
          </Link>
          <Link
            href="/desk/stock"
            className="px-3.5 py-2 rounded-xl font-bold bg-white/80 border border-cafe-warmGrey hover:bg-cafe-oat text-cafe-espresso transition flex items-center gap-1.5"
          >
            <PackageCheck className="w-4 h-4 text-cafe-clay" /> Stock Manager
          </Link>
          <Link
            href="/desk/analytics"
            className="px-3.5 py-2 rounded-xl font-bold bg-white/80 border border-cafe-warmGrey hover:bg-cafe-oat text-cafe-espresso transition flex items-center gap-1.5"
          >
            <TrendingUp className="w-4 h-4 text-emerald-700" /> Analytics
          </Link>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Tables 1-9 & POS Launcher */}
        <div className="xl:col-span-5 space-y-6">
          {/* Tables 1-9 Overview */}
          <div className="bg-white/80 p-5 rounded-2xl border border-cafe-warmGrey/70 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 className="font-heading font-bold text-sm tracking-wide uppercase text-cafe-deepEspresso">
                  Tables 1 to 9
                </h2>
                <span className="text-[10px] text-cafe-espresso/60 block">
                  All table payments must be settled here
                </span>
              </div>
              <span className="text-[11px] font-bold text-cafe-clay bg-cafe-oat px-2 py-0.5 rounded-full">
                {tables.filter((t) => t.status === 'ACTIVE').length} / 9 Occupied
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {tables.map((tbl) => {
                const isActive = tbl.status === 'ACTIVE';
                const total = tableRunningTotals[tbl.table_number] || 0;

                return (
                  <div
                    key={tbl.table_number}
                    className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                      isActive
                        ? 'bg-cafe-oat/40 border-cafe-clay shadow-sm'
                        : 'bg-cafe-ivory/40 border-cafe-warmGrey/40 opacity-70'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-heading font-black text-sm text-cafe-deepEspresso">
                          T-{tbl.table_number}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                            isActive ? 'bg-amber-100 text-amber-900' : 'bg-cafe-warmGrey/30 text-cafe-espresso/50'
                          }`}
                        >
                          {tbl.status}
                        </span>
                      </div>

                      {isActive ? (
                        <div className="text-[10px] space-y-0.5 mt-1.5 text-cafe-espresso/80">
                          <p className="font-medium truncate">{tbl.customer_name || 'Guest'}</p>
                          <p className="text-[10px] text-cafe-espresso/60">
                            PIN: <span className="font-mono font-bold text-cafe-rosewood">{tbl.current_pin}</span>
                          </p>
                          <p className="font-black text-cafe-clay text-xs pt-0.5">₹{total.toFixed(2)}</p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-cafe-warmGrey py-2">Empty</p>
                      )}
                    </div>

                    {isActive && (
                      <div className="pt-2 mt-2 border-t border-cafe-warmGrey/30 flex flex-col gap-1">
                        <button
                          onClick={() => setSelectedTableForPayment(tbl.table_number)}
                          className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold rounded shadow-sm transition cursor-pointer"
                        >
                          Settle Tab
                        </button>
                        <button
                          onClick={() => handleForceReset(tbl.table_number)}
                          className="w-full py-0.5 text-[9px] text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                        >
                          Reset Table
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Active Tickets Stream */}
        <div className="xl:col-span-7 space-y-4">
          <div className="bg-white/80 p-4 rounded-2xl border border-cafe-warmGrey/70 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-cafe-clay" />
              {(['ALL', 'TABLES', 'TOKENS'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    statusFilter === filter
                      ? 'bg-cafe-espresso text-cafe-ivory'
                      : 'bg-cafe-oat/60 text-cafe-espresso hover:bg-cafe-oat'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-cafe-warmGrey" />
              <input
                type="text"
                placeholder="Search table, token, name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-cafe-ivory/60 border border-cafe-warmGrey rounded-lg focus:outline-none focus:ring-1 focus:ring-cafe-clay"
              />
            </div>
          </div>

          {activeKitchenOrders.length === 0 ? (
            <div className="bg-white/50 border border-dashed border-cafe-warmGrey p-12 text-center rounded-2xl text-xs text-cafe-espresso/60">
              No active tickets waiting in kitchen queue.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeKitchenOrders.map((order) => {
                const isTable = order.order_type === 'TABLE';
                const isToken = order.order_type === 'TOKEN';
                const isPaid = order.is_paid;

                return (
                  <div
                    key={order.id}
                    className={`rounded-2xl border p-4 shadow-sm flex flex-col justify-between transition-all ${
                      isToken && isPaid
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-white border-cafe-warmGrey/80'
                    }`}
                  >
                    <div>
                      {/* Ticket Header */}
                      <div className="flex justify-between items-center pb-2 border-b border-cafe-warmGrey/30 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-black text-lg text-cafe-deepEspresso">
                            {isTable ? `Table ${order.table_number}` : `Token #${order.token_number}`}
                          </span>
                          {isToken && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isPaid
                                  ? 'bg-emerald-600 text-white animate-pulse'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {isPaid ? 'PAID ✓' : 'UNPAID'}
                            </span>
                          )}
                          {isTable && (
                            <span className="text-[10px] font-bold bg-cafe-oat text-cafe-deepEspresso px-2 py-0.5 rounded">
                              Table Tab
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-bold text-sm text-cafe-clay">
                          ₹{Number(order.total_amount).toFixed(2)}
                        </span>
                      </div>

                      {/* Guest and Time */}
                      <div className="flex justify-between text-[11px] text-cafe-espresso/70 mb-3">
                        <span>
                          {order.customer_name} {order.customer_phone ? `(${order.customer_phone})` : ''}
                        </span>
                        <span>
                          {new Date(order.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Item Checkboxes */}
                      <div className="space-y-1.5 mb-4">
                        {order.order_items.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleToggleItemServed(item.id, item.is_served)}
                            className="flex items-start gap-2 text-xs p-1.5 rounded-lg hover:bg-black/5 cursor-pointer transition select-none"
                          >
                            {item.is_served ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-cafe-warmGrey mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1">
                              <span
                                className={
                                  item.is_served
                                    ? 'line-through text-cafe-espresso/40'
                                    : 'font-semibold text-cafe-espresso'
                                }
                              >
                                {item.quantity}x {item.item_name}
                              </span>
                              {item.notes && (
                                <p className="text-[10px] text-cafe-clay font-medium italic mt-0.5">
                                  &quot;{item.notes}&quot;
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer Controls */}
                    <div className="pt-3 border-t border-cafe-warmGrey/20">
                      {isTable ? (
                        <div>
                          {order.status === 'RECEIVED' && (
                            <button
                              onClick={() => handleUpdateTableOrderStatus(order.id, 'PREPARING')}
                              className="w-full py-1.5 bg-cafe-navy hover:bg-cafe-midnightNavy text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <ChefHat className="w-3.5 h-3.5" /> Start Preparing
                            </button>
                          )}
                          {order.status === 'PREPARING' && (
                            <button
                              onClick={() => handleUpdateTableOrderStatus(order.id, 'READY')}
                              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" /> Mark Ready
                            </button>
                          )}
                          {order.status === 'READY' && (
                            <div className="space-y-1">
                              <button
                                onClick={() => handleUpdateTableOrderStatus(order.id, 'COMPLETED')}
                                className="w-full py-1.5 bg-cafe-clay hover:bg-cafe-rosewood text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                              >
                                <Utensils className="w-3.5 h-3.5" /> Food Served (Clear Ticket)
                              </button>
                              <span className="text-[10px] text-cafe-espresso/50 block text-center">
                                Payment tracked under Table {order.table_number}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleTokenPaid(order.id, isPaid)}
                            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              isPaid
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            }`}
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            {isPaid ? 'Paid ✓' : 'Mark Paid'}
                          </button>

                          <button
                            onClick={() => handleCompleteTokenOrder(order.id)}
                            className="flex-1 py-1.5 bg-cafe-clay hover:bg-cafe-rosewood text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Complete Order
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Settle Bill Modal */}
      {selectedTableForPayment !== null && (
        <div className="fixed inset-0 z-50 bg-cafe-midnightNavy/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cafe-ivory border border-cafe-warmGrey w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-cafe-oat text-cafe-clay rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
              <h2 className="font-heading font-black text-xl text-cafe-deepEspresso">
                Settle Table {selectedTableForPayment}
              </h2>
            </div>

            <p className="text-xs text-cafe-espresso/70 mb-4">
              Collect payment via cash or your desk counter UPI QR code. This settles all food rounds and frees Table {selectedTableForPayment}.
            </p>

            <div className="bg-white p-4 rounded-xl border border-cafe-warmGrey/50 mb-6 text-center">
              <span className="text-[11px] uppercase font-bold text-cafe-espresso/60 tracking-wider">
                Total Bill (GST Incl.)
              </span>
              <p className="text-3xl font-heading font-black text-cafe-clay mt-1">
                ₹{(tableRunningTotals[selectedTableForPayment] || 0).toFixed(2)}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                disabled={isProcessing}
                onClick={() => setSelectedTableForPayment(null)}
                className="w-1/2 py-2.5 bg-white border border-cafe-warmGrey hover:bg-cafe-oat/40 rounded-xl text-xs font-semibold text-cafe-espresso transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isProcessing}
                onClick={() => handleSettleAndClose(selectedTableForPayment)}
                className="w-1/2 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? 'Closing...' : 'Paid & Close Table'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeskPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cafe-ivory flex items-center justify-center text-xs text-cafe-espresso">
          Loading Lara’s Cafe Desk Terminal...
        </div>
      }
    >
      <DeskContent />
    </Suspense>
  );
}