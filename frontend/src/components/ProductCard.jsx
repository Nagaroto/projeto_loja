import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export function ProductCard({ product, categories = [] }) {
  const { addToCart } = useCart();
  const { showAlert } = useAlert();
  const { isFirstLogin } = useAuth();
  const navigate = useNavigate();
  const [isAdded, setIsAdded] = React.useState(false);

  const handleAddToCart = async () => {
    if (product.is_active === false) {
      if (!isFirstLogin) {
        await showAlert('Este produto não está disponível no momento.', {
          title: 'Produto indisponível',
          type: 'warning',
          toast: true,
          duration: 10000,
        });
      }
      return;
    }

    if ((product.colors?.length || product.sizes?.length) && !product.selectedSize && !product.selectedColor) {
      navigate(`/produto/${product.id}`);
      return;
    }

    const result = addToCart(product);
    if (!result.success) {
      if (result.alreadyInCart) {
        await showAlert(result.message, {
          type: 'info',
          toast: true,
          duration: 4000,
        });
      } else {
        await showAlert(result.message, {
          title: 'Erro',
          type: 'warning',
        });
      }
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
  
  // Obter a melhor imagem disponível, priorizando a capa se disponível em product.images
  const getCoverImage = () => {
    // Se image_url estiver presente, o backend já deve ter priorizado a capa (conforme novos serializers)
    if (product.image_url && product.image_url !== '/imgs/cereon.webp') {
      return product.image_url;
    }

    // Fallback para product.image
    if (product.image && product.image !== '/imgs/cereon.webp') {
      return product.image;
    }

    // Se tivermos a lista de imagens, procurar pela capa
    if (Array.isArray(product.images) && product.images.length > 0) {
      // Se for array de objetos (formato DRF direto)
      const coverObj = product.images.find(img => typeof img === 'object' && img.is_cover);
      if (coverObj?.url) return coverObj.url;

      // Se for array de strings (formato normalizado no front) ou fallback para primeira
      const firstImg = product.images[0];
      return typeof firstImg === 'object' ? firstImg.url : firstImg;
    }

    // Fallback final
    return '/imgs/cereon.webp';
  };

  const coverImageUrl = getCoverImage();

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
            src={coverImageUrl}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-110"
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
        <div className="flex flex-col mb-4">
          {product.is_on_promotion || product.promotion_info ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg text-gray-400 line-through">
                  R$ {formatPrice(product.price)}
                </span>
                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-semibold">
                  -{product.promotion_info?.discount_percent || Math.round((1 - (product.discounted_price / product.price)) * 100)}%
                </span>
              </div>
              <span className="text-2xl font-bold text-red-600">
                R$ {formatPrice(product.discounted_price || (product.price * (1 - (product.promotion_info?.discount_percent || 0) / 100)))}
              </span>
              <span className="text-xs text-green-600 font-medium">
                {product.promotion_info?.name || 'Promoção'}
              </span>
            </>
          ) : (
            <span className="text-2xl font-bold text-cereon-green">
              R$ {formatPrice(product.price)}
            </span>
          )}
        </div>

        {/* Botão */}
        <motion.button
          onClick={handleAddToCart}
          whileHover={{ scale: product.is_active === false ? 1 : 1.05 }}
          whileTap={{ scale: product.is_active === false ? 1 : 0.95 }}
          disabled={product.is_active === false}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
            product.is_active === false
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : isAdded
                ? 'bg-green-500 text-white'
                : 'bg-cereon-green text-white hover:bg-green-600'
          }`}
        >
          <ShoppingCart size={18} />
          <span>
            {product.is_active === false
              ? 'Indisponível'
              : isAdded
                ? 'Adicionado!'
                : (product.colors?.length || product.sizes?.length)
                  ? 'Selecionar'
                  : 'Adicionar'}
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}
