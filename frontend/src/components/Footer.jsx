import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function Footer() {
  const { isDark } = useTheme();
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`${isDark ? 'bg-gray-900' : 'bg-cereon-dark'} text-white py-12 mt-20`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Sobre */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-cereon-green">Cereon</h3>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-white/70' : 'text-gray-400'}`}>
              Moda exclusiva e sustentável para quem valoriza estilo e qualidade.
            </p>
          </div>

          {/* Links Úteis */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Links Úteis</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className={`${isDark ? 'text-white/70 hover:text-cereon-green' : 'text-gray-400 hover:text-cereon-green'} transition-colors`}>
                  Início
                </Link>
              </li>
              <li>
                <Link to="/catalogo" className={`${isDark ? 'text-white/70 hover:text-cereon-green' : 'text-gray-400 hover:text-cereon-green'} transition-colors`}>
                  Catálogo
                </Link>
              </li>
              <li>
                <Link to="/sobre" className={`${isDark ? 'text-white/70 hover:text-cereon-green' : 'text-gray-400 hover:text-cereon-green'} transition-colors`}>
                  Sobre Nós
                </Link>
              </li>
            </ul>
          </div>

          {/* Política */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Política</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className={`${isDark ? 'text-white/70 hover:text-cereon-green' : 'text-gray-400 hover:text-cereon-green'} transition-colors`}>
                  Privacidade
                </a>
              </li>
              <li>
                <a href="#" className={`${isDark ? 'text-white/70 hover:text-cereon-green' : 'text-gray-400 hover:text-cereon-green'} transition-colors`}>
                  Termos de Uso
                </a>
              </li>
              <li>
                <a href="#" className={`${isDark ? 'text-white/70 hover:text-cereon-green' : 'text-gray-400 hover:text-cereon-green'} transition-colors`}>
                  Trocas e Devoluções
                </a>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Contato</h4>
            <ul className="space-y-3">
              <li className={`flex items-center space-x-2 ${isDark ? 'text-white/70 hover:text-cereon-green' : 'text-gray-400 hover:text-cereon-green'} transition-colors`}>
                <Mail size={18} />
                <span>contato@cereon.com</span>
              </li>
              <li className={`flex items-center space-x-2 ${isDark ? 'text-white/70 hover:text-cereon-green' : 'text-gray-400 hover:text-cereon-green'} transition-colors`}>
                <Phone size={18} />
                <span>(11) 3000-0000</span>
              </li>
              <li className={`flex items-center space-x-2 ${isDark ? 'text-white/70 hover:text-cereon-green' : 'text-gray-400 hover:text-cereon-green'} transition-colors`}>
                <MapPin size={18} />
                <span>São Paulo, SP</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divisor - sutil no dark mode */}
        <hr className={`${isDark ? 'border-white/10' : 'border-gray-700'} mb-8`} />

        {/* Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © {currentYear} Cereon Digital Systems. Todos os direitos reservados.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="https://www.instagram.com/cereonsystems/" className="text-gray-400 hover:text-cereon-green transition-colors">
              Instagram
            </a>
            <a href="#" className="text-gray-400 hover:text-cereon-green transition-colors">
              Facebook
            </a>
            <a href="#" className="text-gray-400 hover:text-cereon-green transition-colors">
              Twitter
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
