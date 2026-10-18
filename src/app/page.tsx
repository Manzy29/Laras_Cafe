import Link from 'next/link';
import CafeLogo from '@/components/CafeLogo';
import { LayoutDashboard, Ticket, QrCode } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-cafe-ivory flex flex-col items-center justify-center p-6 text-cafe-espresso font-body">
      <div className="w-full max-w-md space-y-6">
        {/* Branding Header: Logo rendered directly with no outer beige wrapper */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <CafeLogo size={80} className="shadow-lg" />
          </div>
          <h1 className="font-heading font-black text-3xl text-cafe-deepEspresso">
            Lara’s Cafe
          </h1>
          <p className="text-xs text-cafe-espresso/70">
            College Campus Quick-Order &amp; Table System
          </p>
        </div>

        {/* Portals */}
        <div className="space-y-3">
          {/* Desk & Kitchen View */}
          <Link
            href="/desk"
            className="flex items-center justify-between p-4 bg-white/90 rounded-2xl border border-cafe-warmGrey/70 shadow-sm hover:border-cafe-clay transition group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cafe-navy text-white rounded-xl">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h2 className="font-heading font-bold text-sm text-cafe-deepEspresso group-hover:text-cafe-clay transition">
                  Desk &amp; Kitchen View
                </h2>
                <p className="text-[11px] text-cafe-espresso/60">
                  Manage live tickets, table tabs &amp; settlement
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-cafe-clay">Open &rarr;</span>
          </Link>

          {/* Takeaway / Floating Token */}
          <Link
            href="/token-order"
            className="flex items-center justify-between p-4 bg-white/90 rounded-2xl border border-cafe-warmGrey/70 shadow-sm hover:border-cafe-clay transition group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cafe-clay text-white rounded-xl">
                <Ticket className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h2 className="font-heading font-bold text-sm text-cafe-deepEspresso group-hover:text-cafe-clay transition">
                  Takeaway / Floating Token
                </h2>
                <p className="text-[11px] text-cafe-espresso/60">
                  Generate floating tokens for counter pickup
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-cafe-clay">Open &rarr;</span>
          </Link>

          {/* Table QR Simulators (1 to 9) */}
          <div className="p-4 bg-cafe-oat/40 rounded-2xl border border-cafe-warmGrey/50 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cafe-espresso/70">
              <QrCode className="w-4 h-4 text-cafe-clay" /> Simulate Table QR Scans
            </div>
            <p className="text-[11px] text-cafe-espresso/60">
              Click any table below to simulate scanning that table’s QR code:
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((tbl) => (
                <Link
                  key={tbl}
                  href={`/table/${tbl}`}
                  className="py-2 text-center text-xs font-bold bg-white rounded-lg border border-cafe-warmGrey/60 hover:bg-cafe-rosewood hover:text-white transition shadow-sm"
                >
                  Table {tbl}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}