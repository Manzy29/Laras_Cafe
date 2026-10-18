'use client';
import { OrderItemPayload } from '@/types/database';
import { ShoppingBag, X } from 'lucide-react';

interface CartDrawerProps {
  cart: OrderItemPayload[];
  onRemove: (index: number) => void;
  onCheckout: () => void;
  isLoading: boolean;
}

export default function CartDrawer({ cart, onRemove, onCheckout, isLoading }: CartDrawerProps) {
  const total = cart.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);

  if (cart.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 z-40">
      <div className="bg-cafe-slateNavy text-cafe-ivory rounded-2xl shadow-2xl p-4 border border-cafe-warmGrey/40 backdrop-blur-md">
        <div className="flex justify-between items-center pb-2 border-b border-cafe-warmGrey/20 mb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-cafe-oat" />
            <span className="font-heading font-semibold">{cart.length} items to order</span>
          </div>
          <span className="text-base font-bold text-cafe-oat">₹{total.toFixed(2)}</span>
        </div>

        <div className="max-h-32 overflow-y-auto space-y-2 mb-3 pr-1 text-xs">
          {cart.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start">
              <div>
                <span className="font-medium">{item.item_name}</span>
                {item.notes && (
                  <p className="text-[10px] text-cafe-oat/70 italic">&quot;{item.notes}&quot;</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                <button onClick={() => onRemove(idx)} className="text-red-400 hover:text-red-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onCheckout}
          disabled={isLoading}
          className="w-full py-3 bg-cafe-clay hover:bg-cafe-rosewood text-white font-medium rounded-xl transition duration-150 shadow-md text-sm disabled:opacity-50"
        >
          {isLoading ? 'Sending to Kitchen...' : 'Send Order to Kitchen'}
        </button>
      </div>
    </div>
  );
}