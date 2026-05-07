import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, MapPin, Truck, CreditCard, MessageSquare, Copy, CheckCircle, Clock, X } from 'lucide-react';
import { API_URL } from '../services/api';

const PAYMENT_LABELS = {
  pix: 'PIX (simulação — use o app do banco após confirmar)',
  cartao: 'Cartão de crédito ou débito (simulação)',
  boleto: 'Boleto bancário (simulação)',
};

function formatMoney(n) {
  const x = parseFloat(n);
  return Number.isFinite(x) ? x.toFixed(2) : '0.00';
}

export function Checkout() {
  const navigate = useNavigate();
  const { cartItems, getTotal, clearCart } = useCart();
  const { getValidToken, user } = useAuth();

  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [addressId, setAddressId] = useState('');
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [delivery, setDelivery] = useState({
    label: 'Entrega',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  const [shippingFee, setShippingFee] = useState(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingErr, setShippingErr] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [customerNotes, setCustomerNotes] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponFeedback, setCouponFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [cpf, setCpf] = useState('');
  const [appliedCpf, setAppliedCpf] = useState('');
  const [cpfFeedback, setCpfFeedback] = useState('');

  // Estados para pagamento
  const [paymentData, setPaymentData] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [orderId, setOrderId] = useState(null);
  const [orderCode, setOrderCode] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [statusCheckInterval, setStatusCheckInterval] = useState(null);
  const [paymentTimer, setPaymentTimer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [qrExpired, setQrExpired] = useState(false);
  const [duplicateOrderError, setDuplicateOrderError] = useState('');
  const [duplicateOrderId, setDuplicateOrderId] = useState(null);

  const subtotal = getTotal();
  const cartProductIds = new Set(
    cartItems.map((item) => Number(item.id)).filter((id) => Number.isInteger(id) && id > 0)
  );

  const isCouponActive = (coupon) => {
    if (!coupon || coupon.is_active === false) return false;
    if (coupon.max_uses != null && coupon.uses_count != null && coupon.uses_count >= coupon.max_uses) {
      return false;
    }
    if (!coupon.expiry_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(coupon.expiry_date);
    expiry.setHours(0, 0, 0, 0);
    return expiry >= today;
  };

  const isCouponApplicableToCart = (coupon) => {
    const eligible = Array.isArray(coupon?.eligible_products) ? coupon.eligible_products : [];
    if (eligible.length === 0) return true;
    return eligible.some((pid) => cartProductIds.has(Number(pid)));
  };

  const getCouponEligibleSubtotal = (coupon) => {
    if (!coupon) return 0;
    const eligible = Array.isArray(coupon.eligible_products) ? coupon.eligible_products.map(Number) : [];
    return cartItems.reduce((acc, item) => {
      const lineTotal = (parseFloat(item.price) || 0) * (item.quantity || 1);
      if (eligible.length === 0 || eligible.includes(Number(item.id))) {
        return acc + lineTotal;
      }
      return acc;
    }, 0);
  };

  const getItemDiscount = (item, coupon) => {
    if (!coupon) return 0;
    const eligible = Array.isArray(coupon.eligible_products) ? coupon.eligible_products.map(Number) : [];
    const isEligible = eligible.length === 0 || eligible.includes(Number(item.id));
    if (!isEligible) return 0;
    const lineTotal = (parseFloat(item.price) || 0) * (item.quantity || 1);
    const pct = Number(coupon.discount_percent || 0) / 100;
    return Number((lineTotal * pct).toFixed(2));
  };

  const applicableCoupons = availableCoupons.filter((c) => isCouponActive(c) && isCouponApplicableToCart(c));
  const appliedDiscount = appliedCoupon
    ? Math.min(
        subtotal,
        Number(
          (getCouponEligibleSubtotal(appliedCoupon) * (Number(appliedCoupon.discount_percent || 0) / 100)).toFixed(2)
        )
      )
    : 0;
  const discountedSubtotal = Math.max(0, subtotal - appliedDiscount);

  const removeCoupon = () => {
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponFeedback('');
  };

  const loadAddresses = useCallback(async () => {
    setLoadingAddresses(true);
    try {
      const token = await getValidToken();
      if (!token) return;
      const res = await axios.get(`${API_URL}/me/addresses/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = Array.isArray(res.data) ? res.data : res.data.results || [];
      setAddresses(list);
      const def = list.find((a) => a.is_default);
      if (def) setAddressId(String(def.id));
      else if (list.length === 1) setAddressId(String(list[0].id));
    } catch {
      setAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  }, [getValidToken]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Carregar dados de pagamento da sessionStorage se existirem (para sobreviver a refresh)
  useEffect(() => {
    const storedPaymentData = sessionStorage.getItem('checkout_payment_data');
    const storedOrderId = sessionStorage.getItem('checkout_order_id');
    const storedShowPayment = sessionStorage.getItem('checkout_show_payment');
    const storedPaymentMethod = sessionStorage.getItem('checkout_payment_method');

    if (storedPaymentData && storedOrderId && storedShowPayment === 'true') {
      const expiryTime = parseInt(sessionStorage.getItem('checkout_expiry_time') || '0', 10);
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((expiryTime - now) / 1000));

      if (remaining <= 0) {
        // Já expirou
        setQrExpired(true);
        sessionStorage.removeItem('checkout_payment_data');
        sessionStorage.removeItem('checkout_order_id');
        sessionStorage.removeItem('checkout_show_payment');
        sessionStorage.removeItem('checkout_payment_method');
        sessionStorage.removeItem('checkout_expiry_time');
      } else {
        // Ainda tem tempo
        setPaymentData(JSON.parse(storedPaymentData));
        setOrderId(storedOrderId);
        setShowPaymentSection(true);
        setPaymentMethod(storedPaymentMethod || 'pix');
        setTimeLeft(remaining);
        setQrExpired(false);

        // Continuar contador sem reiniciar
        const timer = setInterval(() => {
          setTimeLeft((prev) => {
            const currentTime = Date.now();
            const timeRemaining = Math.max(0, Math.ceil((expiryTime - currentTime) / 1000));
            
            if (timeRemaining <= 0) {
              setQrExpired(true);
              setProcessingPayment(false);
              setSubmitting(false);
              clearInterval(timer);
              setPaymentTimer(null);
              setShowPaymentSection(false);
              setPaymentData(null);
              setPaymentStatus(null);
              setOrderCode('');
              sessionStorage.removeItem('checkout_payment_data');
              sessionStorage.removeItem('checkout_order_id');
              sessionStorage.removeItem('checkout_show_payment');
              sessionStorage.removeItem('checkout_payment_method');
              sessionStorage.removeItem('checkout_expiry_time');
              return 0;
            }
            return timeRemaining;
          });
        }, 1000);
        setPaymentTimer(timer);

        // Se for PIX, retomar verificação de status
        if (storedPaymentMethod === 'pix') {
          const pagamentoId = JSON.parse(storedPaymentData).pagamento_id;
          if (pagamentoId) {
            getValidToken().then((token) => {
              if (token) {
                const interval = setInterval(() => {
                  checkPaymentStatus(pagamentoId, token);
                }, 5000);
                setStatusCheckInterval(interval);
              }
            });
          }
        }
      }
    }
  }, [getValidToken]);

  const loadCoupons = useCallback(async () => {
    setCouponsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/coupons/`);
      const list = Array.isArray(res.data) ? res.data : res.data.results || [];
      setAvailableCoupons(list);
    } catch {
      setAvailableCoupons([]);
    } finally {
      setCouponsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  // Limpar erro de duplicação quando o carrinho muda
  useEffect(() => {
    setDuplicateOrderError('');
  }, [cartItems]);

  // Limpa o intervalo e timer quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
      if (paymentTimer) {
        clearTimeout(paymentTimer);
      }
    };
  }, [statusCheckInterval, paymentTimer]);

  const quoteFromCep = useCallback(async (cepRaw) => {
    setShippingErr('');
    setShippingLoading(true);
    setShippingFee(null);
    try {
      const res = await axios.post(`${API_URL}/checkout/shipping/`, {
        cep: cepRaw,
      });
      const fee = parseFloat(res.data.shipping_fee);
      setShippingFee(Number.isFinite(fee) ? fee : null);
    } catch (e) {
      const d = e.response?.data?.detail;
      setShippingErr(typeof d === 'string' ? d : 'Não foi possível calcular o frete.');
      setShippingFee(null);
    } finally {
      setShippingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (useNewAddress) return;
    const sel = addresses.find((a) => String(a.id) === String(addressId));
    if (sel?.cep) quoteFromCep(sel.cep);
    else {
      setShippingFee(null);
      setShippingErr('');
    }
  }, [addressId, addresses, useNewAddress, quoteFromCep]);

  const handleDeliveryChange = (e) => {
    const { name, value } = e.target;
    setDelivery((prev) => ({ ...prev, [name]: value }));
  };

  const checkForDuplicateOrder = async (token) => {
    // Verifica no backend se o pedido atual já existe em Minhas Compras
    try {
      const res = await axios.post(
        `${API_URL}/me/orders/check-duplicate/`,
        {
          items: cartItems.map((item) => ({
            product_id: item.id,
            quantity: item.quantity || 1,
          })),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = res.data;
      if (data.duplicate) {
        return {
          hasDuplicate: true,
          message: data.message || `Este pedido já existe em "Minhas Compras" (${data.order_code || data.order_id}).`,
          orderId: data.order_id,
          orderCode: data.order_code,
        };
      }

      console.log('✅ Nenhum pedido duplicado');
      return { hasDuplicate: false, message: '', orderId: null, orderCode: null };
    } catch (err) {
      console.error('❌ Erro ao verificar pedido duplicado:', err);
      return { hasDuplicate: false, message: '', orderId: null, orderCode: null };
    }
  };

  const handleProcessPayment = async () => {
    // Processa o pagamento via API
    try {
      setProcessingPayment(true);
      setPaymentError('');
      
      const token = await getValidToken();
      if (!token) {
        navigate('/login');
        return;
      }

      // 1) Cria o pedido (pendente) no backend
      const orderItems = cartItems.map((item) => ({
        product_id: item.id,
        quantity: item.quantity || 1,
      }));

      const notes = customerNotes.slice(0, 500);
      const orderBody = {
  items: orderItems,
  payment_method: paymentMethod,
  customer_notes: notes,
  cpf: appliedCpf,
};
      if (appliedCoupon?.code) {
        orderBody.coupon_code = appliedCoupon.code.toUpperCase();
      }
      if (useNewAddress) {
        orderBody.delivery = delivery;
      } else {
        orderBody.address_id = parseInt(addressId, 10);
      }

      const orderRes = await axios.post(`${API_URL}/checkout/place/`, orderBody, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const createdOrder = orderRes.data;
      setOrderId(createdOrder.id);
      setOrderCode(createdOrder.public_code || `#${createdOrder.id}`);
      try {
        const raw = localStorage.getItem('unseen_order_ids');
        const prev = raw ? JSON.parse(raw) : [];
        const next = Array.isArray(prev) ? prev.map(String) : [];
        const orderKey = String(createdOrder.id);
        if (!next.includes(orderKey)) next.push(orderKey);
        localStorage.setItem('unseen_order_ids', JSON.stringify(next));
      } catch {
        /* ignore */
      }

      // Prepara dados do pagamento
      const items = cartItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity || 1,
        price: String(item.price),
      }));

      // Formata o valor do pedido vindo do backend
      const valorFormatado = parseFloat(createdOrder.total).toFixed(2);
      
      console.log(`💰 Valor final: ${valorFormatado} (${valorFormatado.length} caracteres)`);

      const paymentPayload = {
  valor: valorFormatado,
  metodo_pagamento: paymentMethod,
  items: items,
  descricao: `Pedido ${createdOrder.public_code || createdOrder.id} (${cartItems.length} item(ns))`,
  pedido_id: String(createdOrder.id),
  cpf: cpf,
};

      console.log(' Enviando pagamento:', paymentPayload);

      // Chama a API de pagamento
      const res = await axios.post(`${API_URL}/pagamentos/`, paymentPayload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(' Resposta do backend:', res.data);

      const pagamento = res.data;
      setPaymentData(pagamento);
      setShowPaymentSection(true);
      setTimeLeft(30);
      setQrExpired(false);

      // Salvar timestamp de início na sessionStorage
      const expiryTime = Date.now() + 30000; // 30 segundos a partir de agora
      
      // Persistir dados do pagamento na sessionStorage para sobreviver a refresh
      sessionStorage.setItem('checkout_payment_data', JSON.stringify(pagamento));
      sessionStorage.setItem('checkout_order_id', String(createdOrder.id));
      sessionStorage.setItem('checkout_show_payment', 'true');
      sessionStorage.setItem('checkout_payment_method', paymentMethod);
      sessionStorage.setItem('checkout_expiry_time', expiryTime);

      // Iniciar contador visível de expiração do QR code (30 segundos)
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          const now = Date.now();
          const remaining = Math.max(0, Math.ceil((expiryTime - now) / 1000));
          
          if (remaining <= 0) {
            // Expirou
            setQrExpired(true);
            setProcessingPayment(false); // Permitir novo clique
            setSubmitting(false); // Permitir novo clique
            clearInterval(timer);
            setPaymentTimer(null);
            // Permitir mudar para novo estado para reiniciar tudo
            setShowPaymentSection(false);
            setPaymentData(null);
            setPaymentStatus(null);
            setOrderCode('');
            return 0;
          }
          return remaining;
        });
      }, 1000);
      setPaymentTimer(timer);

      // Se for PIX, começa a verificar o status
      if (paymentMethod === 'pix') {
        // Verifica status a cada 5 segundos
        const interval = setInterval(() => {
          checkPaymentStatus(pagamento.pagamento_id, token);
        }, 5000);
        setStatusCheckInterval(interval);
      }
    } catch (err) {
      console.error('❌ Erro ao processar pagamento:', err);
      const d = err.response?.data;
      
      // Melhor tratamento de erro
      let msg = 'Erro ao processar pagamento. Tente novamente.';
      if (typeof d?.erro === 'string') {
        msg = d.erro;
      } else if (typeof d?.detail === 'string') {
        msg = d.detail;
      } else if (typeof d?.message === 'string') {
        msg = d.message;
      } else if (d && typeof d === 'object') {
        // Se houver erros de validação em campos específicos
        const firstKey = Object.keys(d)[0];
        if (Array.isArray(d[firstKey])) {
          msg = `${firstKey}: ${d[firstKey][0]}`;
        } else if (typeof d[firstKey] === 'string') {
          msg = `${firstKey}: ${d[firstKey]}`;
        }
      }
      
      console.error('💥 Mensagem de erro:', msg);
      setPaymentError(msg);
    } finally {
      setProcessingPayment(false);
    }
  };

  const checkPaymentStatus = async (pagamentoId, token) => {
    // Verifica o status do pagamento
    try {
      setCheckingStatus(true);
      const res = await axios.get(`${API_URL}/pagamentos/${pagamentoId}/status/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const status = res.data.status;
      setPaymentStatus(status);

      // Se o pagamento foi aprovado
      if (status === 'aprovado') {
        clearInterval(statusCheckInterval);
        setStatusCheckInterval(null);
        if (paymentTimer) {
          clearInterval(paymentTimer);
          setPaymentTimer(null);
        }
        setQrExpired(false); // Reset
        
        // Limpar dados persistidos da sessionStorage
        sessionStorage.removeItem('checkout_payment_data');
        sessionStorage.removeItem('checkout_order_id');
        sessionStorage.removeItem('checkout_show_payment');
        sessionStorage.removeItem('checkout_payment_method');
        
        clearCart();
        alert(`Pagamento aprovado! Pedido ${orderCode || ''} atualizado.`);
        navigate('/minha-conta?secao=compras&sub=pedidos');
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const copyPixCode = () => {
    // Copia o código PIX para a área de transferência
    if (paymentData?.copia_cola) {
      navigator.clipboard.writeText(paymentData.copia_cola);
      setCopyFeedback('Código copiado!');
      setTimeout(() => setCopyFeedback(''), 2000);
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setFormError('');
    setDuplicateOrderError('');
    if (!cartItems.length) {
      navigate('/catalogo');
      return;
    }
    if (shippingFee == null) {
      setFormError('Calcule o frete antes de finalizar.');
      return;
    }

    // Verificar se existe pedido duplicado
    const token = await getValidToken();
    if (token) {
      const duplicateCheck = await checkForDuplicateOrder(token);
      if (duplicateCheck.hasDuplicate) {
        setDuplicateOrderError(duplicateCheck.message);
        setDuplicateOrderId(duplicateCheck.orderId);
        return;
      }
    }

    // Chama o processamento de pagamento
    await handleProcessPayment();
  };

  const applyCouponByCode = useCallback((rawCode) => {
    const normalized = String(rawCode || '').trim().toUpperCase();
    if (!normalized) {
      setAppliedCoupon(null);
      setCouponCode('');
      setCouponFeedback('Informe um código para aplicar.');
      return;
    }

    const found = availableCoupons.find((c) => String(c.code || '').toUpperCase() === normalized);
    if (!found) {
      setAppliedCoupon(null);
      setCouponFeedback('Cupom não encontrado.');
      return;
    }
    if (!isCouponActive(found)) {
      setAppliedCoupon(null);
      setCouponFeedback('Cupom expirado ou indisponível.');
      return;
    }
    if (!isCouponApplicableToCart(found)) {
      setAppliedCoupon(null);
      setCouponFeedback('Este cupom não se aplica aos produtos do seu carrinho.');
      return;
    }

    setCouponCode(normalized);
    setAppliedCoupon(found);
    setCouponFeedback(`Cupom ${normalized} aplicado com sucesso.`);
  }, [availableCoupons, isCouponApplicableToCart]);

  useEffect(() => {
    if (!appliedCoupon) return;
    const stillApplicable = isCouponActive(appliedCoupon) && isCouponApplicableToCart(appliedCoupon);
    if (!stillApplicable) {
      setAppliedCoupon(null);
      setCouponFeedback('Cupom removido: não se aplica mais ao carrinho atual.');
    }
  }, [cartItems, appliedCoupon]);

  if (!cartItems.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <p className="text-lg text-gray-600 mb-4">Seu carrinho está vazio.</p>
        <Link to="/catalogo" className="text-cereon-green font-semibold hover:underline">
          Ir ao catálogo
        </Link>
      </div>
    );
  }

  const grandTotal = discountedSubtotal + (shippingFee || 0);

  return (
    <div className="min-h-screen bg-cereon-light/30 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-cereon-green font-medium mb-6 hover:text-cereon-dark"
        >
          <ArrowLeft size={20} />
          Voltar
        </button>

        <h1 className="text-3xl font-bold text-cereon-dark mb-2">Finalizar compra</h1>
        <p className="text-sm text-gray-600 mb-8">
          Valores dos produtos e frete são calculados no servidor; não altere totais manualmente.
          Observações são tratadas como texto simples (sem HTML).
        </p>

        <form onSubmit={handlePlaceOrder} className="space-y-10">
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
          >
            <h2 className="text-lg font-bold text-cereon-dark flex items-center gap-2 mb-4">
              <Package className="text-cereon-green" size={22} />
              Itens
            </h2>
            <ul className="divide-y divide-gray-100">
              {cartItems.map((item) => (
                <li key={item.itemId} className="py-3 flex gap-3">
                  <img
                    src={item.image_url || item.image || '/imgs/cereon.webp'}
                    alt=""
                    className="w-16 h-16 object-cover rounded-lg bg-gray-100"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-cereon-dark line-clamp-2">{item.name}</p>
                    {(item.selectedSize || item.selectedColor) && (
                      <p className="text-xs text-gray-500">
                        {[item.selectedSize, item.selectedColor].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {/* Preço unitário - mostra desconto quando aplicável */}
                    <div className="text-sm text-gray-600">
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
                          <span className="flex items-center gap-1">
                            Qtd {item.quantity} ×
                            <span className="line-through text-gray-400">R$ {formatMoney(originalPrice)}</span>
                            <span className="text-red-600 font-semibold">R$ {formatMoney(currentPrice)}</span>
                            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Promoção</span>
                          </span>
                        ) : (
                          <span>Qtd {item.quantity} × R$ {formatMoney(currentPrice)}</span>
                        );
                      })()}
                    </div>
                    <p className="text-xs text-gray-500">
                      Subtotal do item: R$ {formatMoney((parseFloat(item.price) || 0) * (item.quantity || 1))}
                      {(() => {
                        const hasPromotion = item.has_promotion === true;
                        const originalPrice = parseFloat(item.original_price);
                        const currentPrice = parseFloat(item.price);
                        const hasValidDiscount = hasPromotion && 
                                                Number.isFinite(originalPrice) && 
                                                Number.isFinite(currentPrice) && 
                                                originalPrice > currentPrice && 
                                                currentPrice > 0;
                        
                        if (hasValidDiscount) {
                          return (
                            <span className="text-red-600 ml-1">
                              (Economia: R$ {formatMoney((originalPrice - currentPrice) * item.quantity)})
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </p>
                    {appliedCoupon && (
                      <p className={`text-xs ${getItemDiscount(item, appliedCoupon) > 0 ? 'text-green-700' : 'text-gray-500'}`}>
                        {getItemDiscount(item, appliedCoupon) > 0
                          ? `Desconto (${appliedCoupon.code}) aplicado neste item: -R$ ${formatMoney(getItemDiscount(item, appliedCoupon))}`
                          : `Cupom ${appliedCoupon.code} não se aplica a este item`}
                      </p>
                    )}
                  </div>
                  <div className="text-right whitespace-nowrap">
                    {(() => {
                      const hasPromotion = item.has_promotion === true;
                      const originalPrice = parseFloat(item.original_price);
                      const currentPrice = parseFloat(item.price);
                      const hasValidDiscount = hasPromotion && 
                                              Number.isFinite(originalPrice) && 
                                              Number.isFinite(currentPrice) && 
                                              originalPrice > currentPrice && 
                                              currentPrice > 0;
                      
                      return (
                        <>
                          <p className={`font-semibold ${hasValidDiscount ? 'text-red-600' : 'text-cereon-green'}`}>
                            R$ {formatMoney(currentPrice * item.quantity)}
                          </p>
                          {hasValidDiscount && (
                            <p className="text-xs text-gray-400 line-through">
                              R$ {formatMoney(originalPrice * item.quantity)}
                            </p>
                          )}
                        </>
                      );
                    })()}
                    {appliedCoupon && getItemDiscount(item, appliedCoupon) > 0 && (
                      <p className="text-xs text-green-700">
                        Total com desconto: R$ {formatMoney(((parseFloat(item.price) || 0) * (item.quantity || 1)) - getItemDiscount(item, appliedCoupon))}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-right font-semibold text-cereon-dark mt-4">
              Subtotal: R$ {formatMoney(subtotal)}
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
          >
            <h2 className="text-lg font-bold text-cereon-dark flex items-center gap-2 mb-4">
              <MapPin className="text-cereon-green" size={22} />
              Entrega
            </h2>


              {/* CPF do Cliente */}
<div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
  <h3 className="text-lg font-bold text-cereon-dark mb-3">
    CPF do Comprador
  </h3>

  <div className="flex flex-col sm:flex-row gap-3">
    <input
      type="text"
      value={cpf}
      onChange={(e) => {
        setCpf(e.target.value);
        setCpfFeedback('');
      }}
      placeholder="000.000.000-00"
      className="flex-1 border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-cereon-green outline-none"
    />

    <button
      type="button"
      onClick={() => {
        const cpfDigits = cpf.replace(/\D/g, '');

        if (cpfDigits.length !== 11) {
          setCpfFeedback('CPF inválido.');
          setAppliedCpf('');
          return;
        }

        setAppliedCpf(cpf);
        setCpfFeedback('CPF aplicado com sucesso.');
      }}
      className="px-5 py-3 bg-cereon-green text-white rounded-lg font-semibold hover:opacity-90 transition"
    >
      Aplicar
    </button>
  </div>

  {cpfFeedback && (
    <p
      className={`text-sm mt-2 ${
        cpfFeedback.includes('sucesso')
          ? 'text-green-600'
          : 'text-red-600'
      }`}
    >
      {cpfFeedback}
    </p>
  )}

  <p className="text-xs text-gray-500 mt-2">
    O CPF será utilizado para faturamento e pagamento do pedido.
  </p>
</div>

            <label className="flex items-center gap-2 mb-4 text-sm">
              <input
                type="checkbox"
                checked={useNewAddress}
                onChange={(e) => {
                  setUseNewAddress(e.target.checked);
                  setShippingFee(null);
                  setShippingErr('');
                }}
              />
              Usar endereço novo (não salvo na conta)
            </label>

            {!useNewAddress ? (
              <div>
                {loadingAddresses ? (
                  <p className="text-gray-500 text-sm">Carregando endereços…</p>
                ) : addresses.length === 0 ? (
                  <p className="text-sm text-amber-700 mb-2">
                    Nenhum endereço salvo. Marque a opção acima ou cadastre em Minha conta.
                  </p>
                ) : (
                  <select
                    value={addressId}
                    onChange={(e) => setAddressId(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 mb-2"
                    required={!useNewAddress}
                  >
                    <option value="">Selecione</option>
                    {addresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label} — {a.street}, {a.number} — {a.city}/{a.state} — CEP {a.cep}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  name="cep"
                  placeholder="CEP"
                  value={delivery.cep}
                  onChange={handleDeliveryChange}
                  className="border-2 border-gray-200 rounded-lg px-3 py-2"
                />
                <input
                  name="street"
                  placeholder="Logradouro"
                  value={delivery.street}
                  onChange={handleDeliveryChange}
                  className="border-2 border-gray-200 rounded-lg px-3 py-2 sm:col-span-2"
                />
                <input
                  name="number"
                  placeholder="Número"
                  value={delivery.number}
                  onChange={handleDeliveryChange}
                  className="border-2 border-gray-200 rounded-lg px-3 py-2"
                />
                <input
                  name="complement"
                  placeholder="Complemento"
                  value={delivery.complement}
                  onChange={handleDeliveryChange}
                  className="border-2 border-gray-200 rounded-lg px-3 py-2"
                />
                <input
                  name="neighborhood"
                  placeholder="Bairro"
                  value={delivery.neighborhood}
                  onChange={handleDeliveryChange}
                  className="border-2 border-gray-200 rounded-lg px-3 py-2"
                />
                <input
                  name="city"
                  placeholder="Cidade"
                  value={delivery.city}
                  onChange={handleDeliveryChange}
                  className="border-2 border-gray-200 rounded-lg px-3 py-2"
                />
                <input
                  name="state"
                  placeholder="UF"
                  maxLength={2}
                  value={delivery.state}
                  onChange={handleDeliveryChange}
                  className="border-2 border-gray-200 rounded-lg px-3 py-2 uppercase"
                />
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  useNewAddress
                    ? quoteFromCep(delivery.cep)
                    : quoteFromCep(addresses.find((a) => String(a.id) === String(addressId))?.cep)
                }
                disabled={shippingLoading}
                className="px-4 py-2 bg-cereon-dark text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {shippingLoading ? 'Calculando…' : 'Calcular / atualizar frete'}
              </button>
              {shippingErr && <span className="text-sm text-red-600">{shippingErr}</span>}
              {shippingFee != null && !shippingErr && (
                <span className="text-sm font-semibold text-cereon-green flex items-center gap-1">
                  <Truck size={16} />
                  Frete: R$ {formatMoney(shippingFee)}
                </span>
              )}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
          >
            <h2 className="text-lg font-bold text-cereon-dark flex items-center gap-2 mb-4">
              <CreditCard className="text-cereon-green" size={22} />
              Pagamento (simulado)
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Nenhum dado de cartão é enviado; apenas o método escolhido é registrado no pedido.
            </p>
            {Object.entries(PAYMENT_LABELS).map(([key, label]) => (
              <label key={key} className="flex items-start gap-2 mb-2 cursor-pointer">
                <input
                  type="radio"
                  name="pay"
                  value={key}
                  checked={paymentMethod === key}
                  onChange={() => setPaymentMethod(key)}
                />
                <span className="text-sm text-cereon-dark">{label}</span>
              </label>
            ))}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
          >
            <h2 className="text-lg font-bold text-cereon-dark flex items-center gap-2 mb-4">
              <MessageSquare className="text-cereon-green" size={22} />
              Observações
            </h2>
            <textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value.slice(0, 500))}
              maxLength={500}
              rows={4}
              placeholder="Instruções de entrega, referência do prédio, etc. (máx. 500 caracteres)"
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">{customerNotes.length}/500</p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }}
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
          >
            <h2 className="text-lg font-bold text-cereon-dark flex items-center gap-2 mb-4">
              <Package className="text-cereon-green" size={22} />
              Cupom
            </h2>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[220px] relative">
                <input
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setAppliedCoupon(null);
                    setCouponFeedback('');
                  }}
                  placeholder="Código do cupom (opcional)"
                  className={`w-full border-2 rounded-lg px-3 py-2 pr-10 ${appliedCoupon ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                />
                {appliedCoupon && (
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    title="Remover cupom"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => applyCouponByCode(couponCode)}
                className="px-4 py-2 bg-cereon-green text-white rounded-lg text-sm font-semibold hover:bg-green-600"
              >
                Aplicar
              </button>
              <p className="text-xs text-gray-500">
                O cupom é validado no checkout (produtos elegíveis, validade, limite e 1 uso por CPF).
              </p>
            </div>
            {couponFeedback && (
              <p className={`text-sm mt-3 ${appliedCoupon ? 'text-green-700' : 'text-amber-700'}`}>
                {couponFeedback}
              </p>
            )}
            <div className="mt-4">
              <p className="text-sm font-semibold text-cereon-dark mb-2">Cupons disponíveis para este carrinho</p>
              {couponsLoading ? (
                <p className="text-sm text-gray-500">Carregando cupons...</p>
              ) : applicableCoupons.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum cupom aplicável aos itens atuais.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {applicableCoupons.map((coupon) => (
                    <button
                      key={coupon.id}
                      type="button"
                      onClick={() => applyCouponByCode(coupon.code)}
                      className={`px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                        appliedCoupon?.id === coupon.id
                          ? 'bg-cereon-green text-white border-cereon-green'
                          : 'bg-white text-cereon-dark border-cereon-green/40 hover:bg-cereon-light'
                      }`}
                    >
                      {coupon.code} - {coupon.discount_percent}% OFF
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
          >
            <h2 className="text-lg font-bold text-cereon-dark flex items-center gap-2 mb-4">
              <CreditCard className="text-cereon-green" size={22} />
              Resumo do Pagamento
            </h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-sm text-blue-800">
              <p>
                Clique em "Confirmar pedido" para processar o pagamento via Mercado Pago.
                Você receberá um QR Code ou dados de pagamento para confirmar a transação.
              </p>
            </div>

            {duplicateOrderError && (
              <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-5 mb-4 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="text-3xl flex-shrink-0">⚠️</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-amber-900 text-lg mb-2">Pedido Duplicado Detectado</h3>
                    <p className="text-amber-800 mb-4">
                      {duplicateOrderError}
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => navigate('/minha-conta?secao=compras&sub=pedidos')}
                        className="px-5 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors flex items-center gap-2"
                      >
                        📋 Ver Pedido Existente
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDuplicateOrderError('');
                          setDuplicateOrderId(null);
                        }}
                        className="px-5 py-2 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showPaymentSection && paymentData && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-2 border-cereon-green/30 rounded-lg p-6 bg-green-50"
              >
                <div className="flex items-center gap-2 mb-4 text-cereon-green font-bold">
                  <CheckCircle size={20} />
                  Pagamento processado!
                </div>

                {!qrExpired && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-center">
                    <p className="text-red-700 font-semibold">
                      QR Code expira em: <span className="text-xl font-bold">{timeLeft}</span> segundos
                    </p>
                  </div>
                )}

                {paymentMethod === 'pix' && paymentData.qr_code_base64 && (
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg inline-block">
                      <img 
                        src={paymentData.qr_code_base64} 
                        alt="QR Code PIX" 
                        className="w-48 h-48"
                      />
                      {qrExpired && (
                        <p className="text-center text-red-600 font-semibold mt-2">
                          QR Code expirado. Confirme o pedido novamente para gerar um novo.
                        </p>
                      )}
                    </div>

                    <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                      <p className="text-xs text-gray-600 mb-2">Código PIX (Cópia e Cola):</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-100 p-2 rounded text-xs overflow-auto">
                          {paymentData.copia_cola}
                        </code>
                        <button
                          type="button"
                          onClick={copyPixCode}
                          className="px-3 py-2 bg-cereon-green text-white rounded-lg text-sm font-semibold hover:bg-green-600 flex items-center gap-1"
                        >
                          <Copy size={16} />
                          Copiar
                        </button>
                      </div>
                      {copyFeedback && (
                        <p className="text-xs text-green-600 mt-2">{copyFeedback}</p>
                      )}
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                      <p className="flex items-center gap-2 mb-2">
                        <Clock size={16} />
                        <strong>Próximo passo:</strong>
                      </p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Abra seu app de banco ou Mercado Pago</li>
                        <li>Escaneie o QR Code ou copie o código acima</li>
                        <li>Confirme o pagamento de R$ {formatMoney(grandTotal)}</li>
                        <li>Assim que confirmar, seu pedido será criado automaticamente</li>
                      </ol>
                    </div>

                    {checkingStatus && (
                      <p className="text-sm text-gray-600 text-center">
                        Verificando status do pagamento...
                      </p>
                    )}

                    {paymentStatus === 'aprovado' && (
                      <div className="bg-green-100 border border-green-400 rounded-lg p-4 text-green-700 flex items-center gap-2">
                        <CheckCircle size={20} />
                        <span className="font-semibold">Pagamento aprovado com sucesso!</span>
                      </div>
                    )}

                    {paymentError && (
                      <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                        {paymentError}
                      </p>
                    )}
                  </div>
                )}

                {paymentMethod === 'boleto' && (
                  <div className="space-y-4">
                    <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Boleto:</p>
                      <code className="text-sm bg-gray-100 p-2 rounded block">
                        Código do boleto será exibido aqui
                      </code>
                    </div>
                    <p className="text-sm text-gray-600">
                      Você terá 3 dias úteis para pagar o boleto.
                    </p>
                  </div>
                )}

                {paymentMethod === 'cartao' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                    <p>Dados do cartão são processados de forma segura pelo Mercado Pago.</p>
                  </div>
                )}
              </motion.div>
            )}
          </motion.section>

          <div className="bg-white rounded-xl border-2 border-cereon-green/40 p-6 shadow-sm">
            <div className="flex justify-between text-cereon-dark mb-2">
              <span>Subtotal</span>
              <span>R$ {formatMoney(subtotal)}</span>
            </div>
            {/* Mostrar economia com promoções se houver */}
            {(() => {
              const promoSavings = cartItems.reduce((acc, item) => {
                const hasPromotion = item.has_promotion === true;
                const originalPrice = parseFloat(item.original_price);
                const currentPrice = parseFloat(item.price);
                const hasValidDiscount = hasPromotion && 
                                        Number.isFinite(originalPrice) && 
                                        Number.isFinite(currentPrice) && 
                                        originalPrice > currentPrice && 
                                        currentPrice > 0;
                
                if (hasValidDiscount) {
                  const saving = (originalPrice - currentPrice) * item.quantity;
                  return acc + saving;
                }
                return acc;
              }, 0);
              if (promoSavings > 0) {
                return (
                  <div className="flex justify-between text-red-600 mb-2 text-sm">
                    <span>Economia em promoções</span>
                    <span>- R$ {formatMoney(promoSavings)}</span>
                  </div>
                );
              }
              return null;
            })()}
            <div className="flex justify-between text-cereon-dark mb-2">
              <span>Desconto {appliedCoupon ? `(${appliedCoupon.code})` : ''}</span>
              <span>- R$ {formatMoney(appliedDiscount)}</span>
            </div>
            <div className="flex justify-between text-cereon-dark mb-2">
              <span>Frete</span>
              <span>R$ {formatMoney(shippingFee || 0)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-cereon-green pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>R$ {formatMoney(grandTotal)}</span>
            </div>
            {formError && (
              <p className="text-sm text-red-600 mt-4" role="alert">
                {formError}
              </p>
            )}
            {paymentError && (
              <div className="text-sm bg-red-50 text-red-700 mt-4 p-3 rounded-lg border border-red-200" role="alert">
                <strong>❌ Erro:</strong> {paymentError}
              </div>
            )}
            {!showPaymentSection || qrExpired ? (
              <button
                type="submit"
                disabled={submitting || shippingFee == null || processingPayment || !!duplicateOrderError}
                className="w-full mt-6 py-3 rounded-lg bg-cereon-green text-white font-bold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingPayment ? 'Processando pagamento…' : submitting ? 'Processando…' : 'Confirmar pedido'}
              </button>
            ) : null}
          </div>
        </form>

        <p className="text-xs text-gray-500 mt-6">
          Logado como {user?.email}. O pedido ficará visível em Minha conta.
        </p>
      </div>
    </div>
  );
}
