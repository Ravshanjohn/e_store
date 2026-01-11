import { useRef } from "react";
import { Minus, Plus, Trash } from "lucide-react";
import { useCartStore } from "../stores/useCartStore";

const CartItem = ({ item }) => {
  const { removeFromCart, updateQuantity } = useCartStore();
  const holdInterval = useRef(null);

  const handleMouseDown = (id, type) => {
    updateQuantity(id, type);

    
    holdInterval.current = setInterval(() => {
      updateQuantity(id, type);
    }, 150);
  };

  const handleMouseUp = () => {
    clearInterval(holdInterval.current);
  };

  return (
    <div className="rounded-lg border p-4 shadow-sm border-gray-700 bg-gray-800 md:p-6">
      <div className="space-y-4 md:flex md:items-center md:justify-between md:gap-6 md:space-y-0">
        {/* Product Image */}
        <div className="shrink-0 md:order-1">
          <img
            className="h-20 md:h-32 rounded object-cover"
            src={item.image_url}
            alt={item.name}
          />
        </div>

        {/* Product Info */}
        <div className="w-full min-w-0 flex-1 space-y-4 md:order-2 md:max-w-md">
          <p className="text-base font-medium text-white hover:text-emerald-400 hover:underline">
            {item.name}
          </p>
          <p className="text-sm text-gray-400">{item.description}</p>

          <div className="flex items-center gap-4">
            <button
              className="inline-flex items-center text-sm font-medium text-red-400 hover:text-red-300 hover:underline"
              onClick={() => removeFromCart(item.id)}
            >
              <Trash />
            </button>
          </div>
        </div>

        {/* Quantity and Price */}
        <div className="flex items-center justify-between md:order-3 md:justify-end">
          <div className="flex items-center gap-2">
            {/* Minus Button */}
            <button
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-gray-600 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              onMouseDown={() => handleMouseDown(item.id, "minus")}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={() => handleMouseDown(item.id, "minus")}
              onTouchEnd={handleMouseUp}
            >
              <Minus className="text-gray-300" />
            </button>

            <p>{item.quantity}</p>

            {/* Plus Button */}
            <button
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-gray-600 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              onMouseDown={() => handleMouseDown(item.id, "plus")}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={() => handleMouseDown(item.id, "plus")}
              onTouchEnd={handleMouseUp}
            >
              <Plus className="text-gray-300" />
            </button>
          </div>

          <div className="text-end md:order-4 md:w-32">
            <p className="text-base font-bold text-emerald-400">
              ${item.sale_price}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
