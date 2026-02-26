'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const reviews = [
  {
    id: 1,
    name: 'María González',
    rating: 5,
    comment: 'El chat inteligente es increíble! Pude personalizar mi hamburguesa exactamente como quería.',
    image: 'https://i.pravatar.cc/150?img=1',
    date: '2 días atrás',
  },
  {
    id: 2,
    name: 'Carlos Rodríguez',
    rating: 5,
    comment: 'Las recomendaciones del asistente fueron perfectas. La mejor hamburguesa que he probado!',
    image: 'https://i.pravatar.cc/150?img=3',
    date: '1 semana atrás',
  },
  {
    id: 3,
    name: 'Ana Martínez',
    rating: 5,
    comment: 'Rápido, fácil y delicioso. El sistema de pedidos es muy intuitivo.',
    image: 'https://i.pravatar.cc/150?img=5',
    date: '3 días atrás',
  },
];

export default function ReviewsSection() {
  return (
    <section className="py-20 bg-zinc-950">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Lo que dicen nuestros <span className="gradient-text">clientes</span>
          </h2>
          <p className="text-gray-400 text-lg">
            Miles de clientes satisfechos cada día
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-red-600 transition-colors duration-300"
            >
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={review.image}
                  alt={review.name}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <h4 className="font-semibold text-white">{review.name}</h4>
                  <p className="text-sm text-gray-500">{review.date}</p>
                </div>
              </div>

              <div className="flex gap-1 mb-3">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-red-600 text-red-600" />
                ))}
              </div>

              <p className="text-gray-300">
                "{review.comment}"
              </p>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
        >
          <div>
            <div className="text-4xl font-bold text-red-600 mb-2">10k+</div>
            <div className="text-gray-400">Clientes Felices</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-red-600 mb-2">4.9</div>
            <div className="text-gray-400">Calificación Promedio</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-red-600 mb-2">50k+</div>
            <div className="text-gray-400">Pedidos Entregados</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-red-600 mb-2">98%</div>
            <div className="text-gray-400">Satisfacción</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
