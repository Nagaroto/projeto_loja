import React, { useState, useMemo } from 'react';
import { ProductCard } from '../components/ProductCard';
import { mockProducts, categories } from '../data/mockProducts';
import { motion } from 'framer-motion';

export function Catalogo() {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar produtos
  const filteredProducts = useMemo(() => {
    let result = mockProducts;

    // Filtrar por categoria
    if (selectedCategory !== 'Todos') {
      result = result.filter(product => product.category === selectedCategory);
    }

    // Filtrar por busca
    if (searchTerm) {
      result = result.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result;
  }, [selectedCategory, searchTerm]);

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
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
                  selectedCategory === category
                    ? 'bg-cereon-green text-white shadow-lg'
                    : 'bg-white text-cereon-dark border-2 border-gray-300 hover:border-cereon-green'
                }`}
              >
                {category}
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
              <ProductCard key={product.id} product={product} />
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
                setSelectedCategory('Todos');
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
