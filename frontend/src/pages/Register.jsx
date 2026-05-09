import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, UserPlus, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../services/api';

export function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: searchParams.get('email') || '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('As senhas não coincidem.');
      return;
    }
    if (formData.password.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/register/`, {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        username: formData.email.trim().toLowerCase(),
      });

      const loginRes = await axios.post(`${API_URL}/login/`, {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      const { access, refresh, is_staff, user_id } = loginRes.data;
      login(
        access,
        {
          email: formData.email.trim().toLowerCase(),
          is_staff: is_staff || false,
          user_id,
        },
        refresh
      );
      navigate('/');
    } catch (error) {
      const detail =
        error.response?.data?.detail ||
        error.response?.data?.email?.[0] ||
        (error.response?.data ? JSON.stringify(error.response.data) : error.message);
      alert('Não foi possível criar a conta: ' + detail);
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  return (
    <div className="min-h-screen bg-white font-sans flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-cereon-green opacity-5 rounded-full blur-3xl -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cereon-green opacity-5 rounded-full blur-3xl -ml-48 -mb-48" />

      <motion.div
        className="w-full max-w-md relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={itemVariants}
          className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300"
        >
          <div className="text-center mb-8">
            <motion.h1 variants={itemVariants} className="text-4xl font-bold text-cereon-dark mb-2">
              Criar conta
            </motion.h1>
            <motion.p variants={itemVariants} className="text-cereon-dark/70">
              Cadastre-se para acompanhar pedidos e gerenciar seus dados
            </motion.p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div variants={itemVariants} className="space-y-2">
              <label className="text-sm font-semibold text-cereon-dark ml-1">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-cereon-green transition-colors duration-300" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-cereon-light border-2 border-gray-200 text-cereon-dark rounded-lg py-3 pl-11 pr-4 outline-none focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 transition-all duration-300 font-medium placeholder:text-cereon-dark/40"
                  placeholder="seu@email.com"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-2">
              <label className="text-sm font-semibold text-cereon-dark ml-1">Senha</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-cereon-green transition-colors duration-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-cereon-light border-2 border-gray-200 text-cereon-dark rounded-lg py-3 pl-11 pr-12 outline-none focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 transition-all duration-300 font-medium placeholder:text-cereon-dark/40"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-cereon-dark transition-colors duration-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-2">
              <label className="text-sm font-semibold text-cereon-dark ml-1">Confirmar senha</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-cereon-green transition-colors duration-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  minLength={6}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full bg-cereon-light border-2 border-gray-200 text-cereon-dark rounded-lg py-3 pl-11 pr-4 outline-none focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 transition-all duration-300 font-medium placeholder:text-cereon-dark/40"
                  placeholder="••••••••"
                />
              </div>
            </motion.div>

            <motion.button
              variants={itemVariants}
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-cereon-green hover:bg-cereon-green/90 disabled:opacity-60 text-white font-bold py-3 rounded-lg transition-all duration-300 shadow-lg shadow-cereon-green/20 flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Criando conta...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Cadastrar
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>
          </form>

          <motion.p variants={itemVariants} className="text-center mt-8 text-cereon-dark/70 font-medium">
            Já tem uma conta?{' '}
            <Link
              to="/login"
              className="text-cereon-green font-bold hover:text-cereon-green/80 transition-colors duration-300"
            >
              Entrar
            </Link>
          </motion.p>
        </motion.div>
      </motion.div>
    </div>
  );
}
