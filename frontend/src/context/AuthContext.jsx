// Importações necessárias do React para Context API e gerenciamento de estado
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../services/api';

// Cria um Context para armazenar dados de autenticação
// Context é como uma "variável global" acessível em toda a aplicação
// sem precisar passar props por vários componentes intermediários
const AuthContext = createContext();

/**
 * AuthProvider - Componente que fornece autenticação a toda aplicação
 * 
 * Este componente é responsável por:
 * 1. Manter o estado de autenticação (token, dados do usuário)
 * 2. Fornecer funções para login e logout
 * 3. Verificar sessão ao iniciar a aplicação
 * 4. Armazenar dados no localStorage para persistir entre recargas
 * 
 * Como usar:
 * - Envolver toda aplicação com <AuthProvider> em App.jsx
 * - Usar hook useAuth() dentro de componentes para acessar autenticação
 */
export function AuthProvider({ children }) {
  // Estado para armazenar dados do usuário autenticado
  // Exemplo: { email: "admin@email.com", is_staff: true, user_id: 1 }
  const [user, setUser] = useState(null);
  
  // Estado para controlar se está carregando dados da sessão
  // Útil para não mostrar interface enquanto carrega autenticação
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  
  // Estado para armazenar o token JWT de autenticação
  // Este token é enviado no header Authorization de todas requisições à API
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refresh_token'));

  const isTokenExpired = (jwtToken) => {
    if (!jwtToken) return true;
    try {
      const payload = JSON.parse(atob(jwtToken.split('.')[1]));
      return payload.exp * 1000 <= Date.now() + 30000;
    } catch (error) {
      return true;
    }
  };

  const refreshAccessToken = async () => {
    if (!refreshToken) return null;
    try {
      const response = await axios.post(`${API_URL}/token/refresh/`, {
        refresh: refreshToken
      });
      const newAccessToken = response.data?.access;
      if (!newAccessToken) return null;
      localStorage.setItem('token', newAccessToken);
      setToken(newAccessToken);
      return newAccessToken;
    } catch (error) {
      logout();
      return null;
    }
  };

  const getValidToken = async () => {
    if (token && !isTokenExpired(token)) {
      return token;
    }
    return refreshAccessToken();
  };

  /**
   * Effect: Verifica autenticação ao iniciar
   * 
   * Executado uma única vez quando o componente monta.
   * Tenta recuperar dados da sessão anterior do localStorage
   * isto permite que usuário permaneça autenticado após recarregar página
   */
  useEffect(() => {
    // Obtém token armazenado no localStorage
    const storedToken = localStorage.getItem('token');
    
    // Se existir token armazenado, restaura o estado
    if (storedToken) {
      setToken(storedToken);
      const storedRefreshToken = localStorage.getItem('refresh_token');
      if (storedRefreshToken) {
        setRefreshToken(storedRefreshToken);
      }
      
      // Também tenta recuperar dados do usuário se disponível
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          // Converte string JSON de volta para objeto JavaScript
          setUser(JSON.parse(storedUser));
        } catch (e) {
          // Se houver erro ao decodificar, loga no console
          console.error('Erro ao parsear user:', e);
        }
      }

      const firstLoginFlag = localStorage.getItem('isFirstTimeLogin') === 'true';
      if (storedUser && firstLoginFlag) {
        setIsFirstLogin(true);
      }
    }

    // Marca que terminou o carregamento
    // Agora a interface pode ser renderizada
    setIsLoading(false);
  }, []); // Array vazio = executa apenas uma vez ao montar

  /**
   * login - Realiza login do usuário
   *
   * Armazena token e dados do usuário tanto no estado React quanto no localStorage.
   *
   * Parâmetros:
   *   access (string): Token JWT retornado pelo backend
   *   userData (object): Dados do usuário, ex: { email, is_staff, user_id }
   */
  const login = (access, userData, refresh = null) => {
    // Armazena token no localStorage
    // localStorage persiste dados mesmo após fechar navegador
    const hadStoredUser = Boolean(localStorage.getItem('user'));
    localStorage.setItem('token', access);
    if (refresh) {
      localStorage.setItem('refresh_token', refresh);
      setRefreshToken(refresh);
    }
    
    if (!hadStoredUser) {
      localStorage.setItem('isFirstTimeLogin', 'true');
      setIsFirstLogin(true);
    }

    // Se dados do usuário foram fornecidos
    if (userData) {
      // Converte objeto para string JSON e armazena
      localStorage.setItem('user', JSON.stringify(userData));
      // Também armazena no estado React para reatividade
      setUser(userData);
    }
    
    // Atualiza estado do token
    setToken(access);
  };

  const updateUser = (partial) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  };

  /**
   * logout - Realiza logout do usuário
   * 
   * Remove todos os dados de autenticação tanto do React quanto do localStorage.
   * Após logout, usuário precisa fazer login novamente
   */
  const logout = () => {
    // Remove token do localStorage
    localStorage.removeItem('token');
    // Remove dados do usuário do localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('unseen_order_ids');
    localStorage.removeItem('isFirstTimeLogin');
    // Limpa estado no React
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setIsFirstLogin(false);
  };

  const clearFirstLogin = () => {
    localStorage.removeItem('isFirstTimeLogin');
    setIsFirstLogin(false);
  };

  /**
   * isAdmin - Verifica se usuário atual é administrador
   * 
   * Propriedade computada que verifica o flag is_staff.
   * Pode ser true (admin) ou false (usuário comum)
   * Usada no Navbar para decidir se mostra "Admin" link
   * E em ProtectedRoute para decidir se acessa dashboard
   */
  const isAdmin = user?.is_staff || user?.role === 'admin';

  // Retorna Provider que fornece autenticação a toda aplicação
  // value = dados/funções disponíveis para componentes filhos
  // children = componentes dentro de </AuthProvider>
  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, isAdmin, getValidToken, updateUser, isFirstLogin, clearFirstLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth - Hook para acessar dados de autenticação
 * 
 * Use dentro de componentes para obter:
 *   - user: dados do usuário atual
 *   - token: JWT token
 *   - isLoading: se está carregando autenticação
 *   - login(access, userData): função para fazer login
 *   - logout(): função para fazer logout
 *   - isAdmin: booleano se é admin
 * 
 * Exemplo de uso:
 *   const { user, login, logout, isAdmin } = useAuth();
 */
export const useAuth = () => {
  // Obtém o context AuthContext
  const context = useContext(AuthContext);
  
  // Verifica se está dentro de um AuthProvider
  // Se não estiver, lança erro pois precisa estar envolvido pelo provider
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  
  // Retorna o context com todos os dados de autenticação
  return context;
};
