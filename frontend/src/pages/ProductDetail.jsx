import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useAlert } from '../context/AlertContext';

const API_URL = 'http://127.0.0.1:8000/api';
const FALLBACK_IMG = '/imgs/cereon.webp';

function normalizeProduct(apiData) {
  const price = parseFloat(apiData.price);
  const img = apiData.image_url || FALLBACK_IMG;
  const images = apiData.image_url ? [apiData.image_url] : [FALLBACK_IMG];
  const colors = Array.isArray(apiData.colors) ? apiData.colors : [];
  const sizes = Array.isArray(apiData.sizes) ? apiData.sizes : [];
  const catId = apiData.category;
  const categoryLabel = apiData.category_name || '';

  return {
    ...apiData,
    price: Number.isFinite(price) ? price : 0,
    image: img,
    images,
    colors,
    sizes,
    categoryLabel,
    categoryId: catId,
  };
}

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { showAlert } = useAlert();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [mainImage, setMainImage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setNotFound(false);
      setProduct(null);
      setRelatedProducts([]);
      setSelectedSize('');
      setSelectedColor('');
      setQuantity(1);
      setMainImage(null);

      try {
        const prodRes = await axios.get(`${API_URL}/products/${id}/`);
        if (cancelled) return;

        const normalized = normalizeProduct(prodRes.data);
        setProduct(normalized);
        setMainImage(normalized.images[0]);

        if (normalized.categoryId) {
          try {
            const pubRes = await axios.get(
              `${API_URL}/products/published/?category=${normalized.categoryId}`
            );
            if (cancelled) return;
            const results = pubRes.data.results || [];
            setRelatedProducts(
              results.filter((p) => p.id !== normalized.id).slice(0, 4)
            );
          } catch {
            if (!cancelled) setRelatedProducts([]);
          }
        }
      } catch {
        if (!cancelled) {
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const maxQty = useMemo(() => {
    if (!product || product.stock == null) return 99;
    return Math.max(1, parseInt(product.stock, 10) || 1);
  }, [product]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">Carregando produto...</p>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-cereon-dark mb-4">
            Produto não encontrado
          </h1>
          <Link to="/catalogo" className="text-cereon-green hover:underline">
            Voltar ao catálogo
          </Link>
        </div>
      </div>
    );
  }

  const handleAddToCart = async () => {
    if (product.colors.length && !selectedColor) {
      await showAlert('Por favor, selecione uma cor', {
        title: 'Seleção obrigatória',
        type: 'warning',
      });
      return;
    }
    if (product.sizes.length && !selectedSize) {
      await showAlert('Por favor, selecione um tamanho', {
        title: 'Seleção obrigatória',
        type: 'warning',
      });
      return;
    }

    const color = product.colors.length ? selectedColor : '';
    const size = product.sizes.length ? selectedSize : '';
    const cartId =
      product.colors.length || product.sizes.length
        ? `${product.id}-${size || '—'}-${color || '—'}`
        : `${product.id}`;

    const added = addToCart({
      ...product,
      image: product.image_url || product.image,
      price: product.price,
      selectedSize: size || undefined,
      selectedColor: color || undefined,
      quantity,
      cartId,
    });
    if (!added) {
      await showAlert('É necessário estar logado para colocar itens no carrinho.', {
        title: 'Acesso necessário',
        type: 'warning',
      });
      navigate('/login');
      return;
    }

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-cereon-green hover:text-cereon-dark mb-8 transition-colors"
          whileHover={{ x: -5 }}
        >
          <ArrowLeft size={20} />
          <span>Voltar</span>
        </motion.button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="sticky top-20">
              <div className="relative h-96 md:h-[32rem] rounded-lg overflow-hidden bg-gray-100 mb-4">
                <img
                  src={mainImage || product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {product.images.length > 1 ? (
                <div className="grid grid-cols-3 gap-4">
                  {product.images.map((img, index) => (
                    <motion.button
                      key={index}
                      type="button"
                      onClick={() => setMainImage(img)}
                      whileHover={{ scale: 1.05 }}
                      className={`relative h-24 rounded-lg overflow-hidden border-2 transition-all ${
                        mainImage === img
                          ? 'border-cereon-green'
                          : 'border-gray-200'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </motion.button>
                  ))}
                </div>
              ) : null}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {product.categoryLabel ? (
              <div>
                <p className="text-sm text-cereon-green font-semibold uppercase tracking-wide">
                  {product.categoryLabel}
                </p>
              </div>
            ) : null}

            <div>
              <h1 className="text-4xl font-bold text-cereon-dark mb-4">
                {product.name}
              </h1>
              <div className="space-y-2">
                <div className="flex items-baseline space-x-4">
                  <span className="text-sm text-gray-600">Preço unitário:</span>
                  <span className="text-2xl font-bold text-cereon-green">
                    R$ {product.price.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-baseline space-x-4 pt-3 border-t border-gray-200">
                  <span className="text-lg font-semibold text-cereon-dark">
                    Total:
                  </span>
                  <span className="text-4xl font-bold text-cereon-green">
                    R$ {(product.price * quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-lg text-gray-600 leading-relaxed">
              {product.description}
            </p>

            {product.colors.length > 0 ? (
              <div className="space-y-3">
                <label className="block text-lg font-semibold text-cereon-dark">
                  Cores disponíveis
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {product.colors.map((color) => (
                    <motion.button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`p-3 rounded-lg border-2 font-medium transition-all ${
                        selectedColor === color
                          ? 'border-cereon-green bg-cereon-light text-cereon-dark'
                          : 'border-gray-200 text-gray-700 hover:border-cereon-green'
                      }`}
                    >
                      {color}
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : null}

            {product.sizes.length > 0 ? (
              <div className="space-y-3">
                <label className="block text-lg font-semibold text-cereon-dark">
                  Tamanhos disponíveis
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {product.sizes.map((size) => (
                    <motion.button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`p-3 rounded-lg border-2 font-semibold transition-all ${
                        selectedSize === size
                          ? 'border-cereon-green bg-cereon-light text-cereon-dark'
                          : 'border-gray-200 text-gray-700 hover:border-cereon-green'
                      }`}
                    >
                      {size}
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              <label className="block text-lg font-semibold text-cereon-dark">
                Quantidade
              </label>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-cereon-green transition-colors"
                >
                  -
                </button>
                <span className="text-2xl font-bold w-8 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity(Math.min(maxQty, quantity + 1))
                  }
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-cereon-green transition-colors"
                >
                  +
                </button>
              </div>
              {product.stock != null ? (
                <p className="text-sm text-gray-500">
                  {product.stock > 0
                    ? `${product.stock} em estoque`
                    : 'Fora de estoque'}
                </p>
              ) : null}
            </div>

            <div className="flex gap-4 pt-6">
              <motion.button
                type="button"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                whileHover={{ scale: product.stock === 0 ? 1 : 1.05 }}
                whileTap={{ scale: product.stock === 0 ? 1 : 0.95 }}
                className={`flex-1 py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center space-x-2 ${
                  product.stock === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : isAdded
                      ? 'bg-green-500 text-white'
                      : 'bg-cereon-green text-white hover:bg-green-600'
                }`}
              >
                <ShoppingCart size={24} />
                <span>
                  {product.stock === 0
                    ? 'Indisponível'
                    : isAdded
                      ? 'Adicionado ao carrinho!'
                      : 'Adicionar ao Carrinho'}
                </span>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-4 border-2 border-gray-300 rounded-lg hover:border-cereon-green transition-colors"
              >
                <Heart
                  size={24}
                  className="text-gray-400 hover:text-red-500"
                />
              </motion.button>
            </div>

            <div className="border-t-2 border-gray-200 pt-6 space-y-4">
              <div>
                <h3 className="font-semibold text-cereon-dark mb-2">Envio</h3>
                <p className="text-gray-600">Entrega em até 10 dias úteis</p>
              </div>
              <div>
                <h3 className="font-semibold text-cereon-dark mb-2">
                  Devolução
                </h3>
                <p className="text-gray-600">
                  30 dias para devolver se não gostar
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-cereon-dark mb-2">
                  Garantia
                </h3>
                <p className="text-gray-600">
                  Garantia de qualidade em todos os produtos
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {relatedProducts.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-20 pt-12 border-t-2 border-gray-200"
          >
            <h2 className="text-3xl font-bold text-cereon-dark mb-8">
              Produtos Relacionados
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {relatedProducts.map((relatedProduct) => (
                <motion.div
                  key={relatedProduct.id}
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => navigate(`/produto/${relatedProduct.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      navigate(`/produto/${relatedProduct.id}`);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="relative h-48 overflow-hidden bg-gray-200 rounded-t-lg">
                    <img
                      src={relatedProduct.image_url || FALLBACK_IMG}
                      alt={relatedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-cereon-dark mb-2">
                      {relatedProduct.name}
                    </h3>
                    <p className="text-lg font-bold text-cereon-green">
                      R${' '}
                      {parseFloat(relatedProduct.price).toFixed(2)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
