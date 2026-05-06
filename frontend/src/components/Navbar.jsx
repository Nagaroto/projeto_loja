import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingCart, LogOut, Shield, User, Moon, Sun } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationsBell } from './NotificationsBell';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unseenOrdersCount, setUnseenOrdersCount] = useState(0);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const { cartItems, setIsCartOpen } = useCart();
  const { user, token, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    const refreshUnseenCount = () => {
      try {
        const raw = localStorage.getItem('unseen_order_ids');
        const parsed = raw ? JSON.parse(raw) : [];
        setUnseenOrdersCount(Array.isArray(parsed) ? parsed.length : 0);
      } catch {
        setUnseenOrdersCount(0);
      }
    };

    refreshUnseenCount();
    window.addEventListener('storage', refreshUnseenCount);
    window.addEventListener('focus', refreshUnseenCount);
    return () => {
      window.removeEventListener('storage', refreshUnseenCount);
      window.removeEventListener('focus', refreshUnseenCount);
    };
  }, []);

  const navLinks = [
    { to: '/', label: 'Início' },
    { to: '/sobre', label: 'Sobre' },
    { to: '/catalogo', label: 'Catálogo' },
    { to: '/favoritos', label: 'Favoritos' },
  ];

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  return (
    <nav className={`${isDark ? 'bg-gray-900' : 'bg-white'} shadow-lg sticky top-0 z-50`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link 
            to="/"
            className="flex items-center space-x-2 group"
          >
            <span className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-cereon-dark'} hover:text-cereon-green transition-colors`}>
              CEREON
            </span>
          </Link>

          {/* Links Desktop */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`font-medium transition-colors ${isDark ? 'text-gray-100 hover:text-green-300' : 'text-cereon-dark hover:text-cereon-green'} duration-300`}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Link Admin */}
            {isAdmin && (
              <Link
                to="/admin/dashboard"
                className={`font-semibold flex items-center gap-1 transition-colors ${isDark ? 'text-green-300 hover:text-green-200' : 'text-cereon-green hover:text-cereon-green/80'}`}
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            )}

            {token && !isAdmin && (
              <div
                className="relative"
                onMouseEnter={() => setIsAccountMenuOpen(true)}
                onMouseLeave={() => setIsAccountMenuOpen(false)}
              >
                <Link
                  to="/minha-conta"
                  className={`${isDark ? 'text-gray-100' : 'text-cereon-dark'} font-medium flex items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                    isDark 
                      ? 'hover:text-cereon-green hover:bg-cereon-green/15' 
                      : 'hover:text-cereon-green hover:bg-cereon-light/60'
                  }`}
                >
                  <User className="w-4 h-4" />
                  Minha conta
                  {unseenOrdersCount > 0 && (
                    <span className="ml-1 text-[10px] bg-red-500 text-white rounded-full min-w-5 h-5 px-1 flex items-center justify-center font-bold">
                      {unseenOrdersCount}
                    </span>
                  )}
                </Link>
                <AnimatePresence>
                  {isAccountMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="absolute left-0 top-full pt-2 min-w-64 z-50"
                    >
                      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-cereon-green/20'} border rounded-xl shadow-xl overflow-hidden`}>
                        <div className={`px-4 py-2 ${isDark ? 'bg-cereon-green/20 border-gray-700' : 'bg-cereon-light/80 border-cereon-green/10'} border-b`}>
                          <p className={`text-xs font-semibold tracking-wide uppercase ${isDark ? 'text-cereon-green' : 'text-cereon-green'}`}>
                            Minha conta
                          </p>
                        </div>
                        <Link to="/minha-conta?secao=dados" className={`block px-4 py-2.5 text-sm ${isDark ? 'text-gray-100 hover:bg-gray-700/60' : 'text-cereon-dark hover:bg-cereon-light'} transition-colors`}>
                          Dados pessoais
                        </Link>
                        <Link to="/minha-conta?secao=enderecos" className={`block px-4 py-2.5 text-sm ${isDark ? 'text-gray-100 hover:bg-gray-700/60' : 'text-cereon-dark hover:bg-cereon-light'} transition-colors`}>
                          Endereços
                        </Link>
                        <Link to="/minha-conta?secao=seguranca" className={`block px-4 py-2.5 text-sm ${isDark ? 'text-gray-100 hover:bg-gray-700/60' : 'text-cereon-dark hover:bg-cereon-light'} transition-colors`}>
                          Conta e segurança
                        </Link>
                        <Link to="/minha-conta?secao=compras&sub=pedidos" className={`block px-4 py-2.5 text-sm ${isDark ? 'text-gray-100 hover:bg-gray-700/60' : 'text-cereon-dark hover:bg-cereon-light'} transition-colors flex items-center justify-between`}>
                          <span>Meus pedidos</span>
                          {unseenOrdersCount > 0 && (
                            <span className="text-[10px] bg-red-500 text-white rounded-full min-w-5 h-5 px-1 flex items-center justify-center font-bold">
                              {unseenOrdersCount}
                            </span>
                          )}
                        </Link>
                        <Link to="/minha-conta?secao=cupons" className={`block px-4 py-2.5 text-sm ${isDark ? 'text-gray-100 hover:bg-gray-700/60' : 'text-cereon-dark hover:bg-cereon-light'} transition-colors`}>
                          Cupons
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Carrinho + Login + Menu Mobile */}
          <div className="flex items-center space-x-4">
            {/* Tema */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 ${isDark ? 'text-gray-100 hover:bg-gray-700' : 'text-cereon-dark hover:bg-cereon-light'} rounded-lg transition-colors`}
              aria-label="Alternar tema"
              title="Alternar tema"
            >
              {isDark ? <Sun size={22} /> : <Moon size={22} />}
            </button>

            {/* Notificações */}
            <NotificationsBell />

            {/* Carrinho */}
            <button
              onClick={() => setIsCartOpen(true)}
              className={`relative p-2 ${isDark ? 'text-gray-100 hover:bg-gray-700' : 'text-cereon-dark hover:bg-cereon-light'} rounded-lg transition-colors`}
              aria-label="Carrinho"
            >
              <ShoppingCart size={24} />
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Login/Logout */}
            {!token ? (
              <Link
                to="/login"
                className="hidden sm:block px-4 py-2 bg-cereon-green text-white font-medium rounded-lg hover:bg-cereon-green/90 transition-colors"
              >
                Login
              </Link>
            ) : (
              <button
                onClick={handleLogout}
                className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
              >
                <LogOut size={18} />
                <span>Sair</span>
              </button>
            )}

            {/* Menu Mobile */}
            <button
              onClick={toggleMenu}
              className={`md:hidden p-2 ${isDark ? 'text-gray-100 hover:bg-gray-700' : 'text-cereon-dark hover:bg-cereon-light'} rounded-lg transition-colors`}
              aria-label="Menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Menu Mobile */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={`md:hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-cereon-light border-gray-200'} border-t`}
            >
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`block px-3 py-2 rounded-lg ${isDark ? 'text-gray-100 hover:bg-gray-700' : 'text-cereon-dark hover:bg-white'} font-medium transition-colors`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                
                {/* Admin Link Mobile */}
                {isAdmin && (
                  <Link
                    to="/admin/dashboard"
                    className={`block px-3 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors ${isDark ? 'text-green-300 hover:bg-gray-700' : 'text-cereon-green hover:bg-white'}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </Link>
                )}

                {token && !isAdmin && (
                  <Link
                    to="/minha-conta"
                    className={`block px-3 py-2 rounded-lg ${isDark ? 'text-gray-100 hover:bg-gray-700' : 'text-cereon-dark hover:bg-white'} font-medium transition-colors flex items-center gap-2`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    Minha conta
                  </Link>
                )}

                {token && !isAdmin && (
                  <Link
                    to="/minha-conta?secao=compras&sub=pedidos"
                    className={`block px-3 py-2 rounded-lg ${isDark ? 'text-gray-100 hover:bg-gray-700' : 'text-cereon-dark hover:bg-white'} font-medium transition-colors flex items-center justify-between`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span>Meus pedidos</span>
                    {unseenOrdersCount > 0 && (
                      <span className="ml-2 text-[10px] bg-red-500 text-white rounded-full min-w-5 h-5 px-1 flex items-center justify-center font-bold">
                        {unseenOrdersCount}
                      </span>
                    )}
                  </Link>
                )}
                
                {!token ? (
                  <Link
                    to="/login"
                    className="block w-full mt-2 px-3 py-2 bg-cereon-green text-white font-medium rounded-lg hover:bg-cereon-green/90 transition-colors text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                ) : (
                  <button
                    onClick={handleLogout}
                    className="block w-full mt-2 px-3 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors text-center"
                  >
                    Sair
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
