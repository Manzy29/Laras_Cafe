'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { MenuItem } from '@/types/database';
import CafeLogo from '@/components/CafeLogo';
import {
  PackageCheck,
  LayoutDashboard,
  TrendingUp,
  Store,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Edit2,
  Save,
  X,
  Star,
  Trash2,
  AlertTriangle,
  FolderPlus,
} from 'lucide-react';

function StockContent() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Bestsellers');
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New Item Form State
  const [newName, setNewName] = useState('');
  const [categoryChoice, setCategoryChoice] = useState<string>('');
  const [customCategory, setCustomCategory] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newIsBestseller, setNewIsBestseller] = useState(false);

  // Inline Price Edit State
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState<string>('');

  // Delete Confirmation State
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMenu = async () => {
    const { data } = await supabase.from('menu_items').select('*').order('category');
    if (data) setMenu(data as MenuItem[]);
  };

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabase.from('menu_items').select('*').order('category');
      if (active && data) setMenu(data as MenuItem[]);
    }
    void load();

    const channel = supabase
      .channel('stock-manager-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
        void fetchMenu();
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Distinct existing categories from the database
  const existingCategories = useMemo(() => {
    return Array.from(new Set(menu.map((m) => m.category)))
      .filter(Boolean)
      .sort();
  }, [menu]);

  const categories = useMemo(() => {
    return ['Bestsellers', 'All Items', ...existingCategories];
  }, [existingCategories]);

  const filteredItems = useMemo(() => {
    return menu.filter((item) => {
      let matchesCat = true;
      if (selectedCategory === 'Bestsellers') {
        matchesCat = item.is_bestseller;
      } else if (selectedCategory !== 'All Items') {
        matchesCat = item.category === selectedCategory;
      }

      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [menu, selectedCategory, searchTerm]);

  // Toggle In Stock / Sold out (86-ing)
  const handleToggleStock = async (itemId: string, current: boolean) => {
    await supabase.from('menu_items').update({ is_available: !current }).eq('id', itemId);
  };

  // Toggle Bestseller status manually
  const handleToggleBestseller = async (itemId: string, currentBestseller: boolean) => {
    await supabase
      .from('menu_items')
      .update({ is_bestseller: !currentBestseller })
      .eq('id', itemId);
  };

  // Save edited price
  const handleSavePriceEdit = async (itemId: string) => {
    const parsed = parseFloat(editPriceValue);
    if (!isNaN(parsed) && parsed > 0) {
      await supabase.from('menu_items').update({ price: parsed }).eq('id', itemId);
      setEditingItemId(null);
    }
  };

  // Delete Item Permanently
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemToDelete.id);

      if (error) {
        alert(`Could not delete item: ${error.message}`);
      } else {
        setMenu((prev) => prev.filter((i) => i.id !== itemToDelete.id));
        setItemToDelete(null);
      }
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Error: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Add New Item with Dropdown or Custom Partition
  const handleAddNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(newPrice);
    if (!newName.trim() || isNaN(priceNum) || priceNum <= 0) return;

    let finalCategory = categoryChoice || existingCategories[0] || '__NEW__';
    if (finalCategory === '__NEW__') {
      if (!customCategory.trim()) {
        alert('Please enter a name for the new category partition.');
        return;
      }
      finalCategory = customCategory.trim();
    }

    const { data: insertedItem, error } = await supabase
      .from('menu_items')
      .insert({
        name: newName.trim(),
        category: finalCategory,
        price: priceNum,
        is_available: true,
        is_bestseller: newIsBestseller,
      })
      .select()
      .single();

    if (error) {
      alert(`Failed to add item: ${error.message}`);
      return;
    }

    if (insertedItem) {
      setMenu((prev) => [...prev, insertedItem as MenuItem]);
    }

    setNewName('');
    setNewPrice('');
    setCustomCategory('');
    setNewIsBestseller(false);
    setIsAddingNew(false);
  };

  return (
    <div className="min-h-screen bg-cafe-ivory text-cafe-espresso p-4 lg:p-8 font-body">
      {/* Top Bar with Logo & All 4 Nav Tabs */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 mb-6 border-b border-cafe-warmGrey/50">
        <div>
          <h1 className="font-heading font-black text-2xl lg:text-3xl text-cafe-deepEspresso flex items-center gap-2.5">
            <CafeLogo size={36} /> Stock &amp; Menu Manager
          </h1>
          <p className="text-xs text-cafe-espresso/70 mt-1">
            Toggle 86-ed sold out items, configure Bestsellers, adjust pricing, and delete menu items
          </p>
        </div>

        {/* Global Navigation Hub: Includes Counter POS */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Link
            href="/desk"
            className="px-3.5 py-2 rounded-xl font-bold bg-white/80 border border-cafe-warmGrey hover:bg-cafe-oat text-cafe-espresso transition flex items-center gap-1.5"
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
            className="px-3.5 py-2 rounded-xl font-bold bg-cafe-espresso text-cafe-ivory shadow-sm flex items-center gap-1.5"
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

      {/* Control Strip */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        {/* Category & Bestseller Pills */}
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar">
          {categories.map((cat) => {
            const isBestsellerTab = cat === 'Bestsellers';
            const isSelected = selectedCategory === cat;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? isBestsellerTab
                      ? 'bg-amber-500 text-cafe-deepEspresso shadow'
                      : 'bg-cafe-espresso text-cafe-ivory shadow'
                    : isBestsellerTab
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-cafe-oat/60 text-cafe-espresso hover:bg-cafe-oat'
                }`}
              >
                {isBestsellerTab && <Star className="w-3.5 h-3.5 fill-current" />}
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search & Add New Item */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-cafe-warmGrey" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-cafe-warmGrey rounded-lg focus:outline-none focus:ring-1 focus:ring-cafe-clay"
            />
          </div>
          <button
            onClick={() => {
              setIsAddingNew(true);
              setCategoryChoice(existingCategories[0] || '__NEW__');
            }}
            className="px-3.5 py-2 bg-cafe-clay hover:bg-cafe-rosewood text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Item List */}
      <div className="bg-white/80 rounded-2xl border border-cafe-warmGrey shadow-sm overflow-hidden">
        <div className="divide-y divide-cafe-warmGrey/30">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition ${
                !item.is_available ? 'bg-cafe-warmGrey/10' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Stock Toggle Circle */}
                <button
                  onClick={() => handleToggleStock(item.id, item.is_available)}
                  title={item.is_available ? 'In Stock (Click to mark Sold Out)' : 'Sold Out (Click to mark In Stock)'}
                  className={`p-1.5 rounded-xl transition cursor-pointer ${
                    item.is_available
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }`}
                >
                  {item.is_available ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </button>

                {/* Bestseller Star Toggle */}
                <button
                  onClick={() => handleToggleBestseller(item.id, item.is_bestseller)}
                  title={item.is_bestseller ? 'Remove from Bestsellers' : 'Add to Bestsellers'}
                  className={`p-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                    item.is_bestseller
                      ? 'bg-amber-100 border-amber-400 text-amber-900'
                      : 'bg-cafe-ivory border-cafe-warmGrey/60 text-cafe-espresso/50 hover:text-amber-800'
                  }`}
                >
                  <Star className={`w-4 h-4 ${item.is_bestseller ? 'fill-amber-500 text-amber-600' : ''}`} />
                  <span className="hidden md:inline">{item.is_bestseller ? 'Bestseller' : 'Add Star'}</span>
                </button>

                <div>
                  <h3
                    className={`font-heading font-bold text-sm ${
                      item.is_available ? 'text-cafe-deepEspresso' : 'line-through text-cafe-espresso/50'
                    }`}
                  >
                    {item.name}
                  </h3>
                  <span className="text-[11px] text-cafe-espresso/60">{item.category}</span>
                </div>
              </div>

              {/* Price, Edit & Delete Buttons */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {editingItemId === item.id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-cafe-clay">₹</span>
                    <input
                      type="number"
                      value={editPriceValue}
                      onChange={(e) => setEditPriceValue(e.target.value)}
                      className="w-20 px-2 py-1 text-xs border border-cafe-warmGrey rounded bg-white font-bold"
                    />
                    <button
                      onClick={() => handleSavePriceEdit(item.id)}
                      className="p-1 bg-emerald-700 text-white rounded cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingItemId(null)}
                      className="p-1 bg-cafe-warmGrey/40 text-cafe-espresso rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-cafe-clay">
                      ₹{Number(item.price).toFixed(2)}
                    </span>
                    <button
                      onClick={() => {
                        setEditingItemId(item.id);
                        setEditPriceValue(item.price.toString());
                      }}
                      title="Edit Price"
                      className="p-1.5 text-cafe-espresso/60 hover:text-cafe-clay hover:bg-cafe-oat rounded-lg transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Stock Toggle Button */}
                <button
                  onClick={() => handleToggleStock(item.id, item.is_available)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    item.is_available
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }`}
                >
                  {item.is_available ? 'In Stock' : '86-ed (Sold Out)'}
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => setItemToDelete(item)}
                  title={`Delete ${item.name}`}
                  className="p-2 text-cafe-warmGrey hover:text-red-700 hover:bg-red-50 rounded-xl transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {itemToDelete !== null && (
        <div className="fixed inset-0 z-50 bg-cafe-midnightNavy/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cafe-ivory border border-cafe-warmGrey w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 text-red-700 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-cafe-deepEspresso">
                  Delete Item?
                </h3>
                <p className="text-xs text-cafe-espresso/70">
                  This cannot be undone.
                </p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-cafe-warmGrey/50 text-xs space-y-1">
              <p className="font-bold text-cafe-deepEspresso text-sm">{itemToDelete.name}</p>
              <p className="text-cafe-espresso/60">{itemToDelete.category}</p>
              <p className="font-mono font-bold text-cafe-clay">₹{Number(itemToDelete.price).toFixed(2)}</p>
            </div>

            <p className="text-[11px] text-cafe-espresso/70">
              Are you sure you want to remove <strong>{itemToDelete.name}</strong> from the Lara’s Cafe menu permanently?
            </p>

            <div className="flex gap-2 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setItemToDelete(null)}
                className="w-1/2 py-2.5 bg-white border border-cafe-warmGrey rounded-xl text-xs font-semibold text-cafe-espresso hover:bg-cafe-oat transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="w-1/2 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Item Modal */}
      {isAddingNew && (
        <div className="fixed inset-0 z-50 bg-cafe-midnightNavy/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cafe-ivory border border-cafe-warmGrey w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h2 className="font-heading font-black text-xl text-cafe-deepEspresso mb-4">
              Add New Cafe Item
            </h2>
            <form onSubmit={handleAddNewItem} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-cafe-espresso/70 block mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Masala Chai"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-cafe-warmGrey rounded-xl text-xs outline-none focus:ring-1 focus:ring-cafe-clay"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-cafe-espresso/70 block mb-1">
                  Category Partition
                </label>
                <select
                  value={categoryChoice}
                  onChange={(e) => setCategoryChoice(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-cafe-warmGrey rounded-xl text-xs font-medium text-cafe-deepEspresso outline-none focus:ring-1 focus:ring-cafe-clay cursor-pointer"
                >
                  <optgroup label="Existing Categories">
                    {existingCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="New Partition">
                    <option value="__NEW__">+ Create New Category...</option>
                  </optgroup>
                </select>

                {categoryChoice === '__NEW__' && (
                  <div className="mt-2.5 p-3 bg-cafe-oat/40 border border-cafe-warmGrey/60 rounded-xl space-y-1">
                    <label className="text-[11px] font-bold text-cafe-clay flex items-center gap-1">
                      <FolderPlus className="w-3.5 h-3.5" /> New Category Name
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. Desserts, Sandwiches..."
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-cafe-clay rounded-lg text-xs outline-none focus:ring-1 focus:ring-cafe-clay"
                    />
                    <p className="text-[10px] text-cafe-espresso/60">
                      This will create a new partition tab on the customer menu.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-cafe-espresso/70 block mb-1">
                  Price (incl. GST)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-cafe-clay">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="50.00"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-cafe-warmGrey rounded-xl text-xs outline-none focus:ring-1 focus:ring-cafe-clay font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="bestsellerCheck"
                  checked={newIsBestseller}
                  onChange={(e) => setNewIsBestseller(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <label htmlFor="bestsellerCheck" className="text-xs font-bold text-cafe-espresso flex items-center gap-1 cursor-pointer">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Mark as Bestseller immediately
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="w-1/2 py-2.5 border border-cafe-warmGrey rounded-xl text-xs font-semibold text-cafe-espresso hover:bg-cafe-oat transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-cafe-clay hover:bg-cafe-rosewood text-white rounded-xl text-xs font-bold transition shadow cursor-pointer"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StockPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Loading Stock Console...</div>}>
      <StockContent />
    </Suspense>
  );
}