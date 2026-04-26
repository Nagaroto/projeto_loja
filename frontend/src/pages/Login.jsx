import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, Chrome, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';

const API_URL = 'http://127.0.0.1:8000/api';

function messageFromApiError(data) {
  if (!data) return 'Não foi possível entrar. Tente novamente.';
  if (typeof data.detail === 'string') return data.detail;
  const nfe = data.non_field_errors;
  if (Array.isArray(nfe)) return nfe.join(' ');
  if (typeof nfe === 'string') return nfe;
  const first = Object.values(data).flat().filter(Boolean);
  if (first.length) return first.join(' ');
  return 'Verifique e-mail e senha.';
}

export function Login() {
  const { login } = useAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdownMessage, setCountdownMessage] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  useEffect(() => {
    // Check localStorage for existing block
    const blockEnd = localStorage.getItem('loginBlockEnd');
    if (blockEnd) {
      const endTime = parseInt(blockEnd);
      const now = Date.now();
      if (now < endTime) {
        const remaining = Math.ceil((endTime - now) / 1000);
        setCountdownMessage(`Muitas tentativas. Tente novamente em ${remaining} segundos.`);
      } else {
        localStorage.removeItem('loginBlockEnd');
      }
    }
  }, []);

  useEffect(() => {
    if (countdownMessage) {
      setIsBlocked(true);
      const interval = setInterval(() => {
        setCountdownMessage(prev => {
          const match = prev.match(/(\d+)/);
          if (match) {
            const seconds = parseInt(match[1]) - 1;
            if (seconds > 0) {
              return prev.replace(/\d+/, seconds);
            } else {
              setIsBlocked(false);
              localStorage.removeItem('loginBlockEnd');
              return '';
            }
          }
          return prev;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setIsBlocked(false);
    }
  }, [countdownMessage]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/login/`, {
        email: formData.email.trim(),
        password: formData.password,
      });

      const { access, refresh } = response.data;
      // Criar objeto de usuário com dados retornados (adjust conforme o backend)
      const userData = {
        email: formData.email,
        is_staff: response.data.is_staff || false,
        role: response.data.role || null,
        user_id: response.data.user_id,
      };
      
      login(access, userData, refresh);
      
      // Mensagem diferente para admin e usuário comum
      const mensagem = userData.is_staff ? 'Login admin realizado' : 'Login realizado';
      showAlert(mensagem, { toast: true, type: 'success', duration: 4000 });
      
      // Redirecionar para admin se for admin, senão para home
      if (userData.is_staff) {
        navigate('/admin/dashboard');
      } else {
        navigate('/minha-conta');
      }
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;

      if (status === 429) {
        // Rate limit exceeded
        const wait = data?.wait || 60;
        const endTime = Date.now() + wait * 1000;
        localStorage.setItem('loginBlockEnd', endTime.toString());
        setCountdownMessage(`Muitas tentativas. Tente novamente em ${wait} segundos.`);
      } else if (status === 400 || status === 401) {
        const msg = messageFromApiError(data);
        const notFound =
          /não encontramos|não encontrado|não foi encontrado/i.test(msg);

        if (notFound) {
          const querCadastrar = window.confirm(
            `${msg}\n\nDeseja criar uma nova conta com este e-mail e senha?`
          );
          if (querCadastrar) {
            try {
              setIsLoading(true);
              await axios.post(`${API_URL}/register/`, {
                email: formData.email.trim(),
                password: formData.password,
                username: formData.email.trim(),
              });
              alert('Cadastro realizado com sucesso. Você já pode entrar.');
            } catch (regError) {
              const d = regError.response?.data;
              alert(`Erro no cadastro: ${messageFromApiError(d)}`);
            }
          }
        } else {
          alert(msg);
        }
      } else if (error.response) {
        alert(messageFromApiError(error.response.data));
      } else {
        alert(
          'Não foi possível conectar ao servidor. Confira se o backend está rodando.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  };

  return (
    <div className="min-h-screen bg-white font-sans flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements - subtle green */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cereon-green opacity-5 rounded-full blur-3xl -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cereon-green opacity-5 rounded-full blur-3xl -ml-48 -mb-48" />

      <motion.div
        className="w-full max-w-md relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Card Principal */}
        <motion.div
          variants={itemVariants}
          className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.h1
              variants={itemVariants}
              className="text-4xl font-bold text-cereon-dark mb-2"
            >
              Bem-vindo
            </motion.h1>
            <motion.p
              variants={itemVariants}
              className="text-cereon-dark/70"
            >
              Entre na sua conta para continuar
            </motion.p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo Email */}
            <motion.div variants={itemVariants} className="space-y-2">
              <label className="text-sm font-semibold text-cereon-dark ml-1">E-mail ou usuário</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-cereon-green transition-colors duration-300" />
                <input
                  type="email"
                  name="email"
                  required
                  disabled={isBlocked}
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-cereon-light border-2 border-gray-200 text-cereon-dark rounded-lg py-3 pl-11 pr-4 outline-none focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 transition-all duration-300 font-medium placeholder:text-cereon-dark/40 disabled:opacity-50"
                  placeholder="seu@email.com"
                />
              </div>
            </motion.div>

            {/* Campo Senha */}
            <motion.div variants={itemVariants} className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-semibold text-cereon-dark">Senha</label>
                <button
                  type="button"
                  className="text-xs font-medium text-cereon-green hover:text-cereon-green/70 transition-colors duration-300"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-cereon-green transition-colors duration-300" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required                  disabled={isBlocked}                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-cereon-light border-2 border-gray-200 text-cereon-dark rounded-lg py-3 pl-11 pr-12 outline-none focus:border-cereon-green focus:ring-2 focus:ring-cereon-green/30 transition-all duration-300 font-medium placeholder:text-cereon-dark/40"
                  placeholder="••••••••"
                />
                <motion.button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-cereon-dark transition-colors duration-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </motion.button>
              </div>
            </motion.div>

            {/* Botão Entrar */}
            <motion.button
              variants={itemVariants}
              type="submit"
              disabled={isLoading || isBlocked}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-cereon-green hover:bg-cereon-green/90 disabled:opacity-60 text-white font-bold py-3 rounded-lg transition-all duration-300 shadow-lg shadow-cereon-green/20 flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>
          </form>

          {/* Mensagem de Contagem Regressiva */}
          {countdownMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium text-center"
            >
              {countdownMessage}
            </motion.div>
          )}

          {/* Google acima do divisor; depois Cadastrar */}
          <motion.div variants={itemVariants} className="mt-4 space-y-3">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-cereon-dark py-3 rounded-lg hover:border-cereon-green hover:bg-cereon-light transition-all duration-300 font-semibold shadow-sm"
            >
              <Chrome className="w-5 h-5" />
              <span>Google</span>
            </motion.button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500 font-semibold">Ou Crie Sua conta</span>
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/cadastro"
                className="w-full bg-cereon-green hover:bg-cereon-green/90 text-white font-bold py-3 rounded-lg transition-all duration-300 shadow-lg shadow-cereon-green/20 flex items-center justify-center gap-2 group"
              >
                Cadastrar
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
