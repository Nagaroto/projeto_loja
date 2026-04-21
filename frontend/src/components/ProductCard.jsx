import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAlert } from '../context/AlertContext';
import { motion } from 'framer-motion';

export function ProductCard({ product, categories = [] }) {
  const { addToCart } = useCart();
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const [isAdded, setIsAdded] = React.useState(false);

  const handleAddToCart = async () => {
    const added = addToCart(product);
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

  // Converter preço para número se for string
  const formatPrice = (price) => {
    return parseFloat(price).toFixed(2);
  };

  // Obter nome da categoria pelo ID (categoria de sistema "Sem categoria" não aparece no catálogo)
  const getCategoryName = () => {
    if (!product.category) return '';

    if (typeof product.category === 'number') {
      const category = categories.find((c) => c.id === product.category);
      if (!category) return '';
      if (category.slug === 'sem-categoria' || category.name === 'Sem categoria') {
        return '';
      }
      return category.name;
    }

    return product.category;
  };

  const categoryLabel = getCategoryName();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden group"
    >
      {/* Imagem com overlay */}
      <Link to={`/produto/${product.id}`} className="block">
        <div className="relative h-64 overflow-hidden bg-gray-200 cursor-pointer">
          <img
            src={product.image_url || product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
        </div>
      </Link>

      {/* Conteúdo */}
      <div className="p-4">
        {/* Categoria */}
        {categoryLabel ? (
          <p className="text-xs text-cereon-green font-semibold uppercase tracking-wide mb-2">
            {categoryLabel}
          </p>
        ) : null}

        {/* Nome */}
        <Link to={`/produto/${product.id}`} className="block hover:text-cereon-green transition-colors">
          <h3 className="text-lg font-semibold text-cereon-dark mb-2 line-clamp-2 h-14">
            {product.name}
          </h3>
        </Link>

        {/* Preço */}
        <div className="flex items-baseline space-x-2 mb-4">
          <span className="text-2xl font-bold text-cereon-green">
            R$ {formatPrice(product.price)}
          </span>
        </div>

        {/* Botão */}
        <motion.button
          onClick={handleAddToCart}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
            isAdded
              ? 'bg-green-500 text-white'
              : 'bg-cereon-green text-white hover:bg-green-600'
          }`}
        >
          <ShoppingCart size={18} />
          <span>
            {isAdded ? 'Adicionado!' : 'Adicionar'}
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}
