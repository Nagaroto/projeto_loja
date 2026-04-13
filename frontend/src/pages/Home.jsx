import React from 'react';
import { Hero } from '../components/Hero';
import { WhyChoose } from '../components/WhyChoose';
import { ProductCard } from '../components/ProductCard';
import { mockProducts } from '../data/mockProducts';
import { motion } from 'framer-motion';

export function Home() {
  // Mostrar apenas 6 produtos na home
  const featuredProducts = mockProducts.slice(0, 6);

  return (
    <div>
      <Hero />
      <WhyChoose />

      {/* Featured Products */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Título */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-cereon-dark mb-4">
              Produtos em Destaque
            </h2>
            <p className="text-lg text-gray-600">
              Confira nossas melhores peças desta coleção
            </p>
          </motion.div>

          {/* Grid de Produtos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mt-12"
          >
            <a
              href="/catalogo"
              className="inline-block px-8 py-4 bg-cereon-green text-white font-bold rounded-lg hover:bg-green-600 transition-colors shadow-lg hover:shadow-xl"
            >
              Ver Catálogo Completo
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
