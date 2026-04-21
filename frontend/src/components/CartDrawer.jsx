import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export function CartDrawer() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { cartItems, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, getTotal } = useCart();
  const getSafeQty = (qty) => {
    const parsed = Number.parseInt(qty, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  };

  const goCheckout = () => {
    setIsCartOpen(false);
    if (!token) {
      navigate('/login');
      return;
    }
    navigate('/checkout');
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
                    className="flex gap-4 border border-gray-200 rounded-lg p-4"
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
                      <p className="text-cereon-green font-bold mt-1">
                        R${' '}
                        {Number.isFinite(parseFloat(item.price))
                          ? parseFloat(item.price).toFixed(2)
                          : '0.00'}
                      </p>

                      {/* Quantidade */}
                      <div className="flex items-center space-x-2 mt-3">
                        <button
                          onClick={() => updateQuantity(item.itemId, getSafeQty(item.quantity) - 1)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-8 text-center font-semibold">
                          {getSafeQty(item.quantity)}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.itemId, getSafeQty(item.quantity) + 1)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
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
                  className="w-full py-3 bg-cereon-green text-white font-bold rounded-lg hover:bg-green-600 transition-colors"
                >
                  Finalizar compra
                </button>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-3 border-2 border-gray-300 text-cereon-dark font-bold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Continuar Comprando
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
