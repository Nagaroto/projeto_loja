import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { getFavoriteProductIds } from '../utils/favorites';
import { API_URL } from '../services/api';

export function Favoritos() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncFavorites = () => setFavoriteIds(getFavoriteProductIds());
    syncFavorites();

    window.addEventListener('storage', syncFavorites);
    window.addEventListener('favorites:changed', syncFavorites);
    return () => {
      window.removeEventListener('storage', syncFavorites);
      window.removeEventListener('favorites:changed', syncFavorites);
    };
  }, []);

  useEffect(() => {
    const loadProductsAndCategories = async () => {
      try {
        setLoading(true);
        const [productsResponse, categoriesResponse] = await Promise.all([
          axios.get(`${API_URL}/products/published/`),
          axios.get(`${API_URL}/categories/`),
        ]);

        const productsData = productsResponse.data;
        const categoriesData = categoriesResponse.data;
        setProducts(Array.isArray(productsData) ? productsData : (productsData.results || []));
        setCategories(Array.isArray(categoriesData) ? categoriesData : (categoriesData.results || []));
      } catch (error) {
        console.error('Erro ao carregar favoritos:', error);
        setProducts([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    loadProductsAndCategories();
  }, []);

  const favoriteProducts = useMemo(() => {
    if (!favoriteIds.length) return [];
    const ids = new Set(favoriteIds);
    return products.filter((product) => ids.has(product.id));
  }, [favoriteIds, products]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-cereon-dark mb-4">
            Favoritos
          </h1>
          <p className="text-lg text-gray-600">
            Seus produtos salvos com o coracao.
          </p>
        </motion.div>

        {loading ? (
          <div className="text-center py-16">
            <p className="text-lg text-gray-600">Carregando favoritos...</p>
          </div>
        ) : favoriteProducts.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
          >
            {favoriteProducts.map((product) => (
              <ProductCard key={product.id} product={product} categories={categories} />
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-100">
            <p className="text-xl text-gray-500 mb-4">
              Voce ainda nao adicionou produtos aos favoritos.
            </p>
            <Link
              to="/catalogo"
              className="inline-block px-6 py-2 bg-cereon-green text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
            >
              Ir para o catalogo
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
