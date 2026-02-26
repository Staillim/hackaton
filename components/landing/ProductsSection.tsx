'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Product } from '@/types';
import { getProducts } from '@/lib/supabase';
import ProductCard from './ProductCard';
import { Loader2 } from 'lucide-react';

export default function ProductsSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', name: 'Todos', icon: '🍔' },
    { id: 'hamburguesas', name: 'Hamburguesas', icon: '🍔' },
    { id: 'combos', name: 'Combos', icon: '🎁' },
    { id: 'bebidas', name: 'Bebidas', icon: '🥤' },
    { id: 'acompañamientos', name: 'Acompañamientos', icon: '🍟' },
  ];

  const filteredProducts = activeCategory === 'all'
    ? products
    : products.filter(p => p.category?.name.toLowerCase() === activeCategory);

  return (
    <section id="products" className="py-20 bg-black">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Nuestro <span className="gradient-text">Menú</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Descubre nuestra selección de hamburguesas artesanales y combos especiales
          </p>
        </motion.div>

        {/* Category filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-4 mb-12"
        >
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                activeCategory === category.id
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/50'
                  : 'bg-zinc-900 text-gray-400 hover:bg-zinc-800'
              }`}
            >
              <span className="mr-2">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </motion.div>

        {/* Products grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-red-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        )}

        {!loading && filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No hay productos disponibles en esta categoría</p>
          </div>
        )}

        {/* Featured section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 bg-gradient-to-r from-red-900/20 to-transparent border border-red-600/30 rounded-2xl p-8 md:p-12"
        >
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-3xl font-bold mb-4">
                ¿No encuentras lo que buscas?
              </h3>
              <p className="text-gray-300 mb-6">
                Habla con nuestro asistente inteligente y personaliza tu pedido exactamente como te gusta.
                ¡Podemos hacer cualquier combinación!
              </p>
              <button className="btn-primary">
                Hablar con el Asistente
              </button>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600"
                alt="Custom burger"
                className="rounded-xl shadow-2xl"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
