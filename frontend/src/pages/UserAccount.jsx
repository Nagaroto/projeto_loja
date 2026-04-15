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
  confirmado: 'Confirmado',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

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
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState({
    full_name: '',
    cpf: '',
    phone: '',
    email: '',
  });
  const [addresses, setAddresses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [coupons, setCoupons] = useState([]);

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
    setProfile({
      full_name: res.data.full_name || '',
      cpf: res.data.cpf || '',
      phone: res.data.phone || '',
      email: res.data.email || user?.email || '',
    });
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

  useEffect(() => {
    const secao = searchParams.get('secao');
    const sub = searchParams.get('sub');
    if (secao === 'compras') {
      setSection('compras');
      if (sub === 'pedidos') setComprasTab('pedidos');
    }
  }, [searchParams]);

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
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadProfile, loadAddresses, loadOrders, loadCoupons]);

  useEffect(() => {
    if (section === 'compras') {
      loadOrders();
    }
  }, [section, loadOrders]);

  const openComprasPedidos = () => {
    setSection('compras');
    setComprasTab('pedidos');
    setSearchParams({ secao: 'compras', sub: 'pedidos' });
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
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
      alert('Dados salvos.');
    } catch (err) {
      alert('Erro ao salvar: ' + (err.response?.data?.detail || err.message));
    }
  };

  const addAddress = async (e) => {
    e.preventDefault();
    try {
      const h = await authHeader();
      if (!h) return;
      await axios.post(`${API_URL}/me/addresses/`, addrForm, {
        headers: { ...h, 'Content-Type': 'application/json' },
      });
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
      await loadAddresses();
      alert('Endereço adicionado.');
    } catch (err) {
      alert('Erro: ' + (err.response?.data?.detail || JSON.stringify(err.response?.data) || err.message));
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
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green outline-none"
                      value={profile.cpf}
                      onChange={(e) => setProfile({ ...profile, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                    />
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
                        <button
                          type="button"
                          onClick={() => removeAddress(a.id)}
                          className="text-red-500 p-2 hover:bg-red-50 rounded-lg"
                          aria-label="Remover"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <h3 className="font-bold text-cereon-dark mb-3 flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Novo endereço
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
                    Adicionar endereço
                  </button>
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
                  Pedidos em aberto devem ser pagos em até 24 horas; após isso são removidos automaticamente.
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
                  </button>
                </div>

                {comprasTab === 'pedidos' && (
                  <>
                    {orders.length === 0 ? (
                      <p className="text-gray-500">Você ainda não tem pedidos.</p>
                    ) : (
                      <div className="space-y-4">
                        {orders.map((o) => (
                          <div key={o.id} className="border border-gray-200 rounded-lg p-4 space-y-2">
                            <div className="flex flex-wrap justify-between gap-2 items-start">
                              <div>
                                <span className="font-bold text-cereon-dark">
                                  Pedido {o.public_code || `#${o.id}`}
                                </span>
                                <p className="text-sm text-gray-700 mt-1">{formatOrderItemsLine(o)}</p>
                              </div>
                              <span className="text-cereon-green font-bold whitespace-nowrap">
                                R$ {parseFloat(o.total).toFixed(2)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {new Date(o.created_at).toLocaleString('pt-BR')} —{' '}
                              {ORDER_STATUS_LABEL[o.status] || o.status}
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
                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={() => cancelOrder(o.id)}
                                  className="text-sm font-semibold text-red-600 hover:text-red-700 underline"
                                >
                                  Cancelar pedido
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
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
