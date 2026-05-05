import React, { useState, useEffect } from 'react';
import { Hero } from '../components/Hero';
import { WhyChoose } from '../components/WhyChoose';
import { ProductCard } from '../components/ProductCard';
import { motion } from 'framer-motion';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api';

export function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublishedProducts();
    loadCategories();
  }, []);

  const loadPublishedProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/products/published/`);
      const data = response.data;
      const productsList = Array.isArray(data) ? data : (data.results || []);
      setProducts(productsList);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/categories/`);
      const data = response.data;
      const categoriesList = Array.isArray(data) ? data : (data.results || []);
      setCategories(categoriesList);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      setCategories([]);
    }
  };

  // Priorizar produtos em promoção - máximo 6 produtos
  const featuredProducts = React.useMemo(() => {
    if (!products.length) return [];
    
    // Separar produtos em promoção e sem promoção
    const onPromotion = products.filter(p => p.is_on_promotion || p.promotion_info);
    const notOnPromotion = products.filter(p => !p.is_on_promotion && !p.promotion_info);
    
    // Priorizar produtos em promoção, depois os demais, limitando a 6
    return [...onPromotion, ...notOnPromotion].slice(0, 6);
  }, [products]);

  // Verificar se há produtos em promoção para mostrar mensagem diferente
  const hasPromotions = featuredProducts.some(p => p.is_on_promotion || p.promotion_info);

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
              {hasPromotions ? 'Ofertas Imperdíveis' : 'Produtos em Destaque'}
            </h2>
            <p className="text-lg text-gray-600">
              {hasPromotions 
                ? 'Aproveite nossas promoções por tempo limitado!' 
                : 'Confira nossas melhores peças desta coleção'}
            </p>
          </motion.div>

          {/* Grid de Produtos */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-lg text-gray-600">Carregando produtos...</p>
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} categories={categories} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-gray-600">Nenhum produto disponível no momento.</p>
            </div>
          )}

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
