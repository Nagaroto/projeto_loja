import React, { createContext, useContext, useState } from 'react';

// Criar o contexto
const CartContext = createContext();

// Componente Provider
export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Adicionar item ao carrinho
  const addToCart = (product) => {
    setCartItems(prevItems => {
      // Gerar itemId único
      const itemId = product.cartId || `${product.id}`;
      const existingItem = prevItems.find(item => item.itemId === itemId);
      
      if (existingItem) {
        return prevItems.map(item =>
          item.itemId === itemId
            ? { ...item, quantity: item.quantity + (product.quantity || 1) }
            : item
        );
      }
      
      return [...prevItems, { ...product, itemId, quantity: product.quantity || 1 }];
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
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
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
