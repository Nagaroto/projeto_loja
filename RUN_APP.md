# 🚀 Como Rodar o Projeto

## ⚡ Início Rápido (3 passos)

### 1️⃣ Clonar o repositório
```bash
git clone https://github.com/Nagaroto/projeto_loja.git
cd projeto_loja
```

### 2️⃣ Executar setup automatizado (Windows)
```bash
setup.bat
```

Ou (Linux/Mac):
```bash
chmod +x setup.sh  # Se tiver arquivo setup.sh
./setup.sh
```

### 3️⃣ Configurar `.env` com seu token
```bash
# Abra o arquivo: projeto_loja/.env
# Encontre a linha com MERCADO_PAGO_ACCESS_TOKEN
# Substitua pelo seu token real

MERCADO_PAGO_ACCESS_TOKEN=APP_USR-seu-token-real-aqui
```

---

## 🏃 Executar o Servidor

### ✅ Verificar se funcionou
```bash
# 1. Ativar ambiente virtual
venv\Scripts\activate.bat  # Windows
source venv/bin/activate   # Linux/Mac

# 2. Ver se Django consegue carregar o projeto
python manage.py check

# 3. Fazer migrations (primeira vez)
python manage.py migrate
```

### 🎯 Backend (Django + API)
```bash
venv\Scripts\activate.bat  # Ativar venv

# Opção 1: Servidor de desenvolvimento
python manage.py runserver

# Opção 2: Servidor em porta específica
python manage.py runserver 0.0.0.0:8000

# Acesse: http://localhost:8000
# Admin: http://localhost:8000/admin
```

### 🎨 Frontend (React + Vite)
Em **outro terminal**:
```bash
cd frontend
npm run dev

# Acesse: http://localhost:5173
```

### ✅ Teste se está funcionando
1. Frontend carregou? → http://localhost:5173 ✅
2. Backend está rodando? → http://localhost:8000/api ✅
3. Admin Django? → http://localhost:8000/admin ✅

---

## 📝 Variáveis de Ambiente Importantes

### Arquivo `.env` - Configurações

```env
# ============ DJANGO ============
DEBUG=True                    # False em produção!
SECRET_KEY=sua-chave-secreta  # Altere em produção!
ALLOWED_HOSTS=localhost,127.0.0.1

# ============ MERCADO PAGO ============
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-seu-token-aqui

# ============ FRONTEND ============
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# ============ EMAIL (opcional) ============
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=seu-email@gmail.com
EMAIL_HOST_PASSWORD=sua-senha-app
```

---

## 🔑 Obter Tokens / Credenciais

### Mercado Pago Token
1. Vá para: https://www.mercadopago.com.br/developers/panel
2. Login com sua conta
3. Copie o "Access Token"
4. Cole em `MERCADO_PAGO_ACCESS_TOKEN` no `.env`

### Django Secret Key
```bash
# Gerar uma nova (se precisar)
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## 🧪 Testes

### Testar API de Pagamentos
```bash
# Terminal 1: Backend rodando
python manage.py runserver

# Terminal 2: Executar testes
python test_payment.py
python test_mercado_pago.py
```

### Testar com cURL
```bash
# Listar produtos
curl http://localhost:8000/api/produtos/

# Obter status
curl http://localhost:8000/api/status/
```

---

## ❌ Troubleshooting

### "ModuleNotFoundError: No module named 'django'"
```bash
# Solução: Instalar dependências
pip install -r requirements.txt
```

### "MERCADO_PAGO_ACCESS_TOKEN não encontrado"
```bash
# Solução: Verificar .env
# 1. Confirme que .env existe
# 2. Confirme que tem a variável
# 3. Confirme que o token começa com APP_USR-
```

### Porta 8000 já está em uso
```bash
# Usar outra porta
python manage.py runserver 8001
```

### npm install falhou no frontend
```bash
cd frontend
rm -r node_modules package-lock.json
npm install
```

---

## 📚 Arquivos Importantes

```
projeto_loja/
├── .env                    # Variáveis sensíveis (local)
├── .env.example            # Template seguro (sem tokens)
├── setup.bat               # Instalador Windows
├── manage.py               # Gerenciador Django
├── db.sqlite3              # Banco de dados
│
├── config/
│   ├── settings.py         # Configurações Django
│   └── urls.py             # Rotas principais
│
├── beckend/                # App Django principal
│   ├── models.py           # Modelos (Produto, Pedido)
│   ├── views.py            # Endpoints API
│   └── urls.py             # Rotas
│
├── pagamentos/             # App de Pagamentos
│   ├── models.py           # Modelo Pagamento
│   ├── views.py            # Endpoints pagamentos
│   ├── services.py         # Integração Mercado Pago
│   └── urls.py             # Rotas
│
└── frontend/               # React + Vite
    ├── src/
    │   ├── App.jsx         # Componente principal
    │   └── pages/          # Páginas
    └── package.json        # Dependências npm
```

---

## 🚀 Deploy (Produção)

Para colocar em produção (Heroku, AWS, etc):

1. **Criar `.env` no servidor** com variáveis reais
2. **Definir `DEBUG=False`** em produção
3. **Usar PostgreSQL** em vez de SQLite
4. **Executar migrations** no servidor
5. **Configurar CORS** para domínio correto
6. **Usar HTTPS**

---

## 💡 Dicas

- **Usar VS Code?** Instale extensão "Thunder Client" para testar APIs
- **Banco de dados**: SQLite é para dev. Use PostgreSQL em produção
- **Variáveis sensíveis**: Nunca commite `.env` com tokens reais
- **Cache**: Limpar `__pycache__` se tiver problemas → `find . -type d -name __pycache__ -delete`

---

Pronto! 🎉 Se tiver problemas, verifique a seção **Troubleshooting** acima.
