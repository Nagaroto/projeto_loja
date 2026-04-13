import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, Github, Chrome } from 'lucide-react';
import axios from 'axios';

// URL do seu backend Django
const API_URL = 'http://127.0.0.1:8000/api';

export function Login( ) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

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
      // 1. TENTATIVA DE LOGIN
      // Enviamos 'email' porque o seu Serializer customizado no Django espera esse campo
      const response = await axios.post(`${API_URL}/login/`, {
        email: formData.email,
        password: formData.password
      });

      // Se o login der certo, salvamos o token e avisamos o usuário
      const { access } = response.data;
      localStorage.setItem('token', access);
      alert('Login realizado com sucesso! Bem-vindo.');
      // window.location.href = '/dashboard'; // Redirecione para onde desejar

    } catch (error) {
      // 2. TRATAMENTO DE ERRO / CADASTRO AUTOMÁTICO
      // Se o erro for 401 (Não autorizado), o usuário não existe ou a senha está errada
      if (error.response && error.response.status === 401) {
        const querCadastrar = window.confirm(
          "Usuário não encontrado. Deseja criar uma nova conta com este e-mail e senha?"
        );

        if (querCadastrar) {
          try {
            setIsLoading(true);
            // Chamada para a rota de registro que criamos no Django
            await axios.post(`${API_URL}/register/`, {
              email: formData.email,
              password: formData.password,
              username: formData.email // Usamos o email como username padrão
            });

            alert("Cadastro realizado com sucesso! Agora você já pode entrar.");
          } catch (regError) {
            const msgErro = regError.response?.data?.detail || "Erro ao cadastrar. Verifique os dados.";
            alert(`Erro no cadastro: ${msgErro}`);
          }
        }
      } else {
        // Erro de conexão ou erro 500 no servidor
        alert("Erro na conexão com o servidor Django. Verifique se o backend está rodando.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card Principal */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Bem-vindo</h1>
            <p className="text-slate-400">Entre na sua conta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Email</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-slate-950/50 border border-slate-800 text-white rounded-xl py-3 pl-11 pr-4 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-medium text-slate-300">Senha</label>
                <button type="button" className="text-xs text-blue-500 hover:text-blue-400 transition-colors">
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-slate-950/50 border border-slate-800 text-white rounded-xl py-3 pl-11 pr-12 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Divisor */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-2 text-slate-500">Ou continue com</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 bg-slate-950/50 border border-slate-800 text-white py-2.5 rounded-xl hover:bg-slate-800 transition-all">
              <Github className="w-5 h-5" />
              <span>Github</span>
            </button>
            <button className="flex items-center justify-center gap-2 bg-slate-950/50 border border-slate-800 text-white py-2.5 rounded-xl hover:bg-slate-800 transition-all">
              <Chrome className="w-5 h-5" />
              <span>Google</span>
            </button>
          </div>
        </div>

        {/* Link Cadastro */}
        <p className="text-center mt-8 text-slate-400">
          Não tem uma conta?{' '}
          <button className="text-blue-500 font-semibold hover:text-blue-400 transition-colors">
            Criar conta gratuita
          </button>
        </p>
      </div>
    </div>
  );
}
