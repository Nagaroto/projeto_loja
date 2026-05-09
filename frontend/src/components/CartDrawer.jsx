import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Minus, Plus, Trash2, Tag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export function CartDrawer() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { cartItems, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, getTotal } = useCart();
  const [confirmRemoveItem, setConfirmRemoveItem] = React.useState(null);
  const getSafeQty = (qty) => {
    const parsed = Number.parseInt(qty, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  };
  const isUnavailable = (item) => item?.is_active === false || Number(item?.stock) <= 0;
  const hasUnavailableItems = cartItems.some(isUnavailable);

  const goCheckout = () => {
    setIsCartOpen(false);
    if (!token) {
      navigate('/login');
      return;
    }
    navigate('/checkout');
  };

  const handleDecreaseQuantity = (item) => {
    const currentQty = getSafeQty(item.quantity);
    if (currentQty > 1) {
      updateQuantity(item.itemId, currentQty - 1);
    } else {
      setConfirmRemoveItem(item);
    }
  };

  const confirmRemove = () => {
    if (confirmRemoveItem) {
      removeFromCart(confirmRemoveItem.itemId);
      setConfirmRemoveItem(null);
    }
  };

  const cancelRemove = () => {
    setConfirmRemoveItem(null);
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-cereon-dark">Carrinho</h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-gray-500 text-lg mb-2">Seu carrinho está vazio</p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="text-cereon-green font-semibold hover:text-green-600 transition-colors"
                  >
                    Continuar comprando
                  </button>
                </div>
              ) : (
                cartItems.map((item) => (
                  <motion.div
                    key={item.itemId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`flex gap-4 border border-gray-200 rounded-lg p-4 ${
                      isUnavailable(item) ? 'opacity-60 bg-gray-50' : ''
                    }`}
                  >
                    {/* Imagem */}
                    <img
                      src={item.image_url || item.image || '/imgs/cereon.webp'}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />

                    {/* Info */}
                    <div className="flex-1">
                      <h4 className="font-semibold text-cereon-dark line-clamp-2">
                        {item.name}
                      </h4>
                      {(item.selectedSize || item.selectedColor) && (
                        <p className="text-xs text-gray-500 mt-1">
                          {item.selectedSize ? `Tamanho: ${item.selectedSize}` : ''}
                          {item.selectedSize && item.selectedColor ? ' | ' : ''}
                          {item.selectedColor ? `Cor: ${item.selectedColor}` : ''}
                        </p>
                      )}
                      {isUnavailable(item) && (
                        <p className="mt-1 text-xs font-semibold text-red-600">
                          Produto fora de estoque ou desativado.
                        </p>
                      )}
                      {/* Preço com/sem promoção */}
                      <div className="mt-1">
                        {(() => {
                          const hasPromotion = item.has_promotion === true;
                          const originalPrice = parseFloat(item.original_price);
                          const currentPrice = parseFloat(item.price);
                          const hasValidDiscount = hasPromotion && 
                                                  Number.isFinite(originalPrice) && 
                                                  Number.isFinite(currentPrice) && 
                                                  originalPrice > currentPrice && 
                                                  currentPrice > 0;
                          
                          return hasValidDiscount ? (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 line-through text-sm">
                                R$ {originalPrice.toFixed(2)}
                              </span>
                              <span className="text-red-600 font-bold">
                                R$ {currentPrice.toFixed(2)}
                              </span>
                              <span className="flex items-center text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                                <Tag size={10} className="mr-1" />
                                Promoção
                              </span>
                            </div>
                          ) : (
                            <p className="text-cereon-green font-bold">
                              R${' '}
                              {Number.isFinite(currentPrice) ? currentPrice.toFixed(2) : '0.00'}
                            </p>
                          );
                        })()}
                      </div>

                      {/* Quantidade */}
                      <div className="flex items-center space-x-2 mt-3">
                        <button
                          onClick={() => handleDecreaseQuantity(item)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-8 text-center font-semibold">
                          {getSafeQty(item.quantity)}
                        </span>
                        <button
                          onClick={() => {
                            const result = updateQuantity(item.itemId, getSafeQty(item.quantity) + 1);
                            if (result && !result.success) {
                              // Mostrar mensagem de erro (pode usar um toast ou alert)
                              console.warn(result.message);
                            }
                          }}
                          disabled={Number.isFinite(item.stock) && getSafeQty(item.quantity) >= item.stock}
                          className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeFromCart(item.itemId)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {cartItems.length > 0 && (
              <div className="border-t border-gray-200 p-6 space-y-4">
                {/* Total */}
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-cereon-dark">Total:</span>
                  <span className="text-2xl font-bold text-cereon-green">
                    R$ {getTotal().toFixed(2)}
                  </span>
                </div>

                {/* Botões */}
                <button
                  type="button"
                  onClick={goCheckout}
                  disabled={hasUnavailableItems}
                  className="w-full py-3 bg-cereon-green text-white font-bold rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {hasUnavailableItems ? 'Remova itens indisponíveis para finalizar' : 'Finalizar compra'}
                </button>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-3 border-2 border-gray-300 text-cereon-dark font-bold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Continuar Comprando
                </button>
              </div>
            )}

            {/* Modal de confirmação de remoção */}
            {confirmRemoveItem && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                  <h3 className="text-lg font-semibold text-cereon-dark mb-4">
                    Remover item do carrinho?
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Deseja remover "{confirmRemoveItem.name}" do carrinho?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={cancelRemove}
                      className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmRemove}
                      className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
