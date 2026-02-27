'use client';

import { motion } from 'framer-motion';
import { Flame, Sparkles } from 'lucide-react';

export default function Hero() {
  const scrollToProducts = () => {
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  const openChat = () => {
    // This will be handled by the ChatWidget component
    const event = new CustomEvent('openChat');
    window.dispatchEvent(event);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-black via-red-950 to-black">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-red-600 rounded-full blur-3xl opacity-20 -top-20 -left-20 animate-pulse" />
        <div className="absolute w-96 h-96 bg-red-800 rounded-full blur-3xl opacity-20 -bottom-20 -right-20 animate-pulse delay-1000" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left side - Text content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center md:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-red-600/20 border border-red-600 rounded-full px-4 py-2 mb-6"
            >
              <Sparkles className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-500">Sistema Inteligente con IA</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
            >
              Ordena <span className="gradient-text">Inteligente.</span>
              <br />
              Come <span className="gradient-text">Mejor.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="text-xl text-gray-300 mb-8 max-w-lg"
            >
              Personaliza tu hamburguesa perfecta con nuestro asistente inteligente.
              Recibe recomendaciones y ofertas exclusivas.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start"
            >
              <button
                onClick={scrollToProducts}
                className="btn-primary group"
              >
                <span className="flex items-center gap-2">
                  <Flame className="w-5 h-5 group-hover:animate-bounce" />
                  Ordenar Ahora
                </span>
              </button>
              <button
                onClick={openChat}
                className="btn-secondary"
              >
                Hablar con Asistente IA
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="mt-12 grid grid-cols-3 gap-8"
            >
              <div>
                <div className="text-3xl font-bold text-red-600">500+</div>
                <div className="text-sm text-gray-400">Pedidos Diarios</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-600">4.9</div>
                <div className="text-sm text-gray-400">Calificación</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-600">15min</div>
                <div className="text-sm text-gray-400">Tiempo Promedio</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right side - Hero image */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10"
            >
              <img
                src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80"
                alt="SmartBurger"
                className="w-full h-auto rounded-2xl shadow-2xl shadow-red-600/50"
              />
            </motion.div>

            {/* Floating elements */}
            <motion.div
              animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-4 -right-8 z-20 bg-red-600 text-white px-6 py-3 rounded-full font-bold shadow-lg"
            >
              20% OFF
            </motion.div>

            <motion.div
              animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-8 -left-8 z-20 glass px-6 py-3 rounded-xl font-semibold"
            >
              🔥 Más Vendido
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 border-2 border-red-600 rounded-full flex justify-center pt-2"
        >
          <div className="w-1 h-2 bg-red-600 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}
