'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { OrderWithItems } from '@/types/database';
import {
  TrendingUp,
  LayoutDashboard,
  PackageCheck,
  Calendar,
  DollarSign,
  ShoppingBag,
  Users,
  Store,
  Clock,
  Sparkles,
  Receipt,
  ShieldCheck,
} from 'lucide-react';

interface DailyLog {
  date: string;
  day_name: string;
  week_start_date: string;
  total_revenue: number;
  total_orders: number;
  table_revenue: number;
  token_revenue: number;
  top_items: { name: string; count: number; revenue: number }[];
}

function AnalyticsContent() {
  const [weeklyLogs, setWeeklyLogs] = useState<DailyLog[]>([]);
  const [todayLiveOrders, setTodayLiveOrders] = useState<OrderWithItems[]>([]);

  // Compute Sunday of the current week (Format: YYYY-MM-DD)
  const currentWeekSundayStr = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday
    const sun = new Date(now);
    sun.setDate(now.getDate() - day);
    return sun.toISOString().split('T')[0];
  }, []);

  const loadAnalyticsData = async () => {
    try {
      // 1. Fetch current week's daily rollups (starting Sunday)
      const { data: logsData } = await supabase
        .from('daily_analytics')
        .select('*')
        .eq('week_start_date', currentWeekSundayStr)
        .order('date', { ascending: true });

      if (logsData) setWeeklyLogs(logsData as DailyLog[]);

      // 2. Fetch all of today's live orders (retained throughout daytime)
      const { data: liveData } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('is_paid', true)
        .order('created_at', { ascending: false });

      if (liveData) setTodayLiveOrders(liveData as OrderWithItems[]);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAnalyticsData();
  }, [currentWeekSundayStr]);

  // Combined Calculations for the current week starting Sunday
  const weeklyStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isTodayAlreadyPurged = weeklyLogs.some((log) => log.date === todayStr);

    // Sum from rolled-up days
    let weekRevenue = weeklyLogs.reduce((acc, log) => acc + Number(log.total_revenue), 0);
    let weekOrders = weeklyLogs.reduce((acc, log) => acc + Number(log.total_orders), 0);
    let weekTableRev = weeklyLogs.reduce((acc, log) => acc + Number(log.table_revenue), 0);
    let weekTokenRev = weeklyLogs.reduce((acc, log) => acc + Number(log.token_revenue), 0);

    // Today's live stats
    let todayLiveRevenue = 0;
    let todayLiveOrdersCount = 0;
    let todayLiveTableRev = 0;
    let todayLiveTokenRev = 0;

    todayLiveOrders.forEach((o) => {
      const amt = Number(o.total_amount) || 0;
      todayLiveRevenue += amt;
      todayLiveOrdersCount += 1;
      if (o.order_type === 'TABLE') todayLiveTableRev += amt;
      else todayLiveTokenRev += amt;
    });

    // Before 9 PM, add today's live numbers to this week's running totals
    if (!isTodayAlreadyPurged) {
      weekRevenue += todayLiveRevenue;
      weekOrders += todayLiveOrdersCount;
      weekTableRev += todayLiveTableRev;
      weekTokenRev += todayLiveTokenRev;
    }

    const todayDisplayRevenue = isTodayAlreadyPurged
      ? weeklyLogs.find((l) => l.date === todayStr)?.total_revenue || 0
      : todayLiveRevenue;

    const todayDisplayOrders = isTodayAlreadyPurged
      ? weeklyLogs.find((l) => l.date === todayStr)?.total_orders || 0
      : todayLiveOrdersCount;

    // Item tally for the week
    const itemMap: { [name: string]: number } = {};
    weeklyLogs.forEach((l) => {
      l.top_items?.forEach((i) => {
        itemMap[i.name] = (itemMap[i.name] || 0) + i.count;
      });
    });

    if (!isTodayAlreadyPurged) {
      todayLiveOrders.forEach((o) => {
        o.order_items?.forEach((i) => {
          itemMap[i.item_name] = (itemMap[i.item_name] || 0) + i.quantity;
        });
      });
    }

    const topItemsThisWeek = Object.entries(itemMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const weekAOV = weekOrders > 0 ? weekRevenue / weekOrders : 0;

    return {
      todayDisplayRevenue: Number(todayDisplayRevenue),
      todayDisplayOrders: Number(todayDisplayOrders),
      weekRevenue,
      weekOrders,
      weekAOV,
      weekTableRev,
      weekTokenRev,
      topItemsThisWeek,
      isTodayAlreadyPurged,
    };
  }, [weeklyLogs, todayLiveOrders]);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="min-h-screen bg-cafe-ivory text-cafe-espresso p-4 lg:p-8 font-body">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 mb-6 border-b border-cafe-warmGrey/50">
        <div>
          <h1 className="font-heading font-black text-2xl lg:text-3xl text-cafe-deepEspresso flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-emerald-700" /> Weekly Revenue &amp; Analytics
          </h1>
          <p className="text-xs text-cafe-espresso/70 mt-1">
            Week of Sunday, {currentWeekSundayStr} • All daytime orders retained until 9:00 PM IST
          </p>
        </div>

        {/* Global Navigation Hub */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Link
            href="/desk"
            className="px-3 py-1.5 rounded-xl font-bold bg-white border border-cafe-warmGrey hover:bg-cafe-oat text-cafe-espresso transition flex items-center gap-1.5"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-cafe-clay" /> Terminal
          </Link>
          <Link
            href="/desk/pos"
            className="px-3 py-1.5 rounded-xl font-bold bg-white border border-cafe-warmGrey hover:bg-cafe-oat text-cafe-espresso transition flex items-center gap-1.5"
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
            className="px-3 py-1.5 rounded-xl font-bold bg-cafe-espresso text-cafe-ivory shadow-sm flex items-center gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Analytics
          </Link>
        </div>
      </header>

      {/* 9:00 PM Automated Purge Info Banner */}
      <div className="bg-white/90 border border-cafe-warmGrey/80 p-4 rounded-2xl shadow-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cafe-oat text-cafe-deepEspresso rounded-xl">
            <Clock className="w-5 h-5 text-cafe-clay" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-xs uppercase text-cafe-deepEspresso">
              Nightly Purge Schedule: 9:00 PM IST
            </h2>
            <p className="text-[11px] text-cafe-espresso/60">
              Orders and receipts remain active in the database all day. At 9:00 PM, they are rolled into the weekly ledger.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Daytime Data Active</span>
        </div>
      </div>

      {/* Primary Weekly KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Today's Sales */}
        <div className="bg-white/80 p-5 rounded-2xl border border-cafe-warmGrey shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-bold uppercase text-cafe-espresso/60">Today&apos;s Collection</span>
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-heading font-black text-emerald-800 font-mono">
            ₹{weeklyStats.todayDisplayRevenue.toFixed(2)}
          </p>
          <p className="text-[10px] text-cafe-espresso/60 mt-1">
            {weeklyStats.todayDisplayOrders} orders {weeklyStats.isTodayAlreadyPurged ? '(Closed at 9 PM)' : '(Live Daytime)'}
          </p>
        </div>

        {/* This Week's Sales (Sun-Sat) */}
        <div className="bg-white/80 p-5 rounded-2xl border border-cafe-warmGrey shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-bold uppercase text-cafe-espresso/60">This Week&apos;s Revenue</span>
            <div className="p-2 bg-cafe-oat text-cafe-clay rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-heading font-black text-cafe-clay font-mono">
            ₹{weeklyStats.weekRevenue.toFixed(2)}
          </p>
          <p className="text-[10px] text-cafe-espresso/60 mt-1">
            {weeklyStats.weekOrders} total orders this week
          </p>
        </div>

        {/* In-Cafe Tables Share */}
        <div className="bg-white/80 p-5 rounded-2xl border border-cafe-warmGrey shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-bold uppercase text-cafe-espresso/60">Table Revenue (Week)</span>
            <div className="p-2 bg-cafe-navy text-white rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-heading font-black text-cafe-deepEspresso font-mono">
            ₹{weeklyStats.weekTableRev.toFixed(2)}
          </p>
          <p className="text-[10px] text-cafe-espresso/60 mt-1">In-cafe seated tables (1–9)</p>
        </div>

        {/* Takeaway Tokens Share */}
        <div className="bg-white/80 p-5 rounded-2xl border border-cafe-warmGrey shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-bold uppercase text-cafe-espresso/60">Token Revenue (Week)</span>
            <div className="p-2 bg-cafe-rosewood text-white rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-heading font-black text-cafe-deepEspresso font-mono">
            ₹{weeklyStats.weekTokenRev.toFixed(2)}
          </p>
          <p className="text-[10px] text-cafe-espresso/60 mt-1">Takeaway &amp; floating counter pickup</p>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Left Column (8 Cols): Day-by-Day Weekly Ledger (Sun -> Sat) */}
        <div className="lg:col-span-8 bg-white/80 rounded-2xl border border-cafe-warmGrey shadow-sm p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-heading font-bold text-sm tracking-wide uppercase text-cafe-deepEspresso">
                Weekly Ledger (Sunday – Saturday)
              </h2>
              <span className="text-[11px] text-cafe-espresso/60">
                Resets fresh every Sunday morning
              </span>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
              Avg ₹{weeklyStats.weekAOV.toFixed(0)} / order
            </span>
          </div>

          <div className="divide-y divide-cafe-warmGrey/25 text-xs">
            {daysOfWeek.map((dayName, idx) => {
              const logEntry = weeklyLogs.find(
                (l) => l.day_name.toLowerCase() === dayName.toLowerCase()
              );

              const todayIdx = new Date().getDay();
              const isToday = todayIdx === idx;
              const hasLiveToday = isToday && !weeklyStats.isTodayAlreadyPurged;

              const displayRev = logEntry
                ? Number(logEntry.total_revenue)
                : hasLiveToday
                ? weeklyStats.todayDisplayRevenue
                : 0;

              const displayOrd = logEntry
                ? logEntry.total_orders
                : hasLiveToday
                ? weeklyStats.todayDisplayOrders
                : 0;

              return (
                <div key={dayName} className="py-3 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-cafe-oat text-cafe-deepEspresso font-bold text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-cafe-deepEspresso">{dayName}</span>
                      {isToday && (
                        <span className="ml-2 text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                          Today
                        </span>
                      )}
                      <p className="text-[10px] text-cafe-espresso/50">
                        {displayOrd} orders placed
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-sm text-cafe-clay">
                      ₹{displayRev.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-cafe-espresso/40 block">
                      {logEntry ? 'Settled (Archived)' : hasLiveToday ? 'Active Daytime' : '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (4 Cols): This Week's Bestsellers */}
        <div className="lg:col-span-4 bg-white/80 rounded-2xl border border-cafe-warmGrey shadow-sm p-5 space-y-4">
          <div>
            <h2 className="font-heading font-bold text-sm tracking-wide uppercase text-cafe-deepEspresso flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" /> Bestsellers This Week
            </h2>
            <span className="text-[11px] text-cafe-espresso/60">Top-selling food &amp; drinks</span>
          </div>

          {weeklyStats.topItemsThisWeek.length === 0 ? (
            <p className="text-xs text-cafe-espresso/50 py-8 text-center">No orders recorded this week yet.</p>
          ) : (
            <div className="space-y-3">
              {weeklyStats.topItemsThisWeek.map((item, idx) => (
                <div key={item.name} className="flex justify-between items-center text-xs p-2 bg-cafe-ivory/60 rounded-xl border border-cafe-warmGrey/40">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-cafe-deepEspresso truncate max-w-[140px]">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-bold text-cafe-clay">{item.count} sold</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live Daytime Order Log (Retained until 9:00 PM) */}
      <div className="bg-white/80 rounded-2xl border border-cafe-warmGrey shadow-sm p-5">
        <h2 className="font-heading font-bold text-sm tracking-wide uppercase text-cafe-deepEspresso mb-4 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-cafe-clay" /> Today&apos;s Active Receipts (Purges at 9:00 PM)
        </h2>

        {todayLiveOrders.length === 0 ? (
          <p className="text-xs text-cafe-espresso/50 py-6 text-center">
            {weeklyStats.isTodayAlreadyPurged
              ? 'Today’s receipts were archived into the ledger at 9:00 PM.'
              : 'No orders placed today yet.'}
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y divide-cafe-warmGrey/25 pr-1 text-xs">
            {todayLiveOrders.map((order) => (
              <div key={order.id} className="py-2.5 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cafe-deepEspresso">
                      {order.order_type === 'TABLE' ? `Table ${order.table_number}` : `Token #${order.token_number}`}
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                      Paid
                    </span>
                  </div>
                  <p className="text-[11px] text-cafe-espresso/60">
                    {order.customer_name} •{' '}
                    {new Date(order.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className="font-mono font-bold text-sm text-cafe-clay">
                  ₹{Number(order.total_amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Loading Weekly Analytics...</div>}>
      <AnalyticsContent />
    </Suspense>
  );
}