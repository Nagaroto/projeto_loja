import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api';

// Lista completa de um endpoint paginado; token opcional para rotas autenticadas.
const loadAllPages = async (url, token = null) => {
  let allResults = [];
  let nextPage = url;
  
  while (nextPage) {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.get(nextPage, config);
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

export function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: ''
  });
  const { token, getValidToken } = useAuth();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const allCategories = await loadAllPages(`${API_URL}/categories/`);
      setCategories(allCategories);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    
    if (!token) {
      alert('Você precisa estar logado para criar categorias. Faça login primeiro.');
      return;
    }

    try {
      await axios.post(`${API_URL}/categories/`, categoryFormData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setCategoryFormData({ name: '', description: '' });
      setShowForm(false);
      await loadCategories();
      alert('Categoria criada com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar categoria:', error);
      const errorMsg = error.response?.data?.detail || error.response?.data?.name?.[0] || error.message;
      alert('Erro ao adicionar categoria: ' + errorMsg);
    }
  };

  const handleEditCategory = (category) => {
    if (!token) {
      alert('Você precisa estar logado para editar categorias. Faça login primeiro.');
      return;
    }
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || ''
    });
    setShowForm(true);
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    
    if (!token) {
      alert('Você precisa estar logado para atualizar categorias. Faça login primeiro.');
      return;
    }

    try {
      console.log('Token para update:', token);
      console.log('Dados sendo enviados:', categoryFormData);
      
      await axios.patch(
        `${API_URL}/categories/${editingCategory.id}/`,
        categoryFormData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setCategoryFormData({ name: '', description: '' });
      setEditingCategory(null);
      setShowForm(false);
      await loadCategories();
      alert('Categoria atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      console.error('Status:', error.response?.status);
      console.error('Headers enviados:', error.config?.headers);
      const errorMsg = error.response?.data?.detail || error.response?.data?.name?.[0] || error.message;
      alert('Erro ao atualizar categoria: ' + errorMsg);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!token) {
      alert('Você precisa estar logado para deletar categorias. Faça login primeiro.');
      return;
    }

    if (window.confirm('Tem certeza que deseja deletar esta categoria? Todos os produtos associados serão marcados como "Não Publicado".')) {
      try {
        const validToken = await getValidToken();
        if (!validToken) {
          alert('Sessão expirada. Faça login novamente.');
          return;
        }
        
        await axios.delete(`${API_URL}/categories/${id}/`, {
          headers: { 
            Authorization: `Bearer ${validToken}`,
            'Content-Type': 'application/json'
          }
        });

        await loadCategories();
        alert('Categoria deletada com sucesso! Os produtos associados foram marcados como "Não Publicado".');
      } catch (error) {
        console.error('Erro ao deletar categoria:', error);
        console.error('Status:', error.response?.status);
        console.error('Headers enviados:', error.config?.headers);
        const errorMsg = error.response?.data?.detail || error.message;
        alert('Erro ao deletar categoria: ' + errorMsg);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-cereon-dark">Gerenciar Categorias</h2>
        <motion.button
          onClick={() => {
            if (!token) {
              alert('Você precisa estar logado para criar categorias. Faça login primeiro.');
              return;
            }
            setEditingCategory(null);
            setCategoryFormData({ name: '', description: '' });
            setShowForm(!showForm);
          }}
          disabled={!token}
          className={`px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors ${
            token
              ? 'bg-cereon-green text-white hover:bg-cereon-green/90 cursor-pointer'
              : 'bg-gray-300 text-gray-600 cursor-not-allowed'
          }`}
          whileHover={token ? { scale: 1.05 } : {}}
          whileTap={token ? { scale: 0.95 } : {}}
        >
          <Plus className="w-5 h-5" />
          Nova Categoria
        </motion.button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-cereon-light p-6 rounded-lg border-2 border-cereon-green/30"
        >
          <h3 className="text-lg font-bold text-cereon-dark mb-4">
            {editingCategory ? `Editar: ${editingCategory.name}` : 'Nova Categoria'}
          </h3>
          <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory} className="space-y-3">
            <input
              type="text"
              placeholder="Nome da Categoria"
              required
              value={categoryFormData.name}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
            />
            <textarea
              placeholder="Descrição (opcional)"
              value={categoryFormData.description}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 outline-none"
              rows="3"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-cereon-green text-white px-4 py-2 rounded-lg font-semibold hover:bg-cereon-green/90 transition-colors"
              >
                {editingCategory ? 'Atualizar' : 'Criar'} Categoria
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingCategory(null);
                  setCategoryFormData({ name: '', description: '' });
                }}
                className="flex-1 bg-gray-300 text-cereon-dark px-4 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.length > 0 ? (
          categories.map((category) => (
            <motion.div
              key={category.id}
              className="bg-white border-l-4 border-cereon-green rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow"
              whileHover={{ y: -3 }}
            >
              <h4 className="font-bold text-cereon-dark text-lg mb-1">{category.name}</h4>
              {category.description && (
                <p className="text-sm text-cereon-dark mb-4 line-clamp-2">{category.description}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditCategory(category)}
                  disabled={!token}
                  className={`flex-1 px-3 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1 ${
                    token
                      ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
                      : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  disabled={!token}
                  className={`flex-1 px-3 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1 ${
                    token
                      ? 'bg-red-500 text-white hover:bg-red-600 cursor-pointer'
                      : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  Deletar
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            <p className="text-cereon-dark/60">Nenhuma categoria criada. Clique em "Nova Categoria" para começar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
