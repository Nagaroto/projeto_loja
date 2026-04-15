# Loja Cereon (projeto_loja)

Monorepo com API Django REST e vitrine React (Vite + Tailwind).

## Conteúdo

- `config/`: projeto Django (settings, URLs raiz).
- `beckend/`: app com modelos, serializers, views da API (`/api/...`).
- `frontend/`: SPA da loja e painel admin embutido (rotas protegidas).

## Requisitos

- Python 3 com dependências do Django/DRF instaladas no ambiente virtual.
- Node.js para o frontend.

## Backend

Na raiz do repositório:

```bash
python manage.py migrate
python manage.py runserver
```

API em `http://127.0.0.1:8000/api/`. Painel Django em `/admin/`.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Aplicação em `http://localhost:3000`. Ajuste `API_URL` nos arquivos do cliente se o host da API mudar.

## Autenticação

Login e registro usam JWT (`/api/login/`, `/api/register/`). Renovação em `/api/token/refresh/`.
