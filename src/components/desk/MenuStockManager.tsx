'use client';
import { MenuItem } from '@/types/database';

interface MenuStockManagerProps {
  items: MenuItem[];
  onToggleStock: (id: string, current: boolean) => void;
}

export default function MenuStockManager({ items, onToggleStock }: MenuStockManagerProps) {
  return (
    <div className="bg-white rounded-2xl border border-cafe-warmGrey p-4 shadow-sm max-h-96 overflow-y-auto">
      <h3 className="font-heading font-bold text-cafe-deepEspresso text-sm mb-3">
        Quick Menu Availability (In Stock / 86-ed)
      </h3>
      <div className="divide-y divide-cafe-warmGrey/20">
        {items.map((item) => (
          <div key={item.id} className="py-2.5 flex justify-between items-center text-xs">
            <div>
              <span className="font-semibold text-cafe-espresso">{item.name}</span>
              <span className="text-[10px] text-cafe-espresso/50 block">₹{Number(item.price).toFixed(2)}</span>
            </div>
            <button
              onClick={() => onToggleStock(item.id, item.is_available)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition ${
                item.is_available
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {item.is_available ? 'In Stock' : 'Sold Out'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}