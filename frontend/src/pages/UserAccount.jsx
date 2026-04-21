import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  User,
  MapPin,
  Shield,
  ShoppingBag,
  Tag,
  Loader2,
  Trash2,
  Plus,
  Home,
  Eye,
  Copy,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://127.0.0.1:8000/api';

const NAV = [
  { id: 'dados', label: 'Dados pessoais', icon: User },
  { id: 'enderecos', label: 'Endereços', icon: MapPin },
  { id: 'seguranca', label: 'Conta e segurança', icon: Shield },
  { id: 'compras', label: 'Minhas compras', icon: ShoppingBag },
  { id: 'cupons', label: 'Cupons', icon: Tag },
];

const ORDER_STATUS_LABEL = {
  pendente: 'Aguardando pagamento',
  pago: 'Pago',
  expirado: 'Expirado',
  confirmado: 'Confirmado',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

// Mapa de cores e labels curtos para badges de status
const STATUS_BADGE_CONFIG = {
  pendente: { color: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendente', border: 'border-yellow-300' },
  pago: { color: 'bg-green-100', text: 'text-green-800', label: 'Pago', border: 'border-green-300' },
  expirado: { color: 'bg-red-100', text: 'text-red-800', label: 'Expirado', border: 'border-red-300' },
  confirmado: { color: 'bg-blue-100', text: 'text-blue-800', label: 'Confirmado', border: 'border-blue-300' },
  enviado: { color: 'bg-blue-100', text: 'text-blue-800', label: 'Enviado', border: 'border-blue-300' },
  entregue: { color: 'bg-green-100', text: 'text-green-800', label: 'Entregue', border: 'border-green-300' },
  cancelado: { color: 'bg-red-100', text: 'text-red-800', label: 'Cancelado', border: 'border-red-300' },
};

function StatusBadge({ status }) {
  const config = STATUS_BADGE_CONFIG[status] || STATUS_BADGE_CONFIG.pendente;
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${config.color} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  );
}

function formatOrderItemsLine(order) {
  const items = order.items;
  if (!items || !items.length) return '—';
  return items
    .map((it) => {
      const name = it.product?.name || 'Produto';
      return `${it.quantity}× ${name}`;
    })
    .join(', ');
}

function getOrderPricingBreakdown(order, coupon) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const subtotal = items.reduce((acc, it) => acc + (parseFloat(it?.subtotal) || 0), 0);
  const shipping = parseFloat(order?.shipping_fee) || 0;
  const total = parseFloat(order?.total) || 0;
  if (!coupon) {
    return { subtotal, shipping, total, discount: Math.max(0, subtotal + shipping - total), itemDiscounts: {} };
  }

  const pct = Number(coupon.discount_percent || 0) / 100;
  const eligibleIds = Array.isArray(coupon.eligible_products) ? coupon.eligible_products.map(Number) : [];
  const itemDiscounts = {};
  let discount = 0;
  for (const it of items) {
    const pid = Number(it?.product?.id);
    const lineSubtotal = parseFloat(it?.subtotal) || 0;
    const applies = eligibleIds.length === 0 || eligibleIds.includes(pid);
    const lineDiscount = applies ? Number((lineSubtotal * pct).toFixed(2)) : 0;
    itemDiscounts[pid] = lineDiscount;
    discount += lineDiscount;
  }
  const maxDiscount = Math.max(0, subtotal);
  discount = Math.min(maxDiscount, Number(discount.toFixed(2)));
  return { subtotal, shipping, total, discount, itemDiscounts };
}

async function loadAllPages(url, headers = null) {
  let all = [];
  let next = url;
  const cfg = headers ? { headers } : {};
  while (next) {
    const res = await axios.get(next, cfg);
    const data = res.data;
    if (data.results) {
      all = [...all, ...data.results];
      next = data.next;
    } else if (Array.isArray(data)) {
      all = data;
      break;
    } else {
      break;
    }
  }
  return all;
}

