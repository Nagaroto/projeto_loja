import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingCart, LogOut, Shield, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { cartItems, setIsCartOpen } = useCart();
  const { user, token, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const navLinks = [
    { to: '/', label: 'Início' },
    { to: '/sobre', label: 'Sobre' },
    { to: '/catalogo', label: 'Catálogo' },
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
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link 
            to="/"
            className="flex items-center space-x-2 group"
          >
            <span className="text-2xl font-bold text-cereon-dark hover:text-cereon-green transition-colors">
              CEREON
            </span>
          </Link>

          {/* Links Desktop */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-cereon-dark font-medium hover:text-cereon-green transition-colors duration-300"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Link Admin */}
            {isAdmin && (
              <Link
                to="/admin/dashboard"
                className="text-cereon-green font-semibold flex items-center gap-1 hover:text-cereon-green/80 transition-colors"
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            )}

            {token && !isAdmin && (
              <Link
                to="/minha-conta"
                className="text-cereon-dark font-medium flex items-center gap-1 hover:text-cereon-green transition-colors"
              >
                <User className="w-4 h-4" />
                Minha conta
              </Link>
            )}
          </div>

          {/* Carrinho + Login + Menu Mobile */}
          <div className="flex items-center space-x-4">
            {/* Carrinho */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-cereon-dark hover:bg-cereon-light rounded-lg transition-colors"
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
              className="md:hidden p-2 text-cereon-dark hover:bg-cereon-light rounded-lg transition-colors"
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
              className="md:hidden bg-cereon-light border-t border-gray-200"
            >
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="block px-3 py-2 rounded-lg text-cereon-dark font-medium hover:bg-white transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                
                {/* Admin Link Mobile */}
                {isAdmin && (
                  <Link
                    to="/admin/dashboard"
                    className="block px-3 py-2 rounded-lg text-cereon-green font-semibold hover:bg-white transition-colors flex items-center gap-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </Link>
                )}

                {token && !isAdmin && (
                  <Link
                    to="/minha-conta"
                    className="block px-3 py-2 rounded-lg text-cereon-dark font-medium hover:bg-white transition-colors flex items-center gap-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    Minha conta
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
