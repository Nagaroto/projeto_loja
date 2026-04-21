import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import cereonImg from '../imgs/cereon.webp';

export function Hero() {
  const { isDark } = useTheme();
  return (
    <section className={`relative text-white py-20 overflow-hidden ${
      isDark 
        ? 'bg-gradient-to-br from-slate-950 via-emerald-950/40 to-slate-950' 
        : 'bg-gradient-to-r from-cereon-green via-emerald-400 to-green-400'
    }`}>
      {/* Background decorativo com gradientes suaves */}
      <div className="absolute inset-0 opacity-40">
        <div className={`absolute top-20 -left-32 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl animate-blob ${
          isDark ? 'bg-emerald-600/20' : 'bg-emerald-300/40'
        }`} />
        <div className={`absolute top-40 -right-32 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000 ${
          isDark ? 'bg-emerald-700/20' : 'bg-cyan-200/40'
        }`} />
        <div className={`absolute -bottom-8 left-20 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000 ${
          isDark ? 'bg-emerald-600/15' : 'bg-teal-200/40'
        }`} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Texto */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-5xl md:text-6xl font-bold leading-tight"
            >
              Bem-vindo à <br />
              <span className="text-white drop-shadow-lg">Cereon</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-xl md:text-2xl text-white/90 leading-relaxed"
            >
              Descubra a Moda que Define Seu Estilo
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="text-lg text-white/80"
            >
              Qualidade premium, design exclusivo e sustentabilidade em cada peça.
            </motion.p>

            {/* Botão CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Link
                  to="/catalogo"
                  className={`group relative inline-flex items-center space-x-2 px-8 py-4 rounded-lg font-bold text-lg shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden ${
                    isDark
                      ? 'bg-gradient-to-r from-emerald-700/40 to-emerald-600/40 text-emerald-100 hover:from-emerald-700/50 hover:to-emerald-600/50 border border-emerald-600/50'
                      : 'bg-white text-cereon-green hover:bg-gray-100'
                  }`}
                >
                  {/* Efeito de fundo animado */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                    isDark
                      ? 'bg-gradient-to-r from-emerald-600/20 via-emerald-500/20 to-emerald-600/20'
                      : 'bg-gradient-to-r from-white via-gray-50 to-white'
                  }`} />
                  
                  {/* Underline animado */}
                  <div className={`absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-500 ${
                    isDark
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-300'
                      : 'bg-gradient-to-r from-cereon-green to-green-400'
                  }`} />
                  
                  <span className={`relative z-10 transition-colors duration-300 ${
                    isDark ? '' : 'group-hover:text-cereon-green'
                  }`}>Ver Catálogo</span>
                  <motion.div
                    animate={{ x: [0, 3, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="relative z-10"
                  >
                    <ArrowRight size={20} />
                  </motion.div>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Imagem */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden md:flex items-center justify-center"
          >
            <div className="relative w-full aspect-square max-w-md">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl"
              >
                <img
                  src={cereonImg}
                  alt="Cereon"
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Wave decorativo */}
      <div className={`absolute bottom-0 left-0 right-0 h-20 ${
        isDark ? 'bg-dark-bg' : 'bg-white'
      }`} style={{
        clipPath: 'polygon(0 20%, 100% 0, 100% 100%, 0 100%)'
      }} />
    </section>
  );
}
