import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, MapPin, Truck, CreditCard, MessageSquare } from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000/api';

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
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const subtotal = getTotal();

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

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!cartItems.length) {
      navigate('/catalogo');
      return;
    }
    if (shippingFee == null) {
      setFormError('Calcule o frete antes de finalizar.');
      return;
    }

    const token = await getValidToken();
    if (!token) {
      navigate('/login');
      return;
    }

    const items = cartItems.map((item) => ({
      product_id: item.id,
      quantity: item.quantity || 1,
    }));

    const notes = customerNotes.slice(0, 500);
    const body = {
      items,
      payment_method: paymentMethod,
      customer_notes: notes,
    };

    if (useNewAddress) {
      body.delivery = delivery;
    } else {
      if (!addressId) {
        setFormError('Selecione um endereço ou preencha um novo.');
        return;
      }
      body.address_id = parseInt(addressId, 10);
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/checkout/place/`, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      clearCart();
      const code = res.data.public_code || `#${res.data.id}`;
      alert(
        `Pedido ${code} registrado com sucesso. Você tem 24 horas para pagar; depois o pedido será removido automaticamente.\n\nPagamento: ${PAYMENT_LABELS[paymentMethod] || paymentMethod}.`
      );
      navigate('/minha-conta?secao=compras&sub=pedidos');
    } catch (err) {
      const d = err.response?.data;
      const msg =
        typeof d?.detail === 'string'
          ? d.detail
          : 'Não foi possível concluir o pedido. Tente novamente.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

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

  const grandTotal = subtotal + (shippingFee || 0);

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
                    <p className="text-sm text-gray-600">
                      Qtd {item.quantity} × R$ {formatMoney(item.price)}
                    </p>
                  </div>
                  <p className="font-semibold text-cereon-green whitespace-nowrap">
                    R$ {formatMoney(parseFloat(item.price) * item.quantity)}
                  </p>
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

          <div className="bg-white rounded-xl border-2 border-cereon-green/40 p-6 shadow-sm">
            <div className="flex justify-between text-cereon-dark mb-2">
              <span>Subtotal</span>
              <span>R$ {formatMoney(subtotal)}</span>
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
            <button
              type="submit"
              disabled={submitting || shippingFee == null}
              className="w-full mt-6 py-3 rounded-lg bg-cereon-green text-white font-bold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Processando…' : 'Confirmar pedido'}
            </button>
          </div>
        </form>

        <p className="text-xs text-gray-500 mt-6">
          Logado como {user?.email}. O pedido ficará visível em Minha conta.
        </p>
      </div>
    </div>
  );
}
