'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Circle, AlertCircle, Zap, Target, TrendingUp, Rocket, Brain, Globe } from 'lucide-react';
import Link from 'next/link';

const slides = [
  {
    id: 1,
    title: "¿Te suena familiar?",
    icon: AlertCircle,
    content: {
      type: "problem",
      questions: [
        "¿Cuántos de aquí han pedido algo en un restaurante… y después de 15 minutos les dicen que ya no hay?",
        "¿Cuántos han pedido sin cebolla… y les llega con cebolla?"
      ],
      problems: [
        { emoji: "❌", text: '"Ya no hay"' },
        { emoji: "❌", text: "Pedido incorrecto" },
        { emoji: "❌", text: "Horas pico caóticas" }
      ]
    }
  },
  {
    id: 2,
    title: "El Problema Real",
    icon: Brain,
    content: {
      type: "transition",
      text: "Y el problema no es la comida.",
      highlight: "El problema es que el restaurante no tiene un sistema inteligente que conecte al cliente con la operación en tiempo real.",
      subtext: "Ahí es donde entramos nosotros."
    }
  },
  {
    id: 3,
    title: "SmartServe AI",
    subtitle: "El cerebro digital del restaurante",
    icon: Zap,
    content: {
      type: "solution",
      statements: [
        "No es un chatbot que responde.",
        "Es un sistema autónomo que ejecuta acciones reales dentro del negocio."
      ],
      flow: [
        { step: "1", text: "El cliente habla" },
        { step: "2", text: "La IA interpreta" },
        { step: "3", text: "El sistema valida stock" },
        { step: "4", text: "Se actualiza inventario" },
        { step: "5", text: "Se envía orden a cocina" },
        { step: "6", text: "Se registran datos para administración" }
      ],
      conclusion: "Todo conectado."
    }
  },
  {
    id: 4,
    title: "¿Cómo Funciona?",
    subtitle: "Una experiencia fluida de principio a fin",
    icon: Target,
    content: {
      type: "workflow",
      example: {
        cliente: "Quiero hamburguesa doble carne sin cebolla y con salsa roja.",
        sistema: [
          "✓ Verifica ingredientes disponibles",
          "✓ Personaliza automáticamente",
          "✓ Calcula precio",
          "✓ Estima tiempo",
          "✓ Confirma pedido"
        ],
        resultado: [
          "Se descuenta stock",
          "Cocina recibe orden estructurada",
          "Administración registra venta",
          "Se actualizan métricas"
        ]
      },
      benefits: [
        "No hay pasos manuales",
        "No hay interpretación humana",
        'No hay "ya no hay"'
      ]
    }
  },
  {
    id: 5,
    title: "Impacto Doble",
    subtitle: "Beneficios para todos",
    icon: TrendingUp,
    content: {
      type: "impact",
      cliente: [
        { icon: "✔", text: "No hay sorpresas" },
        { icon: "✔", text: "No hay errores" },
        { icon: "✔", text: "No hay tiempos muertos" },
        { icon: "✔", text: "Experiencia moderna" }
      ],
      restaurante: [
        { icon: "✔", text: "Control total del inventario" },
        { icon: "✔", text: "Menos desperdicio" },
        { icon: "✔", text: "Menos devoluciones" },
        { icon: "✔", text: "Datos en tiempo real" },
        { icon: "✔", text: "Predicción de demanda" }
      ],
      conclusion: "No es solo UX… es eficiencia operativa."
    }
  },
  {
    id: 6,
    title: "Nuestra Diferencia",
    icon: Zap,
    content: {
      type: "differentiation",
      others: "La mayoría de restaurantes digitalizan el menú.",
      us: "Nosotros digitalizamos el cerebro del restaurante.",
      statement: "No es un sistema de pedidos. Es un sistema de toma de decisiones en tiempo real."
    }
  },
  {
    id: 7,
    title: "Escalabilidad",
    subtitle: "Más allá de las hamburguesas",
    icon: Globe,
    content: {
      type: "scalability",
      today: "Hoy: restaurante de hamburguesas.",
      tomorrow: "Mañana:",
      markets: [
        "Cadenas de comida rápida",
        "Cafeterías",
        "Supermercados",
        "Tiendas de ropa",
        "E-commerce"
      ],
      criteria: {
        title: "Cualquier negocio con:",
        items: ["Catálogo", "Inventario", "Procesos internos"]
      },
      vision: "Puede convertirse en un negocio autónomo inteligente."
    }
  },
  {
    id: 8,
    title: "El Futuro es Ahora",
    icon: Rocket,
    content: {
      type: "closing",
      statements: [
        "Los restaurantes hoy trabajan con procesos del pasado.",
        "Nosotros proponemos algo distinto:",
        "Un sistema donde la inteligencia artificial no solo conversa… sino que opera el negocio."
      ],
      final: "No estamos creando un chatbot. Estamos creando el cerebro digital que conecta clientes, cocina y administración en tiempo real."
    }
  }
];

