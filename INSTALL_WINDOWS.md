# 📦 Guia de Instalação - Windows

## Início Rápido

Para quem está usando **Windows**, todo o processo de instalação foi automatizado!

### ⚡ Instalação em 3 passos:

#### 1. Clone o repositório
```bash
git clone https://github.com/Nagaroto/projeto_loja.git
cd projeto_loja
```

#### 2. Execute o instalador automático
Dê dois cliques em:
```
setup.bat
```

Ou abra o Prompt de Comando (CMD) e execute:
```bash
setup.bat
```

#### 3. Pronto! ✅
O script irá:
- ✅ Criar um ambiente virtual Python
- ✅ Instalar todas as dependências do backend (Django, DRF, Mercado Pago, etc)
- ✅ Instalar todas as dependências do frontend (React, Tailwind, Vite, etc)

---

## ⚙️ Próximos passos

### Migrations do banco de dados
```bash
# Ative o ambiente virtual (se ainda não estiver ativado)
venv\Scripts\activate.bat

# Execute as migrations
python manage.py migrate
```

### Criar usuário admin (opcional)
```bash
python manage.py createsuperuser
```

### Executar o servidor

#### Backend (Django)
```bash
python manage.py runserver
```
Acesse: `http://localhost:8000`

#### Frontend (React)
Em outro terminal:
```bash
cd frontend
npm run dev
```
Acesse: `http://localhost:5173`

---

## 📋 O que foi incluído no upload

✅ **Banco de dados**: `db.sqlite3` com todos os dados  
✅ **Configurações de API**: Mercado Pago e outras  
✅ **Dependências**: Todas listadas em `requirements.txt` e `package.json`  
✅ **Backend**: Django com autenticação, produtos, pedidos, pagamentos  
✅ **Frontend**: React com Vite e Tailwind CSS  
✅ **Documentação**: Arquitetura, endpoints, testes  
✅ **Setup Automático**: `setup.bat` para Windows  

---

## 🔧 Requisitos do Sistema

- **Python 3.9+** → [Download](https://www.python.org/downloads/)
- **Node.js 16+** (opcional, para frontend) → [Download](https://nodejs.org/)
- **Git** → [Download](https://git-scm.com/)

---

## ❓ Troubleshooting

### "Python não foi encontrado"
- Certifique-se que Python está instalado
- Reinicie o terminal após instalar
- Verifique se marcou "Add Python to PATH" durante instalação

### "Permissão negada ao executar setup.bat"
- Clique com direito → Propriedades → Desbloquear
- Ou execute como Administrador

### "pip: comando não encontrado"
- Reinstale Python
- Verifique a variável de ambiente PATH

### Problemas com node_modules
- Delete a pasta: `rm -r frontend\node_modules`
- Execute: `npm install` dentro de `frontend/`

---

## 📚 Documentação completa

- [ARQUITETURA_PAGAMENTOS.md](ARQUITETURA_PAGAMENTOS.md) - Arquitetura do sistema
- [ENDPOINTS_REFERENCE.md](ENDPOINTS_REFERENCE.md) - Referência de endpoints
- [QUICK_START_PAGAMENTOS.md](QUICK_START_PAGAMENTOS.md) - Quick start
- [README.md](README.md) - Documentação principal

---

## ⚠️ Aviso de Segurança

Este repositório contém:
- Banco de dados com dados de teste
- Configurações de API (considere usar variáveis de ambiente em produção)
- Tokens e secrets (NÃO use em repositórios públicos em produção)

**Para produção:**
- Use arquivo `.env` com variáveis de ambiente
- Nunca commite `db.sqlite3` ou secrets
- Configure variáveis no seu hosting (Heroku, AWS, etc)

---

Bom desenvolvimento! 🚀
