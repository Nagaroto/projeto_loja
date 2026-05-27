import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { API_URL } from '../services/api';

// Criar o contexto
const CartContext = createContext();

function toPositiveInt(value, fallback = 1) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function parseCartId(cartId) {
  // Formato usado no front: `${product.id}-${size}-${color}` (size/color opcionais)
  const raw = String(cartId || '').trim();
  if (!raw) return { product_id: null, size: '', color: '' };
  const parts = raw.split('-');
  const pid = Number(parts[0]);
  const size = parts[1] || '';
  const color = parts[2] || '';
  return { product_id: Number.isFinite(pid) ? pid : null, size, color };
}

function backendItemToFront(item) {
  const p = item?.product;
  const priceNum = parseFloat(p?.price);
  const promoPriceNum = parseFloat(p?.promotional_price);
  const hasPromotion = p?.has_promotion || false;
  // Usa preço promocional se disponível e válido
  const finalPrice = (hasPromotion && Number.isFinite(promoPriceNum) && promoPriceNum > 0)
    ? promoPriceNum
    : (Number.isFinite(priceNum) ? priceNum : 0);
  
  // Obter imagem prioritária: image_url (que já vem corrigido do backend) 
  // ou fallback para o logo da empresa
  const image = (p?.image_url && p.image_url !== '/imgs/cereon.webp') 
    ? p.image_url 
    : '/imgs/cereon.webp';

  const itemId = item?.cart_item_key || String(p?.id || item?.id || '');
  return {
    ...p,
    id: p?.id,
    name: p?.name,
    price: finalPrice,
    original_price: priceNum,
    promotional_price: promoPriceNum,
    has_promotion: hasPromotion,
    image_url: p?.image_url,
    image,
    quantity: toPositiveInt(item?.quantity, 1),
    itemId,
    cartId: item?.cart_item_key || itemId,
    selectedSize: item?.size || '',
    selectedColor: item?.color || '',
  };
}

function frontItemToSyncRow(item) {
  const cartId = item?.cartId || item?.itemId || '';
  const parsed = parseCartId(cartId);
  const product_id = parsed.product_id || Number(item?.id);
  return {
    product_id,
    quantity: toPositiveInt(item?.quantity, 1),
    cart_item_key: String(cartId || '').trim(),
    size: item?.selectedSize || parsed.size || '',
    color: item?.selectedColor || parsed.color || '',
  };
}

