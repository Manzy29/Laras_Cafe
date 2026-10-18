'use client';
import { OrderWithItems } from '@/types/database';
import { CheckSquare, Square, Check, Clock } from 'lucide-react';

interface OrderTicketsProps {
  orders: OrderWithItems[];
  onToggleItemServed: (itemId: string, currentStatus: boolean) => void;
  onUpdateOrderStatus: (orderId: string, status: string) => void;
}

export default function OrderTickets({
  orders,
  onToggleItemServed,
  onUpdateOrderStatus,
}: OrderTicketsProps) {
  if (orders.length === 0) {
    return <div className="text-center py-12 text-cafe-warmGrey text-sm">No incoming orders.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {orders.map((order) => (
        <div
          key={order.id}
          className="bg-white rounded-xl border border-cafe-warmGrey shadow-sm p-4 flex flex-col justify-between"
        >
          <div>
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-cafe-warmGrey/30 mb-3">
              <span className="font-heading font-black text-cafe-deepEspresso text-base">
                {order.order_type === 'TABLE' ? `Table ${order.table_number}` : `Token #${order.token_number}`}
              </span>
              <span className="text-xs font-mono font-bold text-cafe-clay">
                ₹{Number(order.total_amount).toFixed(2)}
              </span>
            </div>

            {/* Customer summary */}
            <div className="text-[11px] text-cafe-espresso/70 mb-3 flex justify-between">
              <span>{order.customer_name}</span>
              <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            {/* Incremental Item Checkboxes */}
            <div className="space-y-2 mb-4">
              {order.order_items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onToggleItemServed(item.id, item.is_served)}
                  className="flex items-start gap-2 text-xs p-1.5 rounded hover:bg-cafe-ivory cursor-pointer select-none transition"
                >
                  {item.is_served ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-cafe-warmGrey mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <span className={item.is_served ? 'line-through text-cafe-espresso/40' : 'font-semibold text-cafe-espresso'}>
                      {item.quantity}x {item.item_name}
                    </span>
                    {item.notes && (
                      <p className="text-[10px] text-cafe-clay font-medium italic mt-0.5">
                        Note: &quot;{item.notes}&quot;
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Status Controller */}
          <div className="pt-3 border-t border-cafe-warmGrey/20 flex gap-2">
            {order.status === 'RECEIVED' && (
              <button
                onClick={() => onUpdateOrderStatus(order.id, 'PREPARING')}
                className="w-full py-1.5 bg-cafe-navy hover:bg-cafe-midnightNavy text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
              >
                <Clock className="w-3.5 h-3.5" /> Start Preparing
              </button>
            )}
            {order.status === 'PREPARING' && (
              <button
                onClick={() => onUpdateOrderStatus(order.id, 'READY')}
                className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Mark Ready
              </button>
            )}
            {order.status === 'READY' && (
              <button
                onClick={() => onUpdateOrderStatus(order.id, 'COMPLETED')}
                className="w-full py-1.5 bg-cafe-clay hover:bg-cafe-rosewood text-white rounded-lg text-xs font-semibold"
              >
                Complete & Archive
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}