export default function PresentacionPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const nextSlide = () => {
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setDirection(-1);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black text-white overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-red-600 rounded-full blur-3xl opacity-20 -top-20 -left-20 animate-pulse" />
        <div className="absolute w-96 h-96 bg-red-800 rounded-full blur-3xl opacity-20 -bottom-20 -right-20 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <header className="relative z-20 p-6 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold gradient-text">
          SmartServe AI
        </Link>
        <div className="text-sm text-gray-400">
          {currentSlide + 1} / {slides.length}
        </div>
      </header>

      {/* Main slide container */}
      <div className="relative z-10 container mx-auto px-4 py-8" style={{ height: 'calc(100vh - 180px)' }}>
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            className="h-full flex flex-col items-center justify-center"
          >
            {/* Slide content */}
            <div className="max-w-5xl w-full">
              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-12"
              >
                <div className="inline-flex items-center gap-3 mb-4">
                  <Icon className="w-12 h-12 text-red-500" />
                </div>
                <h1 className="text-5xl md:text-7xl font-bold mb-4">
                  {slide.title}
                </h1>
                {slide.subtitle && (
                  <p className="text-xl text-gray-400">{slide.subtitle}</p>
                )}
              </motion.div>

              {/* Dynamic content based on slide type */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {renderSlideContent(slide.content)}
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Arrow buttons - Fixed sides */}
      <button
        onClick={prevSlide}
        className="fixed left-4 top-1/2 -translate-y-1/2 z-30 p-4 rounded-full bg-zinc-800/80 hover:bg-zinc-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-sm hover:scale-110"
        disabled={currentSlide === 0}
      >
        <ChevronLeft className="w-8 h-8" />
      </button>
      
      <button
        onClick={nextSlide}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-30 p-4 rounded-full bg-red-600/80 hover:bg-red-700 transition-all backdrop-blur-sm hover:scale-110"
      >
        <ChevronRight className="w-8 h-8" />
      </button>

      {/* Navigation */}
      <div className="relative z-20 pb-8">
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 ${
                index === currentSlide
                  ? 'w-8 h-3 bg-red-600'
                  : 'w-3 h-3 bg-gray-600 hover:bg-gray-500'
              } rounded-full`}
            />
          ))}
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Usa las flechas del teclado, los botones laterales o haz clic en los indicadores
        </p>
      </div>
    </div>
  );
}

function renderSlideContent(content: any) {
  switch (content.type) {
    case 'problem':
      return (
        <div className="space-y-8">
          {/* Questions */}
          <div className="space-y-6">
            {content.questions.map((q: string, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.2 }}
                className="text-2xl md:text-3xl text-gray-300 italic border-l-4 border-red-600 pl-6"
              >
                {q}
              </motion.div>
            ))}
          </div>

          {/* Problems */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9 }}
            className="grid md:grid-cols-3 gap-6 pt-8"
          >
            {content.problems.map((p: any, i: number) => (
              <div
                key={i}
                className="bg-zinc-900/50 border border-red-900 rounded-xl p-6 text-center hover:scale-105 transition-transform"
              >
                <div className="text-4xl mb-3">{p.emoji}</div>
                <div className="text-xl font-semibold text-red-400">{p.text}</div>
              </div>
            ))}
          </motion.div>
        </div>
      );

    case 'transition':
      return (
        <div className="text-center space-y-8">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-3xl text-gray-400"
          >
            {content.text}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
            className="text-4xl md:text-5xl font-bold gradient-text leading-relaxed"
          >
            {content.highlight}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="text-2xl text-red-500 font-semibold"
          >
            {content.subtext}
          </motion.p>
        </div>
      );

    case 'solution':
      return (
        <div className="space-y-8">
          {/* Statements */}
          <div className="space-y-4 text-center">
            {content.statements.map((s: string, i: number) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.2 }}
                className="text-2xl md:text-3xl text-gray-300"
              >
                {s}
              </motion.p>
            ))}
          </div>

          {/* Flow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="grid md:grid-cols-3 gap-4 pt-6"
          >
            {content.flow.map((item: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 + i * 0.1 }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-red-600 transition-colors"
              >
                <div className="text-red-500 font-bold text-lg mb-2">{item.step}</div>
                <div className="text-white">{item.text}</div>
              </motion.div>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6 }}
            className="text-3xl font-bold text-center gradient-text pt-4"
          >
            {content.conclusion}
          </motion.p>
        </div>
      );

    case 'workflow':
      return (
        <div className="space-y-8">
          {/* Example */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8">
            <div className="text-red-500 font-semibold mb-3">Cliente dice:</div>
            <div className="text-2xl text-white italic mb-6">"{content.example.cliente}"</div>

            <div className="space-y-6">
              <div>
                <div className="text-orange-500 font-semibold mb-3">El sistema:</div>
                <div className="grid md:grid-cols-2 gap-3">
                  {content.example.sistema.map((item: string, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + i * 0.1 }}
                      className="flex items-center gap-2 text-gray-300"
                    >
                      <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-xs">✓</div>
                      {item.replace('✓ ', '')}
                    </motion.div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-green-500 font-semibold mb-3">Al confirmar:</div>
                <div className="space-y-2">
                  {content.example.resultado.map((item: string, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 + i * 0.1 }}
                      className="flex items-center gap-2 text-gray-300"
                    >
                      <div className="w-2 h-2 rounded-full bg-red-600" />
                      {item}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="grid md:grid-cols-3 gap-4">
            {content.benefits.map((b: string, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.6 + i * 0.1 }}
                className="bg-red-900/20 border border-red-600 rounded-xl p-4 text-center text-white font-semibold"
              >
                {b}
              </motion.div>
            ))}
          </div>
        </div>
      );

    case 'impact':
      return (
        <div className="grid md:grid-cols-2 gap-8">
          {/* Cliente */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-blue-900/20 border border-blue-700 rounded-xl p-8"
          >
            <h3 className="text-2xl font-bold mb-6 text-blue-400">Para el Cliente</h3>
            <div className="space-y-4">
              {content.cliente.map((item: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  className="flex items-start gap-3 text-lg"
                >
                  <span className="text-green-400 text-xl">{item.icon}</span>
                  <span className="text-gray-200">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Restaurante */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-orange-900/20 border border-orange-700 rounded-xl p-8"
          >
            <h3 className="text-2xl font-bold mb-6 text-orange-400">Para el Restaurante</h3>
            <div className="space-y-4">
              {content.restaurante.map((item: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  className="flex items-start gap-3 text-lg"
                >
                  <span className="text-green-400 text-xl">{item.icon}</span>
                  <span className="text-gray-200">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Conclusion */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            className="md:col-span-2 text-center pt-6"
          >
            <p className="text-3xl font-bold gradient-text">{content.conclusion}</p>
          </motion.div>
        </div>
      );

    case 'differentiation':
      return (
        <div className="space-y-12 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-6"
          >
            <div className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-8">
              <div className="text-gray-500 text-xl mb-2">Ellos:</div>
              <p className="text-2xl text-gray-400">{content.others}</p>
            </div>

            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8, type: "spring" }}
              className="bg-gradient-to-r from-red-900/50 to-orange-900/50 border border-red-600 rounded-xl p-8"
            >
              <div className="text-red-400 text-xl mb-2 font-semibold">Nosotros:</div>
              <p className="text-3xl font-bold text-white">{content.us}</p>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="pt-8"
          >
            <p className="text-4xl font-bold gradient-text leading-relaxed">
              {content.statement}
            </p>
          </motion.div>
        </div>
      );

    case 'scalability':
      return (
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-2xl text-gray-400"
            >
              {content.today}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-3xl font-bold text-red-500"
            >
              {content.tomorrow}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="grid md:grid-cols-3 gap-4"
          >
            {content.markets.map((market: string, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.0 + i * 0.1 }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center hover:border-red-600 transition-all hover:scale-105"
              >
                <div className="text-xl text-white">{market}</div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6 }}
            className="bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-red-700 rounded-xl p-8 text-center"
          >
            <h3 className="text-2xl font-bold mb-4 text-red-400">{content.criteria.title}</h3>
            <div className="flex justify-center gap-8 mb-6">
              {content.criteria.items.map((item: string, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.8 + i * 0.1 }}
                  className="text-xl text-white font-semibold"
                >
                  • {item}
                </motion.div>
              ))}
            </div>
            <p className="text-2xl text-gray-200 italic">{content.vision}</p>
          </motion.div>
        </div>
      );

    case 'closing':
      return (
        <div className="space-y-12 text-center">
          <div className="space-y-6">
            {content.statements.map((statement: string, i: number) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.3 }}
                className="text-2xl md:text-3xl text-gray-300"
              >
                {statement}
              </motion.p>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5, type: "spring" }}
            className="bg-gradient-to-r from-red-900/50 to-orange-900/50 border-2 border-red-600 rounded-2xl p-12"
          >
            <p className="text-4xl md:text-5xl font-bold gradient-text leading-relaxed">
              {content.final}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.0 }}
            className="pt-8"
          >
            <Link href="/" className="btn-primary inline-block text-xl px-8 py-4">
              Experimenta SmartServe AI
            </Link>
          </motion.div>
        </div>
      );

    default:
      return null;
  }
}
