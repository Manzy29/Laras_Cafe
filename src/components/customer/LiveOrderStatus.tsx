'use client';
import { OrderWithItems } from '@/types/database';
import { Clock, ChefHat, CheckCircle2 } from 'lucide-react';

interface LiveOrderStatusProps {
  orders: OrderWithItems[];
}

export default function LiveOrderStatus({ orders }: LiveOrderStatusProps) {
  if (!orders || orders.length === 0) return null;

  return (
    <div className="mt-6 mb-8 space-y-3">
      <h3 className="font-heading text-sm font-semibold text-cafe-deepEspresso uppercase tracking-wider">
        Active Orders on This Tab
      </h3>

      {orders.map((order) => {
        const isReady = order.status === 'READY';
        const isPreparing = order.status === 'PREPARING';

        return (
          <div
            key={order.id}
            className={`p-4 rounded-xl border transition-all ${
              isReady
                ? 'bg-emerald-50 border-emerald-300'
                : 'bg-cafe-oat/40 border-cafe-warmGrey/60'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                {isReady ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-pulse" />
                ) : isPreparing ? (
                  <ChefHat className="w-4 h-4 text-amber-600 animate-bounce" />
                ) : (
                  <Clock className="w-4 h-4 text-cafe-navy" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider text-cafe-espresso">
                  {order.status}
                </span>
              </div>
              <span className="text-xs font-semibold text-cafe-clay">
                ₹{Number(order.total_amount).toFixed(2)}
              </span>
            </div>

            {/* Check off individual items status visual for customer */}
            <div className="text-xs space-y-1 mt-2 border-t border-black/5 pt-2">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex justify-between text-cafe-espresso/80">
                  <span className={item.is_served ? 'line-through text-cafe-espresso/40' : ''}>
                    {item.quantity}x {item.item_name}
                  </span>
                  <span className="text-[10px] font-medium">
                    {item.is_served ? 'Served ✓' : 'Preparing'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}