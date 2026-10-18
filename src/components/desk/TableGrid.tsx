'use client';
import { TableSession } from '@/types/database';
import {CheckCircle, ShieldAlert } from 'lucide-react';

interface TableGridProps {
  tables: TableSession[];
  onForceReset: (tableNumber: number) => void;
  onSettleAndClose: (tableNumber: number) => void;
}

export default function TableGrid({ tables, onForceReset, onSettleAndClose }: TableGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {tables.map((table) => {
        const isActive = table.status === 'ACTIVE';

        return (
          <div
            key={table.table_number}
            className={`p-4 rounded-xl border transition flex flex-col justify-between ${
              isActive
                ? 'bg-white border-cafe-clay shadow-sm'
                : 'bg-cafe-ivory/50 border-cafe-warmGrey/60 opacity-70'
            }`}
          >
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-heading font-bold text-lg text-cafe-deepEspresso">
                  T-{table.table_number}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-amber-100 text-amber-900' : 'bg-cafe-warmGrey/40 text-cafe-espresso/60'
                  }`}
                >
                  {table.status}
                </span>
              </div>

              {isActive ? (
                <div className="space-y-1 mb-4 text-xs text-cafe-espresso/80">
                  <p className="truncate"><span className="text-cafe-espresso/50">Host:</span> {table.customer_name}</p>
                  <p><span className="text-cafe-espresso/50">PIN:</span> <span className="font-mono font-bold text-cafe-rosewood">{table.current_pin}</span></p>
                </div>
              ) : (
                <p className="text-xs text-cafe-warmGrey py-3">Available</p>
              )}
            </div>

            {isActive && (
              <div className="flex flex-col gap-1.5 pt-2 border-t border-cafe-warmGrey/20">
                <button
                  onClick={() => onSettleAndClose(table.table_number)}
                  className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold flex items-center justify-center gap-1 shadow-sm"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Settle & Close
                </button>
                <button
                  onClick={() => onForceReset(table.table_number)}
                  className="w-full py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-[11px] font-medium flex items-center justify-center gap-1"
                >
                  <ShieldAlert className="w-3 h-3" /> Force Reset
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}