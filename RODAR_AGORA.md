# ⚡ RODAR O PROJETO AGORA (Windows)

## 🎯 Em 5 minutos

### Passo 1: Ativar ambiente virtual
```bash
venv\Scripts\activate.bat
```

### Passo 2: Fazer migrations (primeira vez apenas)
```bash
python manage.py migrate
```

### Passo 3: Rodar Backend (Terminal 1)
```bash
python manage.py runserver
```

Será exibido:
```
Starting development server at http://127.0.0.1:8000/
```

### Passo 4: Rodar Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

Será exibido:
```
VITE v5.0 ready in 123 ms
  ➜  Local:   http://localhost:5173/
```

### Pronto! 🎉

Abra seu navegador:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api
- **Admin Django**: http://localhost:8000/admin

---

## 🔐 Importante: Token do Mercado Pago

O arquivo `.env` já tem um token, mas se precisar alterar:

1. Abra `projeto_loja/.env`
2. Procure por: `MERCADO_PAGO_ACCESS_TOKEN`
3. Substitua o valor

```env
# Linha atual (pode estar vencida)
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-1817398686620074-041500-...

# Seu token real do Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-SEU-TOKEN-AQUI
```

---

## ✅ Verificação

```bash
# Teste se Django carregou
python manage.py check

# Teste se consegue conectar API
curl http://localhost:8000/api/

# Teste se o token foi carregado
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print(os.getenv('MERCADO_PAGO_ACCESS_TOKEN')[:30])"
```

---

## ❓ Se der erro

### "ModuleNotFoundError: No module named..."
```bash
pip install -r requirements.txt
```

### Porta 8000 já está em uso
```bash
python manage.py runserver 8001
```

### Banco de dados com erro
```bash
python manage.py migrate --run-syncdb
```

---

## 📚 Docs Completas

- **Instalação**: [INSTALL_WINDOWS.md](INSTALL_WINDOWS.md)
- **Como Rodar**: [RUN_APP.md](RUN_APP.md)
- **Arquitetura**: [ARQUITETURA_PAGAMENTOS.md](ARQUITETURA_PAGAMENTOS.md)
- **Endpoints**: [ENDPOINTS_REFERENCE.md](ENDPOINTS_REFERENCE.md)

---

Sucesso! 🚀
