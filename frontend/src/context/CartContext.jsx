import React, { createContext, useContext, useState } from 'react';

// Criar o contexto
const CartContext = createContext();

// Componente Provider
export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const addToCart = (product) => {
    const priceNum = parseFloat(product.price);
    const normalized = {
      ...product,
      price: Number.isFinite(priceNum) ? priceNum : 0,
      image: product.image_url || product.image || '/imgs/cereon.webp',
    };

    setCartItems((prevItems) => {
      const itemId = normalized.cartId || `${normalized.id}`;
      const existingItem = prevItems.find((item) => item.itemId === itemId);
      const addQty = normalized.quantity || 1;

      if (existingItem) {
        return prevItems.map((item) =>
          item.itemId === itemId
            ? { ...item, quantity: item.quantity + addQty }
            : item
        );
      }

      return [...prevItems, { ...normalized, itemId, quantity: addQty }];
    });
  };

  // Remover item do carrinho
  const removeFromCart = (itemId) => {
    setCartItems(prevItems => prevItems.filter(item => item.itemId !== itemId));
  };

  // Atualizar quantidade
  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.itemId === itemId
          ? { ...item, quantity }
          : item
      )
    );
  };

  // Calcular total
  const getTotal = () => {
    return cartItems.reduce((total, item) => {
      const p = parseFloat(item.price);
      const q = item.quantity || 1;
      return total + (Number.isFinite(p) ? p : 0) * q;
    }, 0);
  };

  // Limpar carrinho
  const clearCart = () => {
    setCartItems([]);
  };

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    getTotal,
    clearCart,
    isCartOpen,
    setIsCartOpen,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

// Hook para usar o contexto
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser usado dentro de CartProvider');
  }
  return context;
}
