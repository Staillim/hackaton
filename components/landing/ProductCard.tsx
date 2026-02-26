'use client';

import { motion } from 'framer-motion';
import { Product } from '@/types';
import { ShoppingCart, Plus, Flame } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
  index: number;
}

export default function ProductCard({ product, index }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    addItem(product);
    toast.success(`${product.name} agregado al carrito`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="group relative bg-gradient-to-br from-zinc-900 to-black rounded-2xl overflow-hidden border border-zinc-800 hover:border-red-600 transition-all duration-300 card-hover"
    >
      {/* Featured badge */}
      {product.featured && (
        <div className="absolute top-4 right-4 z-10 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
          <Flame className="w-3 h-3" />
          Popular
        </div>
      )}

      {/* Image */}
      <div className="relative h-56 overflow-hidden bg-zinc-800">
        <img
          src={product.image_url || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-xl font-bold text-white group-hover:text-red-600 transition-colors">
              {product.name}
            </h3>
            {product.category && (
              <p className="text-sm text-gray-400 mt-1">
                {product.category.icon} {product.category.name}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-red-600">
              ${product.base_price.toFixed(2)}
            </div>
            {product.calories && (
              <div className="text-xs text-gray-500">{product.calories} cal</div>
            )}
          </div>
        </div>

        <p className="text-gray-400 text-sm mb-4 line-clamp-2">
          {product.description}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleAddToCart}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 group"
          >
            <ShoppingCart className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Agregar
          </button>
          <button
            className="bg-zinc-800 hover:bg-zinc-700 text-white p-3 rounded-lg transition-all duration-300"
            title="Personalizar"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Extra info */}
        <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between text-xs text-gray-500">
          <span>⏱️ {product.preparation_time} min</span>
          <span className="text-green-500">✓ Disponible</span>
        </div>
      </div>

      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-transparent" />
      </div>
    </motion.div>
  );
}
