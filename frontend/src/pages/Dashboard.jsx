import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';
import { Package, Ticket, ShoppingBag, BarChart3, Plus, Trash2, Edit2, LogOut, Menu, X, Search, Tags, Users, Percent, Loader2, Moon, Sun, Bell } from 'lucide-react';
import axios from 'axios';
import { CategoriesTab } from '../components/CategoriesTab';
import { ProductImageUploader } from '../components/ProductImageUploader';
import { API_URL } from '../services/api';

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
const loadAllPages = async (url, token = null) => {
  let allResults = [];
  let nextPage = url;
  
  while (nextPage) {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(nextPage, { headers });
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

const getCoverImageUrl = (images = []) => {
  if (!Array.isArray(images) || images.length === 0) return null;
  const cover = images.find((img) => img?.isCover || img?.is_cover);
  return cover?.url || images[0]?.url || null;
};

const mapImageForEditor = (img) => ({
  id: img?.id,
  url: img?.url,
  filename: img?.filename,
  isCover: Boolean(img?.isCover || img?.is_cover),
});

const hasCoverImage = (images = []) =>
  Array.isArray(images) && images.length > 0 && images.some((img) => img?.isCover || img?.is_cover);

function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [promotions, setPromotions] = useState([]);

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
    images: [],
    colors: [],
    sizes: [],
    is_active: true
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    images: [],
    colors: [],
    sizes: [],
    is_active: true
  });

  const { token, getValidToken } = useAuth();
  const { showAlert, showConfirm } = useAlert();

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      const allPromotions = await loadAllPages(`${API_URL}/promotions/`);
      setPromotions(allPromotions);
    } catch (error) {
      console.error('Erro ao carregar promoções:', error);
    }
  };

  const getProductPromotion = (productId) => {
    return promotions.find((promo) => {
      if (!promo.is_active) return false;

      const expired = new Date(promo.expiry_date) < new Date();
      if (expired) return false;

      return (
        Array.isArray(promo.products) &&
        promo.products.includes(productId)
      );
    });
  };
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
        showAlert('Sessão expirada. Faça login novamente.', { toast: true, type: 'error', duration: 4000 });
        return;
      }

      const categoryId = Number(formData.category);
      const priceValue = Number(formData.price);
      const stockValue = Number(formData.stock);

      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        showAlert('Selecione uma categoria válida.', { toast: true, type: 'error', duration: 4000 });
        return;
      }
      if (!Number.isFinite(priceValue) || priceValue < 0) {
        showAlert('Informe um preço válido.', { toast: true, type: 'error', duration: 4000 });
        return;
      }
      if (!Number.isInteger(stockValue) || stockValue < 0) {
        showAlert('Informe um estoque válido.', { toast: true, type: 'error', duration: 4000 });
        return;
      }
      if (!hasCoverImage(formData.images)) {
        showAlert('Defina uma foto de capa antes de salvar o produto.', { toast: true, type: 'error', duration: 4500 });
        return;
      }

      const colors = formData.colors ? formData.colors.split(',').map(c => c.trim()).filter(c => c) : [];
      const sizes = formData.sizes ? formData.sizes.split(',').map(s => s.trim()).filter(s => s) : [];

      const createPayload = {
        ...formData,
        colors,
        sizes,
        price: priceValue,
        stock: stockValue,
        category: categoryId,
        images: formData.images,
        image_url: getCoverImageUrl(formData.images),
        is_active: Boolean(formData.is_active),
      };
      console.log('[PRODUCT CREATE] payload', createPayload);
      await axios.post(`${API_URL}/products/`, createPayload, {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      setFormData({
        name: '',
        description: '',
        price: '',
        stock: '',
        category: '',
        images: [],
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
      showAlert('Erro ao adicionar produto: ' + errorMessage, { toast: true, type: 'error', duration: 4000 });
    }
  };

  const handleDeleteProduct = async (id) => {
    const confirmed = await showConfirm(
      'Esta ação não pode ser desfeita. O produto será removido permanentemente do painel e do catálogo.',
      {
        title: 'Excluir este produto?',
        confirmLabel: 'Sim, excluir',
        cancelLabel: 'Cancelar',
        danger: true,
        type: 'warning',
      }
    );
    if (!confirmed) return;

    try {
      const validToken = await getValidToken();
      if (!validToken) {
        showAlert('Sessão expirada. Faça login novamente.', { toast: true, type: 'error', duration: 4000 });
        return;
      }
      await axios.delete(`${API_URL}/products/${id}/`, {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      setShowEditForm(false);
      setEditingProduct(null);
      loadProducts();
      showAlert('Produto excluído com sucesso.', { toast: true, type: 'success', duration: 3000 });
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      const apiError = error.response?.data;
      const errorMessage =
        apiError?.detail || apiError?.error || error.message || 'Erro desconhecido.';
      showAlert(`Erro ao excluir produto: ${errorMessage}`, { toast: true, type: 'error', duration: 4000 });
    }
  };

  const handleDeactivateProduct = async (id) => {
    const confirmed = await showConfirm(
      'O produto será desativado e ficará oculto para clientes.',
      {
        title: 'Desativar este produto?',
        confirmLabel: 'Desativar',
        cancelLabel: 'Cancelar',
        danger: true,
        type: 'warning',
      }
    );
    if (!confirmed) return;

    try {
      const validToken = await getValidToken();
      if (!validToken) {
        showAlert('Sessão expirada. Faça login novamente.', { toast: true, type: 'error', duration: 4000 });
        return;
      }
      await axios.patch(`${API_URL}/products/${id}/`, { is_active: false }, {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      loadProducts();
      showAlert('Produto desativado com sucesso.', { toast: true, type: 'success', duration: 10000 });
    } catch (error) {
      showAlert('Erro ao desativar produto.', { toast: true, type: 'error', duration: 4000 });
    }
  };

  const handleOpenEdit = (product) => {
  setEditingProduct(product);

  const normalizedImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images.map(mapImageForEditor)
    : product.image_url
      ? [{
          id: `legacy-${product.id}`,
          url: normalizeImageUrl(product.image_url),
          filename: product.image_url.split('/').pop() || 'image.webp',
          isCover: true,
        }]
      : [];

  console.log('[EDIT OPEN] product.image_url', product.image_url, 'normalizedImages', normalizedImages);
  setEditFormData({
    name: product.name,
    description: product.description,
    price: product.price.toString(),
    stock: product.stock.toString(),
    category: product.category.toString(),
    images: normalizedImages,
    colors: Array.isArray(product.colors) ? product.colors.join(', ') : '',
    sizes: Array.isArray(product.sizes) ? product.sizes.join(', ') : '',
    is_active: product.is_active !== false,
  });

  setShowEditForm(true);

  window.scrollTo({
    top: 60,
    behavior: 'smooth',
  });
};
  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    try {
      const validToken = await getValidToken();
      if (!validToken) {
        showAlert('Sessão expirada. Faça login novamente.', { toast: true, type: 'error', duration: 4000 });
        return;
      }

      const categoryId = Number(editFormData.category);
      const priceValue = Number(editFormData.price);
      const stockValue = Number(editFormData.stock);

      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        showAlert('Selecione uma categoria válida.', { toast: true, type: 'error', duration: 4000 });
        return;
      }
      if (!Number.isFinite(priceValue) || priceValue < 0) {
        showAlert('Informe um preço válido.', { toast: true, type: 'error', duration: 4000 });
        return;
      }
      if (!Number.isInteger(stockValue) || stockValue < 0) {
        showAlert('Informe um estoque válido.', { toast: true, type: 'error', duration: 4000 });
        return;
      }
      if (!hasCoverImage(editFormData.images)) {
        showAlert('Mantenha ao menos uma foto de capa para salvar.', { toast: true, type: 'error', duration: 4500 });
        return;
      }

      const colors = editFormData.colors ? editFormData.colors.split(',').map(c => c.trim()).filter(c => c) : [];
      const sizes = editFormData.sizes ? editFormData.sizes.split(',').map(s => s.trim()).filter(s => s) : [];

      const updatePayload = {
        ...editFormData,
        colors,
        sizes,
        price: priceValue,
        stock: stockValue,
        category: categoryId,
        images: editFormData.images,
        image_url: getCoverImageUrl(editFormData.images),
        is_active: Boolean(editFormData.is_active),
      };
      console.log('[PRODUCT UPDATE] payload', updatePayload);
      await axios.patch(`${API_URL}/products/${editingProduct.id}/`, updatePayload, {
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
        images: [],
        colors: '',
        sizes: '',
        is_active: true
      });
      loadProducts();
      showAlert('Produto atualizado com sucesso!', { toast: true, type: 'success', duration: 4000 });
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      const apiError = error.response?.data;
      const errorMessage =
        apiError?.detail ||
        (apiError ? JSON.stringify(apiError) : error.message);
      showAlert('Erro ao atualizar produto: ' + errorMessage, { toast: true, type: 'error', duration: 4000 });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-cereon-dark">Gerenciar Produtos</h2>
        <motion.button
          onClick={() => {
            setShowEditForm(false);
            setEditingProduct(null);
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
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Imagens do Produto
              </label>
              <ProductImageUploader
                images={formData.images}
                onChange={(images) => setFormData({ ...formData, images })}
                maxImages={5}
              />
            </div>
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
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Imagens do Produto
              </label>
              <ProductImageUploader
                images={editFormData.images}
                onChange={(images) => setEditFormData({ ...editFormData, images })}
                maxImages={5}
                productId={editingProduct?.id}
              />
            </div>
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
                onClick={() => handleDeleteProduct(editingProduct.id)}
                className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Excluir
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
            {(product.image_url || getCoverImageUrl(product.images)) && (
              <div className="w-full aspect-square overflow-hidden rounded-lg mb-3">
                <img
                  src={product.image_url || getCoverImageUrl(product.images)}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-cereon-dark flex-1">{product.name}</h3>
              {!product.is_active && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-semibold whitespace-nowrap ml-2">
                  Desativado
                </span>
              )}
            </div>
            <p className="text-sm text-cereon-dark mb-2">
  {categories.find((c) => c.id === product.category)?.name || 'Sem categoria'}
</p>

<p className="text-sm text-cereon-dark mb-3 line-clamp-2">
  {product.description}
</p>

<div className="flex justify-between items-center mb-3">
  <div className="flex flex-col">
    {(() => {
      const promo = getProductPromotion(product.id);

      if (promo) {
        const originalPrice = parseFloat(product.price);

        const discountedPrice =
          originalPrice -
          (originalPrice * promo.discount_percent) / 100;

        return (
          <>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold w-fit mb-1">
              EM PROMOÇÃO
            </span>

            <span className="text-xs text-gray-400 line-through">
              R$ {originalPrice.toFixed(2)}
            </span>

            <span className="text-cereon-green font-bold text-lg">
              R$ {discountedPrice.toFixed(2)}
            </span>
          </>
        );
      }

      return (
        <span className="text-cereon-green font-bold">
          R$ {parseFloat(product.price).toFixed(2)}
        </span>
      );
    })()}
  </div>

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
                onClick={() => handleDeactivateProduct(product.id)}
                className="flex-1 bg-red-500 text-white px-3 py-2 rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Desativar
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Componente de Cupons
function EligibleProductsSelector({ products, selectedIds, onChange, label, emptyText }) {
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
          {label || 'Produtos elegíveis (opcional)'}
        </p>
        <span className="text-xs bg-cereon-green/10 text-cereon-green px-2 py-1 rounded-full font-semibold">
          Selecionados: {selectedProducts.length}
        </span>
      </div>
      <p className="text-xs text-gray-600">
        {emptyText || 'Se não selecionar nenhum produto, o cupom valerá para todos.'}
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
        showAlert('Sessão expirada. Faça login novamente.', { toast: true, type: 'error', duration: 4000 });
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
      showAlert('Erro ao adicionar cupom: ' + errorMessage, { toast: true, type: 'error', duration: 4000 });
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar este cupom?')) {
      try {
        const validToken = await getValidToken();
        if (!validToken) {
          showAlert('Sessão expirada. Faça login novamente.', { toast: true, type: 'error', duration: 4000 });
          return;
        }
        await axios.delete(`${API_URL}/coupons/${id}/`, {
          headers: { Authorization: `Bearer ${validToken}` }
        });
        loadCoupons();
      } catch (error) {
        showAlert('Erro ao deletar cupom', { toast: true, type: 'error', duration: 4000 });
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
        showAlert('Sessão expirada. Faça login novamente.', { toast: true, type: 'error', duration: 4000 });
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
      showAlert('Erro ao atualizar cupom: ' + errorMessage, { toast: true, type: 'error', duration: 4000 });
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

// Componente de Promoções
function PromotionsTab() {
  const [promotions, setPromotions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    discount_percent: '',
    expiry_date: '',
    products: [],
  });
  const { getValidToken } = useAuth();
  const productsById = products.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  useEffect(() => {
    loadPromotions();
    loadProducts();
  }, []);

  const loadPromotions = async () => {
    try {
      const allPromotions = await loadAllPages(`${API_URL}/promotions/`);
      setPromotions(allPromotions);
    } catch (error) {
      console.error('Erro ao carregar promoções:', error);
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

  const handleAddPromotion = async (e) => {
    e.preventDefault();
    try {
      const validToken = await getValidToken();
      if (!validToken) {
        showAlert('Sessão expirada. Faça login novamente.', { toast: true, type: 'error', duration: 4000 });
        return;
      }

      const payload = {
        name: formData.name,
        discount_percent: Number(formData.discount_percent),
        expiry_date: formData.expiry_date,
        products: Array.isArray(formData.products)
          ? formData.products.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0)
          : [],
      };

      await axios.post(`${API_URL}/promotions/`, payload, {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      setFormData({
        name: '',
        discount_percent: '',
        expiry_date: '',
        products: [],
      });
      setShowForm(false);
      loadPromotions();
      showAlert('Promoção criada com sucesso!', { toast: true, type: 'success', duration: 4000 });
    } catch (error) {
      const apiError = error.response?.data;
      const errorMessage =
        apiError?.detail ||
        (apiError ? JSON.stringify(apiError) : error.message);
      showAlert('Erro ao criar promoção: ' + errorMessage, { toast: true, type: 'error', duration: 4000 });
    }
  };

  const handleDeletePromotion = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar esta promoção?')) {
      try {
        const validToken = await getValidToken();
        if (!validToken) {
          showAlert('Sessão expirada. Faça login novamente.', { toast: true, type: 'error', duration: 4000 });
          return;
        }
        await axios.delete(`${API_URL}/promotions/${id}/`, {
          headers: { Authorization: `Bearer ${validToken}` }
        });
        loadPromotions();
        showAlert('Promoção deletada com sucesso!', { toast: true, type: 'success', duration: 4000 });
      } catch (error) {
        showAlert('Erro ao deletar promoção', { toast: true, type: 'error', duration: 4000 });
      }
    }
  };

  const handleOpenEditPromotion = (promo) => {
    const selectedProducts = Array.isArray(promo.products)
      ? promo.products.map((x) => String(x))
      : [];
    setEditingPromotion(promo);
    setFormData({
      name: promo.name || '',
      discount_percent: promo.discount_percent?.toString?.() || '',
      expiry_date: promo.expiry_date || '',
      products: selectedProducts,
    });
    setShowEditForm(true);
    setShowForm(false);
  };

  const handleUpdatePromotion = async (e) => {
    e.preventDefault();
    if (!editingPromotion) return;
    try {
      const validToken = await getValidToken();
      if (!validToken) {
        showAlert('Sessão expirada. Faça login novamente.', { toast: true, type: 'error', duration: 4000 });
        return;
      }

      const payload = {
        name: formData.name,
        discount_percent: Number(formData.discount_percent),
        expiry_date: formData.expiry_date,
        products: Array.isArray(formData.products)
          ? formData.products.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0)
          : [],
      };

      await axios.patch(`${API_URL}/promotions/${editingPromotion.id}/`, payload, {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      setFormData({
        name: '',
        discount_percent: '',
        expiry_date: '',
        products: [],
      });
      setShowEditForm(false);
      setEditingPromotion(null);
      loadPromotions();
      showAlert('Promoção atualizada com sucesso!', { toast: true, type: 'success', duration: 4000 });
    } catch (error) {
      const apiError = error.response?.data;
      const errorMessage =
        apiError?.detail ||
        (apiError ? JSON.stringify(apiError) : error.message);
      showAlert('Erro ao atualizar promoção: ' + errorMessage, { toast: true, type: 'error', duration: 4000 });
    }
  };

  const isExpired = (expiryDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    return expiry < today;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-cereon-dark">Gerenciar Promoções</h2>
        <motion.button
          onClick={() => {
            setShowEditForm(false);
            setEditingPromotion(null);
            setShowForm(!showForm);
          }}
          className="bg-cereon-green text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-cereon-green/90 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Percent className="w-5 h-5" />
          Nova Promoção
        </motion.button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-cereon-light p-6 rounded-lg border-2 border-cereon-green/30"
        >
          <form onSubmit={handleAddPromotion} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nome da Promoção"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
            </div>

            <EligibleProductsSelector
              products={products}
              selectedIds={formData.products}
              onChange={(products) => setFormData({ ...formData, products })}
              label="Produtos em Promoção"
              emptyText="Nenhum produto selecionado. Selecione os produtos que terão desconto aplicado automaticamente."
            />
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-cereon-green text-white px-6 py-2 rounded-lg font-semibold hover:bg-cereon-green/90 transition-colors"
              >
                Salvar Promoção
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

      {showEditForm && editingPromotion && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-cereon-light p-6 rounded-lg border-2 border-cereon-green/30"
        >
          <h3 className="text-xl font-bold text-cereon-dark mb-4">
            Editar Promoção: {editingPromotion.name}
          </h3>
          <form onSubmit={handleUpdatePromotion} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nome da Promoção"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
            </div>

            <EligibleProductsSelector
              products={products}
              selectedIds={formData.products}
              onChange={(products) => setFormData({ ...formData, products })}
              label="Produtos em Promoção"
              emptyText="Nenhum produto selecionado. Selecione os produtos que terão desconto aplicado automaticamente."
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
                  setEditingPromotion(null);
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
              <th className="px-6 py-3 text-left font-bold text-cereon-dark">Nome</th>
              <th className="px-6 py-3 text-left font-bold text-cereon-dark">Desconto</th>
              <th className="px-6 py-3 text-left font-bold text-cereon-dark">Expira em</th>
              <th className="px-6 py-3 text-left font-bold text-cereon-dark">Status</th>
              <th className="px-6 py-3 text-left font-bold text-cereon-dark">Produtos</th>
              <th className="px-6 py-3 text-left font-bold text-cereon-dark">Ações</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((promo) => (
              <tr key={promo.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 font-semibold text-cereon-green">{promo.name}</td>
                <td className="px-6 py-3 text-cereon-dark">{promo.discount_percent}%</td>
                <td className="px-6 py-3 text-cereon-dark">
                  {new Date(promo.expiry_date).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-3">
                  {promo.is_active && !isExpired(promo.expiry_date) ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                      Ativa
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                      {isExpired(promo.expiry_date) ? 'Expirada' : 'Inativa'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-cereon-dark text-sm">
                  {Array.isArray(promo.products) && promo.products.length > 0
                    ? promo.products
                        .map((id) => productsById[id]?.name || `#${id}`)
                        .join(', ')
                    : 'Nenhum produto'}
                </td>
                <td className="px-6 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEditPromotion(promo)}
                      className="bg-blue-500 text-white px-3 py-1 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center gap-1"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeletePromotion(promo.id)}
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
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('todos');
  const { token } = useAuth();

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, statusFilter]);

  const loadOrders = async () => {
    try {
      // Carrega TODOS os pedidos (não apenas a primeira pagina)
      const allOrders = await loadAllPages(`${API_URL}/orders/`, token);
      setOrders(allOrders);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  };

  const filterOrders = () => {
    if (statusFilter === 'todos') {
      setFilteredOrders(orders);
    } else if (statusFilter === 'vendidos') {
      setFilteredOrders(orders.filter(order => ['pago', 'confirmado', 'enviado', 'entregue'].includes(order.status)));
    } else if (statusFilter === 'cancelados') {
      setFilteredOrders(orders.filter(order => order.status === 'cancelado'));
    } else if (statusFilter === 'expirados') {
      setFilteredOrders(orders.filter(order => order.status === 'expirado'));
    } else if (statusFilter === 'pendentes') {
      setFilteredOrders(orders.filter(order => order.status === 'pendente'));
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pendente: 'Pendente',
      pago: 'Pago',
      expirado: 'Expirado',
      confirmado: 'Confirmado',
      enviado: 'Enviado',
      entregue: 'Entregue',
      cancelado: 'Cancelado',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-cereon-dark">Pedidos dos Clientes</h2>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-center">
        <label className="text-sm font-semibold text-cereon-dark">Filtrar por Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cereon-green"
        >
          <option value="todos">Todos</option>
          <option value="vendidos">Vendidos (Concluídos)</option>
          <option value="cancelados">Cancelados</option>
          <option value="expirados">Expirados</option>
          <option value="pendentes">Pendentes</option>
        </select>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-cereon-light p-8 rounded-lg text-center">
          <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-cereon-dark/70">Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-md">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Nome do Usuário</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Número do Pedido</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Email do Usuário</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Valor do Pedido</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status do Pedido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <React.Fragment key={order.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {order.customer_name || 'Cliente'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                      #{order.public_code || order.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {order.customer_email}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600 font-bold">
                      R$ {parseFloat(order.total).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td colSpan="5" className="px-6 py-4 text-sm text-gray-700">
                      <div className="space-y-1">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item, idx) => (
                            <div key={idx} className="text-xs">
                              x{item.quantity}: {item.product_name || 'Produto'}
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-500 italic">Nenhum produto</span>
                        )}
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
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
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

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

  const showCustomerOrders = async (customerId, customerName) => {
    try {
      console.log('Abrindo pedidos do cliente:', customerId, customerName);
      setSelectedCustomer({ id: customerId, name: customerName });
      setShowOrdersModal(true);
      setOrdersLoading(true);
      setCustomerOrders([]);
      
      const t = await getValidToken();
      if (!t) {
        console.error('Token não encontrado');
        setErr('Sessão expirada. Faça login novamente.');
        setShowOrdersModal(false);
        return;
      }
      
      console.log('Fazendo requisição para:', `${API_URL}/admin/customers/${customerId}/orders/`);
      const res = await axios.get(`${API_URL}/admin/customers/${customerId}/orders/`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      
      console.log('Resposta recebida:', res.data);
      setCustomerOrders(res.data?.orders || []);
    } catch (e) {
      console.error('Erro ao carregar pedidos do cliente:', e);
      console.error('Detalhes do erro:', e.response?.data || e.message);
      setCustomerOrders([]);
      // Não fecha o modal em caso de erro, apenas mostra que não carregou
    } finally {
      setOrdersLoading(false);
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
              <th className="px-6 py-3 text-left font-bold text-cereon-dark">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-6 py-4 text-gray-500" colSpan={6}>
                  Carregando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-6 py-4 text-gray-500" colSpan={6}>
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-cereon-dark">{r.id}</td>
                  <td className="px-6 py-3 text-cereon-dark">{r.name_masked}</td>
                  <td className="px-6 py-3 text-cereon-dark">{r.email}</td>
                  <td className="px-6 py-3 text-cereon-dark">{r.cpf_masked}</td>
                  <td className="px-6 py-3 text-cereon-dark">
                    {r.date_joined ? new Date(r.date_joined).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => showCustomerOrders(r.id, r.name_masked)}
                      className="bg-cereon-green text-white px-3 py-1 rounded text-sm font-medium hover:bg-cereon-green/90 transition-colors"
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Pedidos do Cliente */}
      {showOrdersModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowOrdersModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-cereon-dark">
                Pedidos de {selectedCustomer?.name}
              </h3>
              <button
                onClick={() => setShowOrdersModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {ordersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-cereon-green mr-2" />
                  <span>Carregando pedidos...</span>
                </div>
              ) : customerOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Nenhum pedido encontrado para este cliente.
                </p>
              ) : (
                <div className="space-y-4">
                  {customerOrders.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-cereon-dark">
                            Pedido {order.public_code || `#${order.id}`}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {new Date(order.created_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-cereon-green">
                            R$ {parseFloat(order.total || 0).toFixed(2)}
                          </p>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === 'pago' ? 'bg-green-100 text-green-800' :
                            order.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'cancelado' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {order.status === 'pago' ? 'Pago' :
                             order.status === 'pendente' ? 'Pendente' :
                             order.status === 'cancelado' ? 'Cancelado' :
                             order.status || 'Desconhecido'}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>
                          {order.items_count || 0} {(order.items_count || 0) === 1 ? 'item' : 'itens'}
                        </span>
                        <span>
                          {order.payment_method === 'pix' ? 'PIX' :
                           order.payment_method === 'cartao' ? 'Cartão' :
                           order.payment_method === 'boleto' ? 'Boleto' :
                           order.payment_method || '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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

function NotificationsTab() {
  const { showAlert } = useAlert();
  const { token, getValidToken } = useAuth();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'aviso',
    category: '',
    product: '',
    expires_at: '',
    is_active: true,
  });

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const validToken = await getValidToken();
      if (!validToken) return;
      const all = await loadAllPages(`${API_URL}/admin/notifications/`, validToken);
      setNotifications(all);
    } catch (e) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMeta = async () => {
    try {
      const [allCategories, allProducts] = await Promise.all([
        loadAllPages(`${API_URL}/categories/`),
        loadAllPages(`${API_URL}/products/`),
      ]);
      setCategories(allCategories);
      setProducts(allProducts);
    } catch (_) {
      setCategories([]);
      setProducts([]);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadNotifications();
    loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const validToken = await getValidToken();
      if (!validToken) {
        showAlert('Sessão expirada. Faça login novamente.', { toast: true, type: 'error', duration: 4000 });
        return;
      }

      const payload = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        type: formData.type,
        is_active: Boolean(formData.is_active),
        category: formData.category ? Number(formData.category) : null,
        product: formData.product ? Number(formData.product) : null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      };

      if (!payload.title || payload.title.length < 3) {
        showAlert('Informe um título válido.', { toast: true, type: 'error', duration: 4000 });
        return;
      }
      if (!payload.message || payload.message.length < 3) {
        showAlert('Informe uma mensagem válida.', { toast: true, type: 'error', duration: 4000 });
        return;
      }

      await axios.post(`${API_URL}/admin/notifications/`, payload, {
        headers: { Authorization: `Bearer ${validToken}` },
      });

      setFormData({
        title: '',
        message: '',
        type: 'aviso',
        category: '',
        product: '',
        expires_at: '',
        is_active: true,
      });
      showAlert('Notificação criada com sucesso.', { toast: true, type: 'success', duration: 3000 });
      loadNotifications();
    } catch (error) {
      const apiError = error.response?.data;
      const msg = apiError?.detail || (apiError ? JSON.stringify(apiError) : error.message);
      showAlert('Erro ao criar notificação: ' + msg, { toast: true, type: 'error', duration: 5000 });
    }
  };

  const handleDelete = async (id) => {
    try {
      const validToken = await getValidToken();
      if (!validToken) return;
      await axios.delete(`${API_URL}/admin/notifications/${id}/`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      showAlert('✓ Deletada', { toast: true, type: 'success', duration: 3000 });
      loadNotifications();
    } catch (e) {
      showAlert('Erro ao deletar notificação.', { toast: true, type: 'error', duration: 4000 });
    }
  };

  const badge = (type) => {
    const base = 'text-[11px] font-bold px-2 py-1 rounded-full';
    if (type === 'promocao') return `${base} ${isDark ? 'bg-green-900/40 text-green-200' : 'bg-green-100 text-green-800'}`;
    if (type === 'cupom') return `${base} ${isDark ? 'bg-yellow-900/40 text-yellow-200' : 'bg-yellow-100 text-yellow-800'}`;
    return `${base} ${isDark ? 'bg-blue-900/40 text-blue-200' : 'bg-blue-100 text-blue-800'}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-cereon-dark">Notificações</h2>
          <p className="text-sm text-gray-600">Crie avisos que aparecem para os usuários no sino da navbar.</p>
        </div>
        <button
          type="button"
          onClick={loadNotifications}
          className="px-4 py-2 rounded-lg font-semibold bg-cereon-green text-white hover:bg-cereon-green/90 transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
          Atualizar
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-cereon-dark mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-cereon-green" />
          Nova notificação
        </h3>

        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-1">Título</label>
            <input
              value={formData.title}
              onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Ex.: Novos cupons disponíveis!"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-1">Mensagem</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 min-h-24"
              placeholder="Escreva o conteúdo da notificação..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="promocao">Promoção</option>
              <option value="cupom">Cupom</option>
              <option value="aviso">Aviso</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
            <select
              value={formData.is_active ? '1' : '0'}
              onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.value === '1' }))}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="1">Ativa</option>
              <option value="0">Inativa</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Categoria (opcional)</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Produto (opcional)</label>
            <select
              value={formData.product}
              onChange={(e) => setFormData((p) => ({ ...p, product: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">—</option>
              {products.map((prod) => (
                <option key={prod.id} value={prod.id}>
                  {prod.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Expira em (opcional)</label>
            <input
              type="datetime-local"
              value={formData.expires_at}
              onChange={(e) => setFormData((p) => ({ ...p, expires_at: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
            />
            <p className="mt-1 text-xs text-gray-500">Após expirar, a notificação é removida automaticamente.</p>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full md:w-auto px-6 py-2 rounded-lg font-semibold bg-cereon-green text-white hover:bg-cereon-green/90 transition-colors"
            >
              Criar notificação
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold text-cereon-dark">Lista</h3>
          <span className="text-sm text-gray-600">Total: {notifications.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className={`${isDark ? 'bg-gray-800' : 'bg-gradient-to-r from-gray-50 to-gray-100'}`}>
              <tr>
                <th className={`px-6 py-4 text-left font-bold ${isDark ? 'text-gray-100' : 'text-cereon-dark'}`}>Tipo</th>
                <th className={`px-6 py-4 text-left font-bold ${isDark ? 'text-gray-100' : 'text-cereon-dark'}`}>Título</th>
                <th className={`px-6 py-4 text-left font-bold ${isDark ? 'text-gray-100' : 'text-cereon-dark'}`}>Ativa</th>
                <th className={`px-6 py-4 text-left font-bold ${isDark ? 'text-gray-100' : 'text-cereon-dark'}`}>Expira</th>
                <th className={`px-6 py-4 text-right font-bold ${isDark ? 'text-gray-100' : 'text-cereon-dark'}`}>Ações</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {notifications.map((n) => (
                <tr key={n.id} className={`hover:bg-opacity-50 transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                  <td className={`px-6 py-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    <span className={badge(n.type)}>{n.type}</span>
                  </td>
                  <td className={`px-6 py-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    <div className="font-semibold text-cereon-dark">{n.title}</div>
                    <div className={`text-xs truncate max-w-[36rem] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{n.message}</div>
                  </td>
                  <td className={`px-6 py-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${n.is_active ? 'bg-green-100 text-green-800' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                      {n.is_active ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {n.expires_at ? new Date(n.expires_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(n.id)}
                      className="text-red-600 hover:text-white hover:bg-red-600 font-semibold inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 hover:shadow-md"
                      title="Deletar notificação"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Deletar</span>
                    </button>
                  </td>
                </tr>
              ))}
              {notifications.length === 0 && (
                <tr>
                  <td colSpan={5} className={`px-6 py-8 text-sm text-center font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Nenhuma notificação cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Dashboard Principal
export function Dashboard() {
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('analytics');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'categories', label: 'Categorias', icon: Tags },
    { id: 'coupons', label: 'Cupons', icon: Ticket },
    { id: 'promotions', label: 'Promoções', icon: Percent },
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
          
          <div className="hidden md:flex items-center gap-3">
            <motion.button
              onClick={toggleTheme}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </motion.button>
            
            <motion.button
              onClick={logout}
              className="bg-red-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-600 transition-colors items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LogOut className="w-5 h-5" />
              Sair
            </motion.button>
          </div>

          <div className="md:hidden flex items-center gap-3">
            <motion.button
              onClick={toggleTheme}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 p-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </motion.button>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-cereon-dark"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
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
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'categories' && <CategoriesTab />}
          {activeTab === 'coupons' && <CouponsTab />}
          {activeTab === 'promotions' && <PromotionsTab />}
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
