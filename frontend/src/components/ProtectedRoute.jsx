// Importações necessárias para roteamento protegido
import React from 'react';
// Navigate é usado para redirecionar usuários não autorizados
import { Navigate } from 'react-router-dom';
// Hook customizado que fornece dados de autenticação
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute - Componente que protege rotas da aplicação
 * 
 * Este componente atua como um "guardião" que controla acesso a certas páginas.
 * Verifica se:
 * 1. Usuário está autenticado (tem token válido)
 * 2. Se requerido, usuário é administrador (is_admin = true)
 * 
 * Se as condições não forem atendidas, redireciona para uma página apropriada:
 * - Se não autenticado: redireciona para /login
 * - Se autenticado mas não admin: redireciona para /home
 * - Se autenticado e é admin (se requerido): mostra a página
 * 
 * Uso no App.jsx:
 * <ProtectedRoute requireAdmin={true}>
 *   <Dashboard />
 * </ProtectedRoute>
 */
export function ProtectedRoute({ children, requireAdmin = false, customerOnly = false }) {
  // Obtém dados de autenticação do contexto
  const { token, user, isLoading, isAdmin } = useAuth();

  /**
   * Fase de carregamento
   * 
   * Enquanto a autenticação está sendo carregada do localStorage,
   * mostra um spinner (indicador de carregamento) para que a página
   * não renderize incorretamente no meio do processo
   */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        {/* Div com animação de spin para indicar carregamento */}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cereon-green"></div>
      </div>
    );
  }

  if (customerOnly) {
    if (!token) {
      return <Navigate to="/login" replace />;
    }
    if (isAdmin) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return children;
  }

  /**
   * Verifica se usuário está autenticado
   * 
   * Se não houver token (não autenticado), redireciona para página de login.
   * replace=true faz com que a página de login substitua a página anterior
   * no histórico do navegador (usuário não consegue voltar apenas clicando "voltar")
   */
  if (!token) {
    // Redireciona para /login para o usuário fazer login
    return <Navigate to="/login" replace />;
  }

  /**
   * Verifica se precisa de permissão de admin
   * 
   * Se a rota requer admin (requireAdmin=true) mas o usuário não é admin,
   * redireciona para home. Isto evita acesso não-autorizado ao dashboard
   */
  if (requireAdmin && !isAdmin) {
    // Redireciona para / (home) pois usuário não é admin
    return <Navigate to="/" replace />;
  }

  /**
   * Se passou em todas as verificações, mostra o conteúdo
   * 
   * Neste ponto sabemos que:
   * - Usuário está autenticado
   * - Se requisitado, usuário é admin
   * Portanto é seguro renderizar o componente protegido
   */
  return children;
}
