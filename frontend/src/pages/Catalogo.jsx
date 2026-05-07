import React, { useState, useEffect, useMemo } from 'react';
import { ProductCard } from '../components/ProductCard';
import { mockProducts, categories } from '../data/mockProducts';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API_URL } from '../services/api';

// Detecta categoria sistema "Sem categoria" para ocultar no filtro público.
const isFallbackCategory = (cat) =>
  cat && (cat.slug === 'sem-categoria' || cat.name === 'Sem categoria');

export function Catalogo() {
  const [products, setProducts] = useState([]);
  const [apiCategories, setApiCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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
      console.error('Erro ao carregar produtos publicados:', error);
      setProducts(mockProducts);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/categories/`);
      const data = response.data;

      const categoriesList = Array.isArray(data) ? data : (data.results || []);
      setApiCategories(categoriesList);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      setApiCategories([]);
    }
  };

  const catalogCategories = useMemo(
    () => apiCategories.filter((c) => !isFallbackCategory(c)),
    [apiCategories]
  );

  const filteredProducts = useMemo(() => {
    let result = products;

    // Filtrar por categoria (usando ID da categoria do backend)
    if (selectedCategory) {
      result = result.filter(product => product.category === parseInt(selectedCategory));
    }

    // Filtrar por busca
    if (searchTerm) {
      result = result.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Priorizar produtos em promoção
    const onPromotion = result.filter(p => p.is_on_promotion || p.promotion_info);
    const notOnPromotion = result.filter(p => !p.is_on_promotion && !p.promotion_info);
    
    return [...onPromotion, ...notOnPromotion];
  }, [selectedCategory, searchTerm, products]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-cereon-dark mb-4">
            Catálogo Completo
          </h1>
          <p className="text-lg text-gray-600">
            Explore nossa coleção completa de moda exclusiva e sustentável
          </p>
        </motion.div>

        {/* Busca */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="mb-8"
        >
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-6 py-3 rounded-lg border-2 border-gray-300 focus:border-cereon-green focus:outline-none transition-colors"
          />
        </motion.div>

        {/* Filtros de Categoria */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-12"
        >
          <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
            Filtrar por Categoria
          </h3>
          <div className="flex flex-wrap gap-3">
            {/* Botão "Todos" para limpar filtro */}
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
                !selectedCategory
                  ? 'bg-cereon-green text-white shadow-lg'
                  : 'bg-white text-cereon-dark border-2 border-gray-300 hover:border-cereon-green'
              }`}
            >
              Todos
            </button>
            
            {/* Botões das categorias do backend */}
            {catalogCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id.toString())}
                className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
                  selectedCategory === category.id.toString()
                    ? 'bg-cereon-green text-white shadow-lg'
                    : 'bg-white text-cereon-dark border-2 border-gray-300 hover:border-cereon-green'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Resultados */}
        <div className="mb-6">
          <p className="text-gray-600">
            Mostrando <span className="font-bold">{filteredProducts.length}</span> produto
            {filteredProducts.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Grid de Produtos */}
        {filteredProducts.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
          >
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} categories={apiCategories} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="text-center py-16"
          >
            <p className="text-xl text-gray-500 mb-4">
              Nenhum produto encontrado
            </p>
            <button
              onClick={() => {
                setSelectedCategory('');
                setSearchTerm('');
              }}
              className="px-6 py-2 bg-cereon-green text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
            >
              Limpar Filtros
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
