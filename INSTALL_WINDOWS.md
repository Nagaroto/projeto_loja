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
- ✅ Copiar `.env.example` para `.env` (se não existir)

---

## ⚙️ Configuração do Arquivo `.env`

### O que é `.env`?
Arquivo com variáveis sensíveis (tokens, senhas) que não são commitadas no Git.

### Como configurar?

1. Após executar `setup.bat`, você terá um arquivo `.env`
2. Abra `projeto_loja/.env` em um editor de texto
3. Procure por `MERCADO_PAGO_ACCESS_TOKEN` e substitua pelo seu token real:

```env
# ANTES (placeholder)
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-seu-token-aqui

# DEPOIS (seu token real)
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-1234567890-sua-chave-real
```

4. Salve o arquivo

### Onde obter seus tokens?

- **Mercado Pago**: https://www.mercadopago.com.br/developers/panel
  - Gere um "Access Token" da sua conta
  - O token começa com `APP_USR-`

### Arquivo `.env.example`
Arquivo de referência (SEM tokens reais) - serve como template.
Sempre que alguém clonar o projeto, copia este para `.env` e preenche com seus valores.

---

## ⚙️ Próximos passos

### 1. Configurar variáveis de ambiente (IMPORTANTE!)
```bash
# Abra o arquivo .env com editor de texto
# Procure por: MERCADO_PAGO_ACCESS_TOKEN
# Substitua pelo seu token real do Mercado Pago
```

### 2. Migrations do banco de dados
```bash
# Ative o ambiente virtual (se ainda não estiver ativado)
venv\Scripts\activate.bat

# Execute as migrations
python manage.py migrate
```

### 3. Criar usuário admin (opcional)
```bash
python manage.py createsuperuser
```

### 4. Executar o servidor

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
✅ **Configurações de API**: Mercado Pago com token configurável via `.env`  
✅ **Dependências**: Todas listadas em `requirements.txt` e `package.json`  
✅ **Backend**: Django com autenticação, produtos, pedidos, pagamentos  
✅ **Frontend**: React com Vite e Tailwind CSS  
✅ **Documentação**: Arquitetura, endpoints, testes  
✅ **Setup Automático**: `setup.bat` para Windows  
✅ **Variáveis de Ambiente**: `.env.example` como template  

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

**✅ BOAS PRÁTICAS IMPLEMENTADAS:**
- Arquivo `.env` já está no `.gitignore` (não será commitado)
- `.env.example` serve como template de referência
- Tokens sensíveis não são versionados no Git

**⚠️ Para desenvolvimento local:**
- Você pode colocar seus tokens reais no `.env` (está seguro localmente)
- Cada desenvolvedor terá seu próprio `.env`

**❌ NUNCA em produção:**
- Não use tokens hardcoded no código
- Não commite arquivo `.env`
- Use variáveis de ambiente do servidor (Heroku, AWS, etc)
- Use `.env.local` para override de valores

**Exemplo de segurança:**
```bash
# Desenvolvedores locais
.env          ← token real (ignorado por git)
.env.example  ← template seguro (commitado)

# Servidor de produção
Variáveis definidas no hosting (não em arquivo)
```

---

Bom desenvolvimento! 🚀
