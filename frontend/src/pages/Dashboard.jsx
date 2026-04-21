import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Package, Ticket, ShoppingBag, BarChart3, Plus, Trash2, Edit2, LogOut, Menu, X, Search, Tags, Users } from 'lucide-react';
import axios from 'axios';
import { CategoriesTab } from '../components/CategoriesTab';

const API_URL = 'http://127.0.0.1:8000/api';

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

// Agrega todas as páginas de um endpoint paginado (lista completa no admin).
const loadAllPages = async (url) => {
  let allResults = [];
  let nextPage = url;
  
  while (nextPage) {
    try {
      const response = await axios.get(nextPage);
      const data = response.data;
      
      if (data.results) {
        allResults = [...allResults, ...data.results];
        nextPage = data.next;
      } else if (Array.isArray(data)) {
        allResults = data;
        break;
      } else {
        allResults = [data];
        break;
      }
    } catch (error) {
      console.error('Erro ao carregar pagina:', error);
      break;
    }
  }
  
  return allResults;
};

// Garante URL absoluta para imagens (paths relativos usam o host da vitrine).
const normalizeImageUrl = (value) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
  } catch (_) {
    /* caminho relativo */
  }

  const base = window.location.origin;
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${normalizedPath}`;
};

function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    image_url: '',
    colors: '',
    sizes: '',
    is_active: true
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    image_url: '',
    colors: '',
    sizes: '',
    is_active: true
  });
  const { token, getValidToken } = useAuth();

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      const allProducts = await loadAllPages(`${API_URL}/products/`);
      setProducts(allProducts);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const allCategories = await loadAllPages(`${API_URL}/categories/`);
      setCategories(allCategories);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === parseInt(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const validToken = await getValidToken();
      if (!validToken) {
        alert('Sessão expirada. Faça login novamente.');
        return;
      }

      const categoryId = Number(formData.category);
      const priceValue = Number(formData.price);
      const stockValue = Number(formData.stock);

      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        alert('Selecione uma categoria válida.');
        return;
      }
      if (!Number.isFinite(priceValue) || priceValue < 0) {
        alert('Informe um preço válido.');
        return;
      }
      if (!Number.isInteger(stockValue) || stockValue < 0) {
        alert('Informe um estoque válido.');
        return;
      }

      const colors = formData.colors ? formData.colors.split(',').map(c => c.trim()).filter(c => c) : [];
      const sizes = formData.sizes ? formData.sizes.split(',').map(s => s.trim()).filter(s => s) : [];

      await axios.post(`${API_URL}/products/`, {
        ...formData,
        colors,
        sizes,
        price: priceValue,
        stock: stockValue,
        category: categoryId,
        image_url: normalizeImageUrl(formData.image_url),
        is_active: Boolean(formData.is_active),
      }, {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      setFormData({
        name: '',
        description: '',
        price: '',
        stock: '',
        category: '',
        image_url: '',
        colors: '',
        sizes: '',
        is_active: true
      });
      setShowForm(false);
      loadProducts();
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      const apiError = error.response?.data;
      const errorMessage =
        apiError?.detail ||
        (apiError ? JSON.stringify(apiError) : error.message);
      alert('Erro ao adicionar produto: ' + errorMessage);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar este produto?')) {
      try {
        const validToken = await getValidToken();
        if (!validToken) {
          alert('Sessão expirada. Faça login novamente.');
          return;
        }
        await axios.delete(`${API_URL}/products/${id}/`, {
          headers: { Authorization: `Bearer ${validToken}` }
        });
        loadProducts();
      } catch (error) {
        alert('Erro ao deletar produto');
      }
    }
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setEditFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category.toString(),
      image_url: product.image_url || '',
      colors: Array.isArray(product.colors) ? product.colors.join(', ') : '',
      sizes: Array.isArray(product.sizes) ? product.sizes.join(', ') : '',
      is_active: product.is_active !== false
    });
    setShowEditForm(true);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    try {
      const validToken = await getValidToken();
      if (!validToken) {
        alert('Sessão expirada. Faça login novamente.');
        return;
      }

      const categoryId = Number(editFormData.category);
      const priceValue = Number(editFormData.price);
      const stockValue = Number(editFormData.stock);

      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        alert('Selecione uma categoria válida.');
        return;
      }
      if (!Number.isFinite(priceValue) || priceValue < 0) {
        alert('Informe um preço válido.');
        return;
      }
      if (!Number.isInteger(stockValue) || stockValue < 0) {
        alert('Informe um estoque válido.');
        return;
      }

      const colors = editFormData.colors ? editFormData.colors.split(',').map(c => c.trim()).filter(c => c) : [];
      const sizes = editFormData.sizes ? editFormData.sizes.split(',').map(s => s.trim()).filter(s => s) : [];

      await axios.patch(`${API_URL}/products/${editingProduct.id}/`, {
        ...editFormData,
        colors,
        sizes,
        price: priceValue,
        stock: stockValue,
        category: categoryId,
        image_url: normalizeImageUrl(editFormData.image_url),
        is_active: Boolean(editFormData.is_active),
      }, {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      setShowEditForm(false);
      setEditingProduct(null);
      setEditFormData({
        name: '',
        description: '',
        price: '',
        stock: '',
        category: '',
        image_url: '',
        colors: '',
        sizes: '',
        is_active: true
      });
      loadProducts();
      alert('Produto atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      const apiError = error.response?.data;
      const errorMessage =
        apiError?.detail ||
        (apiError ? JSON.stringify(apiError) : error.message);
      alert('Erro ao atualizar produto: ' + errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-cereon-dark">Gerenciar Produtos</h2>
        <motion.button
          onClick={() => {
            setShowEditForm(false);
            setEditingCoupon(null);
            setShowForm(!showForm);
          }}
          className="bg-cereon-green text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-cereon-green/90 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-5 h-5" />
          Novo Produto
        </motion.button>
      </div>

      {/* Formulário de Novo Produto */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-cereon-light p-6 rounded-lg border-2 border-cereon-green/30"
        >
          <form onSubmit={handleAddProduct} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nome do Produto"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
              />
              <input
                type="number"
                placeholder="Preço"
                required
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
              />
              <input
                type="number"
                placeholder="Estoque"
                required
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
              />
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="Descrição"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
              rows="3"
            />
            <input
              type="text"
              placeholder="URL da Imagem"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
            />
            <input
              type="text"
              placeholder="Cores Disponíveis (separadas por vírgula, ex: Vermelho, Azul, Preto)"
              value={formData.colors}
              onChange={(e) => setFormData({ ...formData, colors: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
            />
            <input
              type="text"
              placeholder="Tamanhos Disponíveis (separados por vírgula, ex: P, M, G, GG)"
              value={formData.sizes}
              onChange={(e) => setFormData({ ...formData, sizes: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
            />
            <label className="flex items-center gap-2 cursor-pointer text-cereon-dark font-medium">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300 text-cereon-green focus:ring-cereon-green"
              />
              Publicar no catálogo (visível no site)
            </label>
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-cereon-green text-white px-6 py-2 rounded-lg font-semibold hover:bg-cereon-green/90 transition-colors"
              >
                Salvar Produto
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-300 text-cereon-dark px-6 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {showEditForm && editingProduct && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-cereon-light p-6 rounded-lg border-2 border-cereon-green/30"
        >
          <h3 className="text-xl font-bold text-cereon-dark mb-4">Editar Produto: {editingProduct.name}</h3>
          <form onSubmit={handleUpdateProduct} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nome do Produto"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
              />
              <input
                type="number"
                placeholder="Preço"
                required
                step="0.01"
                value={editFormData.price}
                onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
              />
              <input
                type="number"
                placeholder="Estoque"
                required
                value={editFormData.stock}
                onChange={(e) => setEditFormData({ ...editFormData, stock: e.target.value })}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
              />
              <select
                required
                value={editFormData.category}
                onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="Descrição"
              required
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
              rows="3"
            />
            <input
              type="text"
              placeholder="URL da Imagem"
              value={editFormData.image_url}
              onChange={(e) => setEditFormData({ ...editFormData, image_url: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
            />
            <input
              type="text"
              placeholder="Cores Disponíveis (separadas por vírgula, ex: Vermelho, Azul, Preto)"
              value={editFormData.colors}
              onChange={(e) => setEditFormData({ ...editFormData, colors: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
            />
            <input
              type="text"
              placeholder="Tamanhos Disponíveis (separados por vírgula, ex: P, M, G, GG)"
              value={editFormData.sizes}
              onChange={(e) => setEditFormData({ ...editFormData, sizes: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
            />
            <label className="flex items-center gap-2 cursor-pointer text-cereon-dark font-medium">
              <input
                type="checkbox"
                checked={editFormData.is_active}
                onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                className="rounded border-gray-300 text-cereon-green focus:ring-cereon-green"
              />
              Publicar no catálogo (visível no site)
            </label>
            <p className="text-sm text-gray-600">
              Produtos marcados como Não publicado&quot; após exclusão de categoria continuam inativos até marcar esta opção e salvar.
            </p>
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-cereon-green text-white px-6 py-2 rounded-lg font-semibold hover:bg-cereon-green/90 transition-colors"
              >
                Salvar Alterações
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEditForm(false);
                  setEditingProduct(null);
                }}
                className="bg-gray-300 text-cereon-dark px-6 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="flex gap-4 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Buscar produtos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
        >
          <option value="">Todas as categorias</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <motion.div
            key={product.id}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow"
            whileHover={{ y: -5 }}
          >
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-48 object-cover rounded-lg mb-3"
              />
            )}
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-cereon-dark flex-1">{product.name}</h3>
              {!product.is_active && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-semibold whitespace-nowrap ml-2">
                  Não publicado
                </span>
              )}
            </div>
            <p className="text-sm text-cereon-dark mb-2">
              {categories.find((c) => c.id === product.category)?.name || 'Sem categoria'}
            </p>
            <p className="text-sm text-cereon-dark mb-3 line-clamp-2">{product.description}</p>
            <div className="flex justify-between items-center mb-3">
              <span className="text-cereon-green font-bold">R$ {parseFloat(product.price).toFixed(2)}</span>
              <span className="text-sm bg-cereon-light text-cereon-dark px-2 py-1 rounded">
                {product.stock} em estoque
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleOpenEdit(product)}
                className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={() => handleDeleteProduct(product.id)}
                className="flex-1 bg-red-500 text-white px-3 py-2 rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Deletar
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Componente de Cupons
function EligibleProductsSelector({ products, selectedIds, onChange }) {
  const [search, setSearch] = useState('');
  const selectedSet = new Set((selectedIds || []).map((x) => String(x)));
  const filteredAvailable = products.filter((p) => {
    const id = String(p.id);
    if (selectedSet.has(id)) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      String(p.id).includes(term) ||
      String(p.name || '').toLowerCase().includes(term)
    );
  });
  const selectedProducts = (selectedIds || [])
    .map((id) => products.find((p) => String(p.id) === String(id)))
    .filter(Boolean);

  const addProduct = (id) => {
    const next = Array.from(new Set([...(selectedIds || []), String(id)]));
    onChange(next);
  };

  const removeProduct = (id) => {
    const next = (selectedIds || []).filter((x) => String(x) !== String(id));
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-cereon-dark">
          Produtos elegíveis (opcional)
        </p>
        <span className="text-xs bg-cereon-green/10 text-cereon-green px-2 py-1 rounded-full font-semibold">
          Selecionados: {selectedProducts.length}
        </span>
      </div>
      <p className="text-xs text-gray-600">
        Se não selecionar nenhum produto, o cupom valerá para todos.
      </p>

      <input
        type="text"
        placeholder="Buscar produto por nome ou ID"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h4 className="font-semibold text-cereon-dark mb-3">
            Produtos disponíveis
          </h4>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredAvailable.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum produto disponível para adicionar.</p>
            ) : (
              filteredAvailable.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 p-2 border border-gray-100 rounded-lg"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-cereon-dark truncate">#{p.id} - {p.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addProduct(p.id)}
                    className="text-xs bg-cereon-green text-white px-3 py-1 rounded-md hover:bg-green-600 transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-cereon-light border border-cereon-green/20 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-cereon-dark">
              Produtos aplicáveis ao cupom
            </h4>
            {selectedProducts.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-red-600 hover:text-red-700 font-semibold"
              >
                Limpar seleção
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {selectedProducts.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum produto selecionado. O cupom será global.</p>
            ) : (
              selectedProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 p-2 bg-white border border-cereon-green/20 rounded-lg"
                >
                  <p className="text-sm font-medium text-cereon-dark truncate">#{p.id} - {p.name}</p>
                  <button
                    type="button"
                    onClick={() => removeProduct(p.id)}
                    className="text-xs bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors"
                  >
                    Remover
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CouponsTab() {
  const [coupons, setCoupons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    code: '',
    discount_percent: '',
    expiry_date: '',
    max_uses: '',
    eligible_products: [],
  });
  const { getValidToken } = useAuth();
  const productsById = products.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  useEffect(() => {
    loadCoupons();
    loadProducts();
  }, []);

  const loadCoupons = async () => {
    try {
      // Carrega TODOS os cupons (não apenas a primeira pagina)
      const allCoupons = await loadAllPages(`${API_URL}/coupons/`);
      setCoupons(allCoupons);
    } catch (error) {
      console.error('Erro ao carregar cupons:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const allProducts = await loadAllPages(`${API_URL}/products/`);
      setProducts(allProducts);
    } catch (e) {
      setProducts([]);
    }
  };

  const handleAddCoupon = async (e) => {
    e.preventDefault();
    try {
      const validToken = await getValidToken();
      if (!validToken) {
        alert('Sessão expirada. Faça login novamente.');
        return;
      }

      const payload = {
        code: formData.code,
        discount_percent: Number(formData.discount_percent),
        expiry_date: formData.expiry_date,
        max_uses: formData.max_uses === '' ? null : Number(formData.max_uses),
        eligible_products: Array.isArray(formData.eligible_products)
          ? formData.eligible_products.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0)
          : [],
      };

      await axios.post(`${API_URL}/coupons/`, payload, {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      setFormData({
        code: '',
        discount_percent: '',
        expiry_date: '',
        max_uses: '',
        eligible_products: [],
      });
      setShowForm(false);
      loadCoupons();
    } catch (error) {
      const apiError = error.response?.data;
      const errorMessage =
        apiError?.detail ||
        (apiError ? JSON.stringify(apiError) : error.message);
      alert('Erro ao adicionar cupom: ' + errorMessage);
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar este cupom?')) {
      try {
        const validToken = await getValidToken();
        if (!validToken) {
          alert('Sessão expirada. Faça login novamente.');
          return;
        }
        await axios.delete(`${API_URL}/coupons/${id}/`, {
          headers: { Authorization: `Bearer ${validToken}` }
        });
        loadCoupons();
      } catch (error) {
        alert('Erro ao deletar cupom');
      }
    }
  };

  const handleOpenEditCoupon = (coupon) => {
    const eligible = Array.isArray(coupon.eligible_products)
      ? coupon.eligible_products.map((x) => String(x))
      : [];
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code || '',
      discount_percent: coupon.discount_percent?.toString?.() || '',
      expiry_date: coupon.expiry_date || '',
      max_uses: coupon.max_uses == null ? '' : coupon.max_uses.toString(),
      eligible_products: eligible,
    });
    setShowEditForm(true);
    setShowForm(false);
  };

  const handleUpdateCoupon = async (e) => {
    e.preventDefault();
    if (!editingCoupon) return;
    try {
      const validToken = await getValidToken();
      if (!validToken) {
        alert('Sessão expirada. Faça login novamente.');
        return;
      }

      const payload = {
        code: formData.code,
        discount_percent: Number(formData.discount_percent),
        expiry_date: formData.expiry_date,
        max_uses: formData.max_uses === '' ? null : Number(formData.max_uses),
        eligible_products: Array.isArray(formData.eligible_products)
          ? formData.eligible_products.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0)
          : [],
      };

      await axios.patch(`${API_URL}/coupons/${editingCoupon.id}/`, payload, {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      setFormData({
        code: '',
        discount_percent: '',
        expiry_date: '',
        max_uses: '',
        eligible_products: [],
      });
      setShowEditForm(false);
      setEditingCoupon(null);
      loadCoupons();
    } catch (error) {
      const apiError = error.response?.data;
      const errorMessage =
        apiError?.detail ||
        (apiError ? JSON.stringify(apiError) : error.message);
      alert('Erro ao atualizar cupom: ' + errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-cereon-dark">Gerenciar Cupons</h2>
        <motion.button
          onClick={() => setShowForm(!showForm)}
          className="bg-cereon-green text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-cereon-green/90 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-5 h-5" />
          Novo Cupom
        </motion.button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-cereon-light p-6 rounded-lg border-2 border-cereon-green/30"
        >
          <form onSubmit={handleAddCoupon} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Código do Cupom"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
              />
              <input
                type="number"
                placeholder="Desconto (%)"
                required
                min="1"
                max="100"
                value={formData.discount_percent}
                onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
              />
              <input
                type="date"
                placeholder="Data de Expiração"
                required
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
              />
              <input
                type="number"
                placeholder="Máximo de usos"
                value={formData.max_uses}
                onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
              />
            </div>

            <EligibleProductsSelector
              products={products}
              selectedIds={formData.eligible_products}
              onChange={(eligible_products) => setFormData({ ...formData, eligible_products })}
            />
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-cereon-green text-white px-6 py-2 rounded-lg font-semibold hover:bg-cereon-green/90 transition-colors"
              >
                Salvar Cupom
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-300 text-cereon-dark px-6 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {showEditForm && editingCoupon && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-cereon-light p-6 rounded-lg border-2 border-cereon-green/30"
        >
          <h3 className="text-xl font-bold text-cereon-dark mb-4">
            Editar Cupom: {editingCoupon.code}
          </h3>
          <form onSubmit={handleUpdateCoupon} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Código do Cupom"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
              />
              <input
                type="number"
                placeholder="Desconto (%)"
                required
                min="1"
                max="100"
                value={formData.discount_percent}
                onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
              />
              <input
                type="date"
                placeholder="Data de Expiração"
                required
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
              />
              <input
                type="number"
                placeholder="Máximo de usos"
                value={formData.max_uses}
                onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
              />
            </div>

            <EligibleProductsSelector
              products={products}
              selectedIds={formData.eligible_products}
              onChange={(eligible_products) => setFormData({ ...formData, eligible_products })}
            />
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-cereon-green text-white px-6 py-2 rounded-lg font-semibold hover:bg-cereon-green/90 transition-colors"
              >
                Salvar Alterações
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEditForm(false);
                  setEditingCoupon(null);
                }}
                className="bg-gray-300 text-cereon-dark px-6 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-cereon-light border-b-2 border-cereon-green/30">
              <th className="px-6 py-3 text-left font-bold text-cereon-dark">Código</th>
              <th className="px-6 py-3 text-left font-bold text-cereon-dark">Desconto</th>
              <th className="px-6 py-3 text-left font-bold text-cereon-dark">Expira em</th>
              <th className="px-6 py-3 text-left font-bold text-cereon-dark">Máx. Usos</th>
              <th className="px-6 py-3 text-left font-bold text-cereon-dark">Elegíveis</th>
              <th className="px-6 py-3 text-left font-bold text-cereon-dark">Ações</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 font-semibold text-cereon-green">{coupon.code}</td>
                <td className="px-6 py-3 text-cereon-dark">{coupon.discount_percent}%</td>
                <td className="px-6 py-3 text-cereon-dark">
                  {new Date(coupon.expiry_date).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-3 text-cereon-dark">{coupon.max_uses || '∞'}</td>
                <td className="px-6 py-3 text-cereon-dark text-sm">
                  {Array.isArray(coupon.eligible_products) && coupon.eligible_products.length > 0
                    ? coupon.eligible_products
                        .map((id) => productsById[id]?.name || `#${id}`)
                        .join(', ')
                    : 'Todos'}
                </td>
                <td className="px-6 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEditCoupon(coupon)}
                      className="bg-blue-500 text-white px-3 py-1 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center gap-1"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteCoupon(coupon.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Deletar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Componente de Pedidos
function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const { token } = useAuth();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      // Carrega TODOS os pedidos (não apenas a primeira pagina)
      const allOrders = await loadAllPages(`${API_URL}/orders/`);
      setOrders(allOrders);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-cereon-dark">Pedidos dos Clientes</h2>

      {orders.length === 0 ? (
        <div className="bg-cereon-light p-8 rounded-lg text-center">
          <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-cereon-dark/70">Nenhum pedido ainda</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <motion.div
              key={order.id}
              className="bg-white border border-gray-200 rounded-lg p-6 shadow-md"
              whileHover={{ y: -2 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Número do Pedido</p>
                  <p className="font-bold text-cereon-dark">#{order.public_code || order.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <StatusBadge status={order.status} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="font-bold text-cereon-dark">{order.customer_email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Data</p>
                  <p className="font-bold text-cereon-dark">
                    {new Date(order.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="font-bold text-cereon-green">
                    R$ {parseFloat(order.total).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">Produtos:</p>
                <div className="space-y-1">
                  {order.items?.map((item, idx) => (
                    <p key={idx} className="text-cereon-dark">
                      • {item.product_name} x{item.quantity}
                    </p>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomersTab() {
  const { getValidToken } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const loadCustomers = async () => {
    setErr('');
    setLoading(true);
    try {
      const t = await getValidToken();
      if (!t) {
        setErr('Sessão expirada. Faça login novamente.');
        return;
      }
      const res = await axios.get(`${API_URL}/admin/customers/`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      setRows(res.data?.results || []);
    } catch (e) {
      setErr(e.response?.data?.detail || 'Erro ao carregar clientes.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-cereon-dark">Clientes</h2>
        <motion.button
          onClick={loadCustomers}
          className="bg-cereon-dark text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Atualizar
        </motion.button>
      </div>

      {err && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {err}
        </p>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-cereon-light border-b-2 border-cereon-green/30">
              <th className="px-6 py-3 text-left font-bold text-cereon-dark">ID</th>
              <th className="px-6 py-3 text-left font-bold text-cereon-dark">Nome</th>
              <th className="px-6 py-3 text-left font-bold text-cereon-dark">E-mail</th>
              <th className="px-6 py-3 text-left font-bold text-cereon-dark">CPF</th>
              <th className="px-6 py-3 text-left font-bold text-cereon-dark">Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-6 py-4 text-gray-500" colSpan={5}>
                  Carregando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-6 py-4 text-gray-500" colSpan={5}>
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-cereon-dark">{r.id}</td>
                  <td className="px-6 py-3 text-cereon-dark">{r.name_masked}</td>
                  <td className="px-6 py-3 text-cereon-dark">{r.email_masked}</td>
                  <td className="px-6 py-3 text-cereon-dark">{r.cpf_masked}</td>
                  <td className="px-6 py-3 text-cereon-dark">
                    {r.date_joined ? new Date(r.date_joined).toLocaleDateString('pt-BR') : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Componente de Analytics
function AnalyticsTab() {
  const [analytics, setAnalytics] = useState({
    total_sales: 0,
    total_orders: 0,
    top_products: [],
    top_coupon: null,
    monthly_revenue: 0
  });
  const { token } = useAuth();

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      // Endpoint público, não precisa de autenticação
      const response = await axios.get(`${API_URL}/analytics/`);
      // A API retorna um objeto direto com as estatísticas
      // Não tem paginação, é um objeto simples
      setAnalytics(response.data);
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
      // Dados dummy para demo
      setAnalytics({
        total_sales: 15480.50,
        total_orders: 42,
        top_products: [
          { name: 'Produto Premium', sales: 18 },
          { name: 'Acessório Popular', sales: 15 },
          { name: 'Produto Standard', sales: 9 }
        ],
        top_coupon: { code: 'PROMO20', uses: 23 },
        monthly_revenue: 5230.75
      });
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = 'cereon-green' }) => (
    <motion.div
      className={`bg-white border-l-4 border-${color} rounded-lg p-6 shadow-md`}
      whileHover={{ y: -5 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm mb-1">{title}</p>
          <p className={`text-3xl font-bold text-${color}`}>{value}</p>
        </div>
        <Icon className={`w-12 h-12 text-${color}/20`} />
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-cereon-dark">Analytics e Métricas</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Vendas Totais"
          value={`R$ ${parseFloat(analytics.total_sales).toFixed(2)}`}
          icon={ShoppingBag}
        />
        <StatCard
          title="Pedidos"
          value={analytics.total_orders}
          icon={Package}
        />
        <StatCard
          title="Receita (Mês)"
          value={`R$ ${parseFloat(analytics.monthly_revenue).toFixed(2)}`}
          icon={BarChart3}
        />
        <StatCard
          title="Ticket Médio"
          value={`R$ ${analytics.total_orders > 0 ? (analytics.total_sales / analytics.total_orders).toFixed(2) : '0.00'}`}
          icon={BarChart3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Produtos */}
        <motion.div
          className="bg-white rounded-lg shadow-md p-6"
          whileHover={{ y: -5 }}
        >
          <h3 className="text-xl font-bold text-cereon-dark mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-cereon-green" />
            Produtos Mais Vendidos
          </h3>
          <div className="space-y-3">
            {analytics.top_products.map((product, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-cereon-light rounded-lg">
                <span className="font-semibold text-cereon-dark">{idx + 1}. {product.name}</span>
                <span className="bg-cereon-green text-white px-3 py-1 rounded-full text-sm font-bold">
                  {product.sales} vendas
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Cupom Mais Usado */}
        {analytics.top_coupon && (
          <motion.div
            className="bg-white rounded-lg shadow-md p-6"
            whileHover={{ y: -5 }}
          >
            <h3 className="text-xl font-bold text-cereon-dark mb-4 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-cereon-green" />
              Cupom Mais Popular
            </h3>
            <div className="bg-gradient-to-r from-cereon-green to-cereon-green/60 rounded-lg p-6 text-white text-center">
              <p className="text-sm opacity-80 mb-2">Código</p>
              <p className="text-3xl font-bold mb-2">{analytics.top_coupon.code}</p>
              <p className="text-sm opacity-80">Usado {analytics.top_coupon.uses} vezes</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Dashboard Principal
export function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'categories', label: 'Categorias', icon: Tags },
    { id: 'coupons', label: 'Cupons', icon: Ticket },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'orders', label: 'Pedidos', icon: ShoppingBag }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-3xl font-bold text-cereon-green hover:text-cereon-green/80 transition-colors">
              CEREON
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-cereon-dark">Painel Admin</h1>
              <p className="text-sm text-gray-500">Bem-vindo, {user?.email}</p>
            </div>
          </div>
          
          <motion.button
            onClick={logout}
            className="hidden md:flex bg-red-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-600 transition-colors items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <LogOut className="w-5 h-5" />
            Sair
          </motion.button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-cereon-dark"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className={`flex flex-col md:flex-row gap-0 ${mobileMenuOpen ? 'flex' : 'hidden md:flex'}`}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-6 py-4 font-semibold flex items-center gap-2 border-b-4 transition-all ${
                    activeTab === tab.id
                      ? 'border-cereon-green text-cereon-green'
                      : 'border-transparent text-gray-600 hover:text-cereon-green'
                  }`}
                  whileHover={{ y: -2 }}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'analytics' && <AnalyticsTab />}
          {activeTab === 'products' && <ProductsTab />}
          {activeTab === 'categories' && <CategoriesTab />}
          {activeTab === 'coupons' && <CouponsTab />}
          {activeTab === 'customers' && <CustomersTab />}
          {activeTab === 'orders' && <OrdersTab />}
        </motion.div>
      </div>

      {/* Mobile logout button */}
      <div className="md:hidden fixed bottom-4 right-4">
        <motion.button
          onClick={logout}
          className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center gap-2 shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <LogOut className="w-5 h-5" />
          Sair
        </motion.button>
      </div>
    </div>
  );
}