export function UserAccount() {
  const { getValidToken, logout, user, updateUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [section, setSection] = useState('dados');
  const [comprasTab, setComprasTab] = useState('pedidos');
  const [ordersFilter, setOrdersFilter] = useState('pendentes');
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState({
    full_name: '',
    cpf: '',
    phone: '',
    email: '',
  });
  const [initialCpf, setInitialCpf] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [unseenOrderIds, setUnseenOrderIds] = useState([]);
  const [paymentsByOrder, setPaymentsByOrder] = useState({});
  const [paymentDetailsByOrder, setPaymentDetailsByOrder] = useState({});
  const [selectedOrderId, setSelectedOrderId] = useState('');

  const [addrForm, setAddrForm] = useState({
    label: 'Principal',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    is_default: false,
  });
  const [addrErr, setAddrErr] = useState('');
  const [editingAddressId, setEditingAddressId] = useState(null);

  const [pwdForm, setPwdForm] = useState({ old_password: '', new_password: '' });
  const [emailForm, setEmailForm] = useState({ new_email: '', password: '' });
  const [deletePwd, setDeletePwd] = useState('');

  const authHeader = useCallback(async () => {
    const t = await getValidToken();
    if (!t) return null;
    return { Authorization: `Bearer ${t}` };
  }, [getValidToken]);

  const loadProfile = useCallback(async () => {
    const h = await authHeader();
    if (!h) return;
    const res = await axios.get(`${API_URL}/me/profile/`, { headers: h });
    const next = {
      full_name: res.data.full_name || '',
      cpf: res.data.cpf || '',
      phone: res.data.phone || '',
      email: res.data.email || user?.email || '',
    };
    setProfile(next);
    setInitialCpf(next.cpf || '');
  }, [authHeader, user?.email]);

  const loadAddresses = useCallback(async () => {
    const h = await authHeader();
    if (!h) return;
    const list = await loadAllPages(`${API_URL}/me/addresses/`, h);
    setAddresses(list);
  }, [authHeader]);

  const loadOrders = useCallback(async () => {
    const h = await authHeader();
    if (!h) return;
    const res = await axios.get(`${API_URL}/me/orders/`, { headers: h });
    setOrders(res.data || []);
  }, [authHeader]);

  const loadCoupons = useCallback(async () => {
    const list = await loadAllPages(`${API_URL}/coupons/`);
    setCoupons(list);
  }, []);

  const loadPayments = useCallback(async () => {
    const h = await authHeader();
    if (!h) return;
    const res = await axios.get(`${API_URL}/pagamentos/`, { headers: h });
    const list = Array.isArray(res.data) ? res.data : res.data.results || [];
    const map = {};
    for (const p of list) {
      const key = String(p?.pedido_id || '');
      if (!key) continue;
      map[key] = p;
    }
    setPaymentsByOrder(map);
  }, [authHeader]);

  useEffect(() => {
    const secao = searchParams.get('secao') || 'dados';
    const sub = searchParams.get('sub');
    const pedido = searchParams.get('pedido');
    if (NAV.some((i) => i.id === secao)) setSection(secao);
    else setSection('dados');
    if (secao === 'compras' && sub === 'pedidos') setComprasTab('pedidos');
    if (secao === 'compras' && sub === 'pedido' && pedido) {
      setComprasTab('pedido');
      setSelectedOrderId(String(pedido));
    }
  }, [searchParams]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('unseen_order_ids');
      const parsed = raw ? JSON.parse(raw) : [];
      setUnseenOrderIds(Array.isArray(parsed) ? parsed.map(String) : []);
    } catch {
      setUnseenOrderIds([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await loadProfile();
        if (cancelled) return;
        await loadAddresses();
        if (cancelled) return;
        await loadOrders();
        if (cancelled) return;
        await loadCoupons();
        if (cancelled) return;
        await loadPayments();
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadProfile, loadAddresses, loadOrders, loadCoupons, loadPayments]);

  useEffect(() => {
    if (section === 'compras') {
      loadOrders();
      loadPayments();
    }
  }, [section, loadOrders, loadPayments]);

  useEffect(() => {
    if (section !== 'compras' || comprasTab !== 'pedidos') return;
    if (!unseenOrderIds.length) return;
    const visibleOrderIds = new Set(orders.map((o) => String(o.id)));
    const remaining = unseenOrderIds.filter((id) => !visibleOrderIds.has(id));
    try {
      localStorage.setItem('unseen_order_ids', JSON.stringify(remaining));
    } catch {
      /* ignore */
    }
    setUnseenOrderIds(remaining);
  }, [section, comprasTab, orders, unseenOrderIds]);

  // Remove notificação quando o cliente acessa detalhes via URL ou volta à página
  useEffect(() => {
    if (section !== 'compras' || comprasTab !== 'pedido' || !selectedOrderId) return;
    if (!unseenOrderIds.includes(selectedOrderId)) return;
    
    const remaining = unseenOrderIds.filter((id) => id !== selectedOrderId);
    try {
      localStorage.setItem('unseen_order_ids', JSON.stringify(remaining));
    } catch {
      /* ignore */
    }
    setUnseenOrderIds(remaining);
  }, [comprasTab, selectedOrderId, unseenOrderIds, section]);

  const openComprasPedidos = () => {
    setSection('compras');
    setComprasTab('pedidos');
    setSearchParams({ secao: 'compras', sub: 'pedidos' });
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text || ''));
      alert('Copiado com sucesso.');
    } catch {
      alert('Não foi possível copiar.');
    }
  };

  const loadPaymentDetailsForOrder = async (orderId) => {
    const orderKey = String(orderId);
    const paymentListRow = paymentsByOrder[orderKey];
    if (!paymentListRow?.id || paymentDetailsByOrder[orderKey]) return;
    try {
      const h = await authHeader();
      if (!h) return;
      const res = await axios.get(`${API_URL}/pagamentos/${paymentListRow.id}/`, { headers: h });
      setPaymentDetailsByOrder((prev) => ({ ...prev, [orderKey]: res.data }));
    } catch (err) {
      console.error('Erro ao carregar detalhes do pagamento:', err);
    }
  };

  const openOrderDetailsTab = async (orderId) => {
    const id = String(orderId);
    
    // Remove notificação imediatamente (antes de atualizar state)
    const remaining = unseenOrderIds.filter((o) => o !== id);
    if (remaining.length !== unseenOrderIds.length) {
      try {
        localStorage.setItem('unseen_order_ids', JSON.stringify(remaining));
      } catch {
        /* ignore */
      }
      setUnseenOrderIds(remaining);
    }
    
    setSection('compras');
    setComprasTab('pedido');
    setSelectedOrderId(id);
    setSearchParams({ secao: 'compras', sub: 'pedido', pedido: id });
    await loadPaymentDetailsForOrder(id);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileErr('');
    try {
      const fullName = (profile.full_name || '').trim();
      if (fullName && fullName.split(' ').filter(Boolean).length < 2) {
        setProfileErr('Informe nome e sobrenome.');
        return;
      }

      const cpfDigits = String(profile.cpf || '').replace(/\D/g, '');
      const cpfLocked = Boolean(initialCpf);
      if (cpfLocked && profile.cpf !== initialCpf) {
        setProfileErr('CPF não pode ser alterado após definido.');
        return;
      }
      if (!cpfDigits) {
        setProfileErr('CPF é obrigatório.');
        return;
      }
      if (cpfDigits.length !== 11) {
        setProfileErr('CPF deve conter 11 dígitos.');
        return;
      }

      const h = await authHeader();
      if (!h) return;
      await axios.patch(
        `${API_URL}/me/profile/`,
        {
          full_name: profile.full_name,
          cpf: profile.cpf,
          phone: profile.phone,
        },
        { headers: { ...h, 'Content-Type': 'application/json' } }
      );
      await loadProfile();
      alert('Dados salvos.');
    } catch (err) {
      alert('Erro ao salvar: ' + (err.response?.data?.detail || err.message));
    }
  };

  const addAddress = async (e) => {
    e.preventDefault();
    setAddrErr('');
    try {
      const required = ['cep', 'street', 'number', 'neighborhood', 'city', 'state'];
      for (const k of required) {
        if (!String(addrForm[k] || '').trim()) {
          setAddrErr(`Campo obrigatório: ${k}.`);
          return;
        }
      }
      const cepDigits = String(addrForm.cep || '').replace(/\D/g, '');
      if (cepDigits.length !== 8) {
        setAddrErr('CEP deve conter 8 dígitos.');
        return;
      }
      const uf = String(addrForm.state || '').trim().toUpperCase();
      if (uf.length !== 2) {
        setAddrErr('UF deve ter 2 letras.');
        return;
      }

      const h = await authHeader();
      if (!h) return;
      const payload = { ...addrForm, cep: cepDigits, state: uf };
      if (editingAddressId) {
        await axios.patch(`${API_URL}/me/addresses/${editingAddressId}/`, payload, {
          headers: { ...h, 'Content-Type': 'application/json' },
        });
      } else {
        await axios.post(`${API_URL}/me/addresses/`, payload, {
          headers: { ...h, 'Content-Type': 'application/json' },
        });
      }
      setAddrForm({
        label: 'Principal',
        cep: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        is_default: false,
      });
      setEditingAddressId(null);
      await loadAddresses();
      alert(editingAddressId ? 'Endereço atualizado.' : 'Endereço adicionado.');
    } catch (err) {
      const msg = err.response?.data?.detail || JSON.stringify(err.response?.data) || err.message;
      setAddrErr(typeof msg === 'string' ? msg : 'Erro ao salvar endereço.');
    }
  };

  const removeAddress = async (id) => {
    if (!window.confirm('Remover este endereço?')) return;
    try {
      const h = await authHeader();
      if (!h) return;
      await axios.delete(`${API_URL}/me/addresses/${id}/`, { headers: h });
      await loadAddresses();
    } catch (err) {
      alert('Erro ao remover.');
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    try {
      const h = await authHeader();
      if (!h) return;
      await axios.post(`${API_URL}/me/change-password/`, pwdForm, {
        headers: { ...h, 'Content-Type': 'application/json' },
      });
      setPwdForm({ old_password: '', new_password: '' });
      alert('Senha alterada.');
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao alterar senha.');
    }
  };

  const changeEmail = async (e) => {
    e.preventDefault();
    try {
      const h = await authHeader();
      if (!h) return;
      const res = await axios.post(`${API_URL}/me/change-email/`, emailForm, {
        headers: { ...h, 'Content-Type': 'application/json' },
      });
      updateUser({ email: res.data.email });
      setProfile((p) => ({ ...p, email: res.data.email }));
      setEmailForm({ new_email: '', password: '' });
      alert('E-mail atualizado.');
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao alterar e-mail.');
    }
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm('Cancelar este pedido? Os itens voltam ao estoque da loja.')) return;
    try {
      const h = await authHeader();
      if (!h) return;
      await axios.post(`${API_URL}/me/orders/${orderId}/cancel/`, {}, { headers: h });
      await loadOrders();
    } catch (err) {
      alert(err.response?.data?.detail || 'Não foi possível cancelar o pedido.');
    }
  };

  // Função para filtrar pedidos por status
  const getFilteredOrders = () => {
    const conclusionStatuses = ['pago', 'confirmado', 'enviado', 'entregue'];
    
    switch (ordersFilter) {
      case 'pendentes':
        return orders.filter((o) => o.status === 'pendente');
      case 'cancelados':
        return orders.filter((o) => o.status === 'cancelado');
      case 'concluidos':
        return orders.filter((o) => conclusionStatuses.includes(o.status));
      default:
        return orders;
    }
  };

  const deleteAccount = async (e) => {
    e.preventDefault();
    if (!window.confirm('Excluir conta permanentemente? Esta ação não pode ser desfeita.')) return;
    try {
      const h = await authHeader();
      if (!h) return;
      await axios.post(`${API_URL}/me/delete-account/`, { password: deletePwd }, {
        headers: { ...h, 'Content-Type': 'application/json' },
      });
      logout();
      window.location.href = '/';
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao excluir conta.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-cereon-green" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-cereon-green font-semibold hover:opacity-80"
          >
            <Home className="w-5 h-5" />
            Voltar à loja
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-cereon-dark mb-2">Minha conta</h1>
        <p className="text-gray-600 mb-8">{user?.email}</p>

        <div className="flex flex-col lg:flex-row gap-8">
          <nav className="lg:w-64 shrink-0 space-y-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide px-3 mb-2">
              Menu
            </p>
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'compras') openComprasPedidos();
                    else {
                      setSection(item.id);
                      setSearchParams({});
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left font-medium transition-colors ${
                    active
                      ? 'bg-cereon-green text-white shadow-md'
                      : 'bg-white text-cereon-dark border border-gray-200 hover:border-cereon-green/50'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {item.label}
                  {item.id === 'compras' && unseenOrderIds.length > 0 && (
                    <span className="ml-auto text-[10px] bg-red-500 text-white rounded-full min-w-5 h-5 px-1 flex items-center justify-center font-bold">
                      {unseenOrderIds.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <motion.div
            key={section}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-6 lg:p-8"
          >
            {section === 'dados' && (
              <div>
                <h2 className="text-xl font-bold text-cereon-dark mb-6">Dados pessoais</h2>
                <form onSubmit={saveProfile} className="space-y-4 max-w-lg">
                  {profileErr && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      {profileErr}
                    </p>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nome completo</label>
                    <input
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green outline-none"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">CPF</label>
                    <input
                      className={`w-full px-4 py-2 border-2 rounded-lg outline-none ${
                        initialCpf
                          ? 'border-gray-100 bg-gray-50 text-gray-500'
                          : 'border-gray-200 focus:border-cereon-green'
                      }`}
                      value={profile.cpf}
                      onChange={(e) => setProfile({ ...profile, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                      disabled={Boolean(initialCpf)}
                    />
                    {initialCpf && (
                      <p className="text-xs text-gray-500 mt-1">CPF não pode ser alterado após definido.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Telefone</label>
                    <input
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green outline-none"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">E-mail</label>
                    <input
                      className="w-full px-4 py-2 border-2 border-gray-100 rounded-lg bg-gray-50 text-gray-500"
                      value={profile.email}
                      readOnly
                    />
                    <p className="text-xs text-gray-500 mt-1">Para alterar o e-mail, use a aba Conta e segurança.</p>
                  </div>
                  <button
                    type="submit"
                    className="bg-cereon-green text-white px-6 py-2 rounded-lg font-semibold hover:bg-cereon-green/90"
                  >
                    Salvar dados
                  </button>
                </form>
              </div>
            )}

            {section === 'enderecos' && (
              <div>
                <h2 className="text-xl font-bold text-cereon-dark mb-6">Endereços</h2>
                {addrErr && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
                    {addrErr}
                  </p>
                )}
                <div className="space-y-4 mb-8">
                  {addresses.length === 0 ? (
                    <p className="text-gray-500">Nenhum endereço cadastrado.</p>
                  ) : (
                    addresses.map((a) => (
                      <div
                        key={a.id}
                        className="border border-gray-200 rounded-lg p-4 flex justify-between gap-4 items-start"
                      >
                        <div>
                          <p className="font-semibold text-cereon-dark">
                            {a.label} {a.is_default && <span className="text-xs text-cereon-green">(padrão)</span>}
                          </p>
                          <p className="text-sm text-gray-600">
                            {a.street}, {a.number}
                            {a.complement ? ` — ${a.complement}` : ''}
                          </p>
                          <p className="text-sm text-gray-600">
                            {a.neighborhood} — {a.city}/{a.state} — CEP {a.cep}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAddrErr('');
                              setEditingAddressId(a.id);
                              setAddrForm({
                                label: a.label || 'Principal',
                                cep: a.cep || '',
                                street: a.street || '',
                                number: a.number || '',
                                complement: a.complement || '',
                                neighborhood: a.neighborhood || '',
                                city: a.city || '',
                                state: a.state || '',
                                is_default: Boolean(a.is_default),
                              });
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="text-cereon-dark p-2 hover:bg-gray-50 rounded-lg"
                            aria-label="Editar"
                            title="Editar"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAddress(a.id)}
                            className="text-red-500 p-2 hover:bg-red-50 rounded-lg"
                            aria-label="Remover"
                            title="Remover"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <h3 className="font-bold text-cereon-dark mb-3 flex items-center gap-2">
                  <Plus className="w-5 h-5" /> {editingAddressId ? 'Editar endereço' : 'Novo endereço'}
                </h3>
                <form onSubmit={addAddress} className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
                  <input
                    placeholder="Rótulo (ex: Casa)"
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg"
                    value={addrForm.label}
                    onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })}
                  />
                  <input
                    placeholder="CEP"
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg"
                    value={addrForm.cep}
                    onChange={(e) => setAddrForm({ ...addrForm, cep: e.target.value })}
                  />
                  <input
                    placeholder="Logradouro"
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg md:col-span-2"
                    value={addrForm.street}
                    onChange={(e) => setAddrForm({ ...addrForm, street: e.target.value })}
                  />
                  <input
                    placeholder="Número"
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg"
                    value={addrForm.number}
                    onChange={(e) => setAddrForm({ ...addrForm, number: e.target.value })}
                  />
                  <input
                    placeholder="Complemento"
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg"
                    value={addrForm.complement}
                    onChange={(e) => setAddrForm({ ...addrForm, complement: e.target.value })}
                  />
                  <input
                    placeholder="Bairro"
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg"
                    value={addrForm.neighborhood}
                    onChange={(e) => setAddrForm({ ...addrForm, neighborhood: e.target.value })}
                  />
                  <input
                    placeholder="Cidade"
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg"
                    value={addrForm.city}
                    onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                  />
                  <input
                    placeholder="UF"
                    maxLength={2}
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg"
                    value={addrForm.state}
                    onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value.toUpperCase() })}
                  />
                  <label className="flex items-center gap-2 md:col-span-2 text-sm">
                    <input
                      type="checkbox"
                      checked={addrForm.is_default}
                      onChange={(e) => setAddrForm({ ...addrForm, is_default: e.target.checked })}
                    />
                    Definir como endereço padrão
                  </label>
                  <button
                    type="submit"
                    className="md:col-span-2 bg-cereon-green text-white py-2 rounded-lg font-semibold"
                  >
                    {editingAddressId ? 'Salvar alterações' : 'Adicionar endereço'}
                  </button>
                  {editingAddressId && (
                    <button
                      type="button"
                      className="md:col-span-2 bg-gray-200 text-cereon-dark py-2 rounded-lg font-semibold"
                      onClick={() => {
                        setEditingAddressId(null);
                        setAddrErr('');
                        setAddrForm({
                          label: 'Principal',
                          cep: '',
                          street: '',
                          number: '',
                          complement: '',
                          neighborhood: '',
                          city: '',
                          state: '',
                          is_default: false,
                        });
                      }}
                    >
                      Cancelar edição
                    </button>
                  )}
                </form>
              </div>
            )}

            {section === 'seguranca' && (
              <div className="space-y-10 max-w-lg">
                <h2 className="text-xl font-bold text-cereon-dark">Conta e segurança</h2>

                <div>
                  <h3 className="font-semibold mb-3">Alterar e-mail</h3>
                  <form onSubmit={changeEmail} className="space-y-3">
                    <input
                      type="email"
                      required
                      placeholder="Novo e-mail"
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
                      value={emailForm.new_email}
                      onChange={(e) => setEmailForm({ ...emailForm, new_email: e.target.value })}
                    />
                    <input
                      type="password"
                      required
                      placeholder="Senha atual"
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
                      value={emailForm.password}
                      onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                    />
                    <button type="submit" className="bg-cereon-dark text-white px-4 py-2 rounded-lg font-medium">
                      Atualizar e-mail
                    </button>
                  </form>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Alterar senha</h3>
                  <form onSubmit={changePassword} className="space-y-3">
                    <input
                      type="password"
                      required
                      placeholder="Senha atual"
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
                      value={pwdForm.old_password}
                      onChange={(e) => setPwdForm({ ...pwdForm, old_password: e.target.value })}
                    />
                    <input
                      type="password"
                      required
                      placeholder="Nova senha (mín. 6 caracteres)"
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
                      value={pwdForm.new_password}
                      onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })}
                    />
                    <button type="submit" className="bg-cereon-dark text-white px-4 py-2 rounded-lg font-medium">
                      Alterar senha
                    </button>
                  </form>
                </div>

                <div className="border-t pt-8 border-red-100">
                  <h3 className="font-semibold text-red-700 mb-3">Excluir conta</h3>
                  <form onSubmit={deleteAccount} className="space-y-3">
                    <input
                      type="password"
                      required
                      placeholder="Confirme com sua senha"
                      className="w-full px-4 py-2 border-2 border-red-200 rounded-lg"
                      value={deletePwd}
                      onChange={(e) => setDeletePwd(e.target.value)}
                    />
                    <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium">
                      Excluir minha conta
                    </button>
                  </form>
                </div>
              </div>
            )}

            {section === 'compras' && (
              <div>
                <h2 className="text-xl font-bold text-cereon-dark mb-4">Minhas compras</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Pedidos em aberto devem ser pagos em até 1 hora; após isso expiram automaticamente.
                </p>
                <div className="flex gap-2 border-b border-gray-200 mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setComprasTab('pedidos');
                      setSearchParams({ secao: 'compras', sub: 'pedidos' });
                    }}
                    className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                      comprasTab === 'pedidos'
                        ? 'border-cereon-green text-cereon-green'
                        : 'border-transparent text-gray-500 hover:text-cereon-dark'
                    }`}
                  >
                    Meus pedidos
                    {unseenOrderIds.length > 0 && (
                      <span className="ml-2 text-[10px] bg-red-500 text-white rounded-full min-w-5 h-5 px-1 inline-flex items-center justify-center font-bold">
                        {unseenOrderIds.length}
                      </span>
                    )}
                  </button>
                  {comprasTab === 'pedido' && selectedOrderId && (
                    <button
                      type="button"
                      onClick={() => {
                        setComprasTab('pedido');
                        setSearchParams({ secao: 'compras', sub: 'pedido', pedido: selectedOrderId });
                      }}
                      className="px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors border-cereon-green text-cereon-green"
                    >
                      Pedido {selectedOrderId}
                    </button>
                  )}
                </div>

                {comprasTab === 'pedidos' && (
                  <>
                    {orders.length === 0 ? (
                      <p className="text-gray-500">Você ainda não tem pedidos.</p>
                    ) : (
                      <>
                        {/* Filtros */}
                        <div className="flex flex-wrap gap-3 mb-6 pb-4 border-b border-gray-200">
                          <button
                            type="button"
                            onClick={() => setOrdersFilter('pendentes')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              ordersFilter === 'pendentes'
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            Pendentes ({orders.filter((o) => o.status === 'pendente').length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrdersFilter('concluidos')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              ordersFilter === 'concluidos'
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            Concluídos ({orders.filter((o) => ['pago', 'confirmado', 'enviado', 'entregue'].includes(o.status)).length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrdersFilter('cancelados')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              ordersFilter === 'cancelados'
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            Cancelados ({orders.filter((o) => o.status === 'cancelado').length})
                          </button>
                        </div>

                        {/* Pedidos Filtrados */}
                        <div className="space-y-4">
                          {getFilteredOrders().length === 0 ? (
                            <p className="text-gray-500 py-8 text-center">
                              Nenhum pedido {ordersFilter === 'pendentes' ? 'pendente' : ordersFilter === 'concluidos' ? 'concluído' : 'cancelado'}.
                            </p>
                          ) : (
                            getFilteredOrders().map((o) => (
                              <div key={o.id} className="border border-gray-200 rounded-lg p-4 space-y-2">
                                <div className="flex flex-wrap justify-between gap-2 items-start">
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <StatusBadge status={o.status} />
                                      <span className="font-bold text-cereon-dark">
                                        Pedido {o.public_code || `#${o.id}`}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700 mt-1">{formatOrderItemsLine(o)}</p>
                                  </div>
                                  <span className="text-cereon-green font-bold whitespace-nowrap">
                                    R$ {parseFloat(o.total).toFixed(2)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">
                                  {new Date(o.created_at).toLocaleString('pt-BR')}
                                </p>
                                {o.status === 'pendente' && o.expires_at && (
                                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                    Prazo para pagamento até{' '}
                                    {new Date(o.expires_at).toLocaleString('pt-BR', {
                                      dateStyle: 'short',
                                      timeStyle: 'short',
                                    })}
                                  </p>
                                )}
                                {o.shipping_fee != null && (
                                  <p className="text-sm text-gray-600">
                                    Frete: R$ {parseFloat(o.shipping_fee).toFixed(2)}
                                  </p>
                                )}
                                {o.payment_method && (
                                  <p className="text-sm text-gray-600">
                                    Pagamento:{' '}
                                    {{
                                      pix: 'PIX',
                                      cartao: 'Cartão',
                                      boleto: 'Boleto',
                                    }[o.payment_method] || o.payment_method}
                                  </p>
                                )}
                                {o.delivery_summary && (
                                  <p className="text-sm text-cereon-dark">Entrega: {o.delivery_summary}</p>
                                )}
                                {o.customer_notes && (
                                  <p className="text-sm text-gray-600">Obs.: {o.customer_notes}</p>
                                )}
                                {o.is_cancelable && (
                                  <div className="pt-2 flex flex-wrap gap-4 items-center">
                                    <button
                                      type="button"
                                      onClick={() => cancelOrder(o.id)}
                                      className="text-sm font-semibold text-red-600 hover:text-red-700 underline"
                                    >
                                      Cancelar pedido
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => o.status !== 'cancelado' && openOrderDetailsTab(o.id)}
                                      disabled={o.status === 'cancelado'}
                                      className={`text-sm font-semibold inline-flex items-center gap-1 ${
                                        o.status === 'cancelado'
                                          ? 'text-gray-400 cursor-not-allowed opacity-50'
                                          : 'text-cereon-green hover:text-green-700 underline'
                                      }`}
                                    >
                                      <Eye className="w-4 h-4" />
                                      Ver detalhes
                                    </button>
                                  </div>
                                )}
                                {!o.is_cancelable && (
                                  <div className="pt-2">
                                    <button
                                      type="button"
                                      onClick={() => o.status !== 'cancelado' && openOrderDetailsTab(o.id)}
                                      disabled={o.status === 'cancelado'}
                                      className={`text-sm font-semibold inline-flex items-center gap-1 ${
                                        o.status === 'cancelado'
                                          ? 'text-gray-400 cursor-not-allowed opacity-50'
                                          : 'text-cereon-green hover:text-green-700 underline'
                                      }`}
                                    >
                                      <Eye className="w-4 h-4" />
                                      Ver detalhes
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}

                {comprasTab === 'pedido' && (() => {
                  const order = orders.find((o) => String(o.id) === String(selectedOrderId));
                  if (!order) {
                    return (
                      <p className="text-gray-500">
                        Pedido não encontrado. Volte para "Meus pedidos" e selecione novamente.
                      </p>
                    );
                  }
                  const payment = paymentDetailsByOrder[String(order.id)];
                  const coupon = coupons.find((c) => Number(c.id) === Number(order.coupon));
                  const breakdown = getOrderPricingBreakdown(order, coupon);

                  return (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-lg font-bold text-cereon-dark">
                          Detalhes do pedido {order.public_code || `#${order.id}`}
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setComprasTab('pedidos');
                            setSearchParams({ secao: 'compras', sub: 'pedidos' });
                          }}
                          className="text-sm font-semibold text-cereon-green underline"
                        >
                          Voltar para pedidos
                        </button>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-gray-600">
                            {new Date(order.created_at).toLocaleString('pt-BR')}
                          </span>
                          <span className="text-gray-300">•</span>
                          <StatusBadge status={order.status} />
                        </div>
                        <ul className="mt-3 divide-y divide-gray-100">
                          {order.items?.map((it) => {
                            const lineSubtotal = parseFloat(it.subtotal) || 0;
                            const pid = Number(it.product?.id);
                            const lineDiscount = breakdown.itemDiscounts[pid] || 0;
                            return (
                              <li key={it.id} className="py-3">
                                <p className="font-medium text-cereon-dark">{it.product?.name || 'Produto'}</p>
                                <p className="text-sm text-gray-600">
                                  {it.quantity} x R$ {parseFloat(it.price).toFixed(2)} = R$ {lineSubtotal.toFixed(2)}
                                </p>
                                {coupon && (
                                  <p className={`text-xs ${lineDiscount > 0 ? 'text-green-700' : 'text-gray-500'}`}>
                                    {lineDiscount > 0
                                      ? `Desconto (${coupon.code}) neste item: -R$ ${lineDiscount.toFixed(2)}`
                                      : `Cupom ${coupon.code} não aplicado neste item`}
                                  </p>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4 text-sm space-y-1">
                        <div className="flex justify-between"><span>Subtotal</span><span>R$ {breakdown.subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between">
                          <span>Desconto {coupon ? `(${coupon.code})` : ''}</span>
                          <span>- R$ {breakdown.discount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between"><span>Frete</span><span>R$ {breakdown.shipping.toFixed(2)}</span></div>
                        <div className="flex justify-between border-t pt-2 font-bold text-cereon-green">
                          <span>Total</span><span>R$ {breakdown.total.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="border border-cereon-green/20 bg-cereon-light/40 rounded-lg p-4 space-y-2">
                        <h4 className="font-semibold text-cereon-dark">Pagamento</h4>
                        {paymentsByOrder[String(order.id)] ? (
                          <>
                            {!payment && (
                              <button
                                type="button"
                                onClick={() => loadPaymentDetailsForOrder(order.id)}
                                className="text-sm text-cereon-green underline"
                              >
                                Carregar detalhes do pagamento
                              </button>
                            )}
                            {payment && (
                              <div className="space-y-2 text-sm text-cereon-dark">
                                <p>Status do pagamento: <strong>{payment.status}</strong></p>
                                <p>ID do pagamento: <span className="font-mono break-all">{payment.id}</span></p>
                                {payment.copia_cola && (
                                  <div className="bg-white border border-gray-200 rounded p-2">
                                    <p className="text-xs text-gray-500 mb-1">Chave PIX (copia e cola)</p>
                                    <div className="flex gap-2 items-start">
                                      <code className="text-xs break-all flex-1">{payment.copia_cola}</code>
                                      <button
                                        type="button"
                                        onClick={() => copyText(payment.copia_cola)}
                                        className="px-2 py-1 bg-cereon-green text-white rounded text-xs inline-flex items-center gap-1"
                                      >
                                        <Copy className="w-3 h-3" />
                                        Copiar
                                      </button>
                                    </div>
                                  </div>
                                )}
                                {payment.qr_code_base64 && (
                                  <div className="bg-white border border-gray-200 rounded p-2 inline-block">
                                    <p className="text-xs text-gray-500 mb-1">QR Code PIX</p>
                                    <img src={payment.qr_code_base64} alt="QR Code PIX do pedido" className="w-44 h-44 object-contain" />
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-600">Nenhum pagamento vinculado encontrado para este pedido.</p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {section === 'cupons' && (
              <div>
                <h2 className="text-xl font-bold text-cereon-dark mb-6">Cupons disponíveis</h2>
                {coupons.length === 0 ? (
                  <p className="text-gray-500">Nenhum cupom cadastrado no momento.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {coupons.map((c) => (
                      <div
                        key={c.id}
                        className="border-2 border-cereon-green/30 rounded-xl p-4 bg-cereon-light/50"
                      >
                        <p className="text-2xl font-bold text-cereon-green">{c.code}</p>
                        <p className="text-cereon-dark">{c.discount_percent}% de desconto</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Válido até {new Date(c.expiry_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
