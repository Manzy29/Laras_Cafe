'use client';
import { useState } from 'react';
import { MenuItem, OrderItemPayload } from '@/types/database';
import { Plus, MessageSquare, Check, Star } from 'lucide-react';

interface MenuCatalogProps {
  items: MenuItem[];
  onAddToCart: (item: OrderItemPayload) => void;
}

export default function MenuCatalog({ items, onAddToCart }: MenuCatalogProps) {
  // Defaults to "Bestsellers" instead of "All"
  const [selectedCategory, setSelectedCategory] = useState<string>('Bestsellers');
  const [noteOpenId, setNoteOpenId] = useState<string | null>(null);
  const [itemNotes, setItemNotes] = useState<{ [id: string]: string }>({});

  // Categories list starting with "Bestsellers"
  const categories = ['Bestsellers', ...Array.from(new Set(items.map((i) => i.category)))];

  // Filter logic: "Bestsellers" filters where is_bestseller === true
  const filteredItems =
    selectedCategory === 'Bestsellers'
      ? items.filter((i) => i.is_bestseller)
      : items.filter((i) => i.category === selectedCategory);

  const handleAdd = (item: MenuItem) => {
    onAddToCart({
      menu_item_id: item.id,
      item_name: item.name,
      quantity: 1,
      price: item.price,
      notes: itemNotes[item.id] || '',
    });
    setItemNotes((prev) => ({ ...prev, [item.id]: '' }));
    setNoteOpenId(null);
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          const isBestsellerTab = cat === 'Bestsellers';

          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? isBestsellerTab
                    ? 'bg-amber-500 text-cafe-deepEspresso shadow-md'
                    : 'bg-cafe-espresso text-cafe-ivory shadow'
                  : isBestsellerTab
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-cafe-oat/70 text-cafe-espresso hover:bg-cafe-oat'
              }`}
            >
              {isBestsellerTab && <Star className="w-3.5 h-3.5 fill-current" />}
              {cat}
            </button>
          );
        })}
      </div>

      {/* Item List */}
      {filteredItems.length === 0 ? (
        <div className="p-8 text-center text-xs text-cafe-espresso/60 bg-white/50 rounded-2xl border border-dashed border-cafe-warmGrey">
          No items currently found in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all ${
                item.is_available
                  ? 'bg-white/80 border-cafe-warmGrey/60 shadow-sm'
                  : 'bg-cafe-warmGrey/20 border-cafe-warmGrey/30 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-heading font-semibold text-cafe-deepEspresso text-sm">
                      {item.name}
                    </h3>
                    {item.is_bestseller && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-current text-amber-600" /> Bestseller
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-cafe-espresso/60">{item.category}</span>
                  <p className="mt-2 font-bold text-cafe-clay text-sm">
                    ₹{Number(item.price).toFixed(2)}
                    <span className="text-[10px] text-cafe-espresso/50 font-normal ml-1">incl. GST</span>
                  </p>
                </div>

                {item.is_available ? (
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => handleAdd(item)}
                      className="p-2 bg-cafe-clay hover:bg-cafe-rosewood text-white rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setNoteOpenId(noteOpenId === item.id ? null : item.id)}
                      className="text-[11px] text-cafe-espresso/70 hover:text-cafe-clay flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" />
                      {itemNotes[item.id] ? 'Edit note' : 'Add note'}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded">
                    Sold Out
                  </span>
                )}
              </div>

              {noteOpenId === item.id && item.is_available && (
                <div className="mt-3 pt-3 border-t border-cafe-warmGrey/30 flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Less sugar, extra spicy, no ice..."
                    value={itemNotes[item.id] || ''}
                    onChange={(e) => setItemNotes({ ...itemNotes, [item.id]: e.target.value })}
                    className="w-full text-xs bg-cafe-ivory/80 border border-cafe-warmGrey rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cafe-clay"
                  />
                  <button
                    onClick={() => setNoteOpenId(null)}
                    className="px-2 py-1 bg-cafe-navy text-white text-xs rounded-lg flex items-center cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}