// Componente Provider
export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { token, getValidToken } = useAuth();

  const syncingRef = useRef(false);

  // Mantém fallback legado para versões antigas e limpa carrinho ao deslogar
  useEffect(() => {
    if (token) return;
    setCartItems([]);
    try {
      localStorage.removeItem('cart');
    } catch {
      /* ignore */
    }
  }, [token]);

  // Ao logar/recarregar, carrega carrinho persistido do backend
  useEffect(() => {
    if (!token) return;
    if (syncingRef.current) return;
    syncingRef.current = true;
    (async () => {
      try {
        const t = await getValidToken();
        if (!t) return;
        const res = await axios.get(
          `${API_URL}/me/cart/`,
          { headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } }
        );
        const items = res.data?.items || [];
        setCartItems(items.map(backendItemToFront));
      } catch (e) {
        console.error('Erro ao carregar carrinho:', e);
      } finally {
        syncingRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const addToCart = (product) => {
    if (!token) {
      return { success: false, message: 'É necessário estar logado para adicionar itens ao carrinho.' };
    }

    if (product?.is_active === false) {
      return { success: false, message: 'Este produto não está disponível no momento.' };
    }

    const priceNum = parseFloat(product.price);
    const promoPriceNum = parseFloat(product.promotional_price || product.discounted_price);
    const hasPromotion = product.is_on_promotion || product.has_promotion || product.promotion_info;
    // Usa preço promocional se disponível
    const finalPrice = (hasPromotion && Number.isFinite(promoPriceNum) && promoPriceNum > 0)
      ? promoPriceNum
      : (Number.isFinite(priceNum) ? priceNum : 0);
    // Obter imagem prioritária: image_url ou a primeira da lista images
    const getProductImage = () => {
      if (product.image_url && product.image_url !== '/imgs/cereon.webp') {
        return product.image_url;
      }
      if (Array.isArray(product.images) && product.images.length > 0) {
        const first = product.images[0];
        return typeof first === 'object' ? first.url : first;
      }
      return product.image || '/imgs/cereon.webp';
    };

    const normalized = {
      ...product,
      price: finalPrice,
      original_price: priceNum,
      promotional_price: promoPriceNum,
      has_promotion: !!hasPromotion,
      image: getProductImage(),
    };

    if ((product.colors?.length || product.sizes?.length) && !product.selectedSize && !product.selectedColor) {
      return { success: false, message: 'Selecione tamanho e cor na página do produto antes de adicionar ao carrinho.' };
    }

    const itemId = normalized.cartId || `${normalized.id}`;
    const existingItem = cartItems.find((item) => item.itemId === itemId);

    if (existingItem) {
      return { success: false, message: 'Esse item já está no carrinho.', alreadyInCart: true };
    }

    const addQty = toPositiveInt(normalized.quantity, 1);

    setCartItems((prevItems) => [
      ...prevItems,
      { ...normalized, itemId, quantity: addQty }
    ]);

    // melhor esforço: persistir no backend quando autenticado
    (async () => {
      try {
        const t = await getValidToken();
        if (!t) return;
        const parsed = parseCartId(itemId);
        await axios.post(
          `${API_URL}/me/cart/add/`,
          {
            product_id: normalized.id,
            quantity: addQty,
            cart_item_key: itemId,
            size: normalized.selectedSize || parsed.size || '',
            color: normalized.selectedColor || parsed.color || '',
          },
          { headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } }
        );
      } catch (e) {
        console.error('Erro ao persistir item no carrinho:', e);
      }
    })();

    return { success: true };
  };

  // Remover item do carrinho
  const removeFromCart = (itemId) => {
    setCartItems(prevItems => prevItems.filter(item => item.itemId !== itemId));
    if (token) {
      (async () => {
        try {
          const t = await getValidToken();
          if (!t) return;
          await axios.post(
            `${API_URL}/me/cart/remove/`,
            { cart_item_key: itemId },
            { headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } }
          );
        } catch (e) {
          console.error('Erro ao remover item do carrinho:', e);
        }
      })();
    }
  };

  // Atualizar quantidade
  const updateQuantity = (itemId, quantity) => {
    const nextQuantity = Number.parseInt(quantity, 10);
    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    // Verificar limite de estoque
    const item = cartItems.find((i) => i.itemId === itemId);
    if (item && Number.isFinite(item.stock) && nextQuantity > item.stock) {
      return { success: false, message: 'Quantidade máxima em estoque atingida.' };
    }

    let nextSnapshot = null;
    setCartItems((prevItems) => {
      const next = prevItems.map((item) =>
        item.itemId === itemId ? { ...item, quantity: nextQuantity } : item
      );
      nextSnapshot = next;
      return next;
    });

    if (token) {
      (async () => {
        try {
          const t = await getValidToken();
          if (!t) return;
          const rows = (nextSnapshot || [])
            .map(frontItemToSyncRow)
            .filter((r) => Number.isFinite(r.product_id));
          const res = await axios.post(
            `${API_URL}/me/cart/sync/`,
            { items: rows },
            { headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } }
          );
          const items = res.data?.items || [];
          setCartItems(items.map(backendItemToFront));
        } catch (e) {
          console.error('Erro ao atualizar quantidade no carrinho:', e);
        }
      })();
    }

    return { success: true };
  };

  // Calcular total (já usa preço promocional quando disponível)
  const getTotal = () => {
    return cartItems.reduce((total, item) => {
      const p = parseFloat(item.price);
      const q = item.quantity || 1;
      return total + (Number.isFinite(p) ? p : 0) * q;
    }, 0);
  };

  // Calcular total sem descontos (preço original)
  const getOriginalTotal = () => {
    return cartItems.reduce((total, item) => {
      const originalPrice = parseFloat(item.original_price || item.price);
      const q = item.quantity || 1;
      return total + (Number.isFinite(originalPrice) ? originalPrice : 0) * q;
    }, 0);
  };

  // Calcular economia total com promoções
  const getSavings = () => {
    return getOriginalTotal() - getTotal();
  };

  // Limpar carrinho
  const clearCart = () => {
    setCartItems([]);
    if (token) {
      (async () => {
        try {
          const t = await getValidToken();
          if (!t) return;
          await axios.post(
            `${API_URL}/me/cart/sync/`,
            { items: [] },
            { headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } }
          );
        } catch (e) {
          console.error('Erro ao limpar carrinho no backend:', e);
        }
      })();
    }
  };

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    getTotal,
    getOriginalTotal,
    getSavings,
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
