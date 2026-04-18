# 🧪 Guia de Testes - App Pagamentos

## Pré-requisitos

- ✅ Django rodando: `python manage.py runserver`
- ✅ Frontend rodando: `npm run dev` (na pasta frontend)
- ✅ Banco de dados migrado: `python manage.py migrate`
- ✅ Superusuário criado: `python manage.py createsuperuser`

## 1️⃣ Teste de Integração Básica

### Executar testes do app

```bash
# Dentro da pasta projeto_loja
python manage.py shell < pagamentos/test_integration.py
```

**Esperado:**
- ✅ Tokens Mercado Pago carregados
- ✅ Usuário de teste criado
- ✅ Pagamento criado no banco
- ✅ Auditoria registrada
- ✅ QR Code gerado

## 2️⃣ Teste via Admin Django

### Acessar painel admin

1. Navegue para: http://localhost:8000/admin/
2. Faça login com o superusuário
3. Procure por "Pagamentos" na seção "Pagamentos"

### Verificar o painel

- ✅ Listar pagamentos criados
- ✅ Ver status com cores (verde=aprovado, vermelho=recusado, etc)
- ✅ Visualizar QR Code em preview
- ✅ Ver auditoria de transações
- ✅ Gerenciar cartões salvos

## 3️⃣ Teste via API (Postman/Thunder Client)

### Obter Token de Autenticação

```http
POST http://localhost:8000/api/token/
Content-Type: application/json

{
  "email": "seu_email@example.com",
  "password": "sua_senha"
}
```

**Resposta esperada:**
```json
{
  "access": "seu_token_jwt_aqui",
  "refresh": "refresh_token"
}
```

### Criar Pagamento (PIX)

```http
POST http://localhost:8000/api/pagamentos/
Authorization: Bearer {seu_token_aqui}
Content-Type: application/json

{
  "valor": "100.00",
  "metodo_pagamento": "pix",
  "items": [
    {
      "id": 1,
      "name": "Produto Teste",
      "quantity": 1,
      "price": "100.00"
    }
  ],
  "descricao": "Teste de pagamento"
}
```

**Resposta esperada (201 Created):**
```json
{
  "pagamento_id": "uuid-123456",
  "mercado_pago_id": "123456789",
  "qr_code": "data:image/png;base64,iVBORw0KGgo...",
  "copia_cola": "00020126360014br.gov.bcb.pix...",
  "expiracao": "2026-04-17T16:00:00Z",
  "valor": "100.00",
  "status": "processando"
}
```

### Consultar Status do Pagamento

```http
GET http://localhost:8000/api/pagamentos/{pagamento_id}/status/
Authorization: Bearer {seu_token_aqui}
```

**Resposta esperada:**
```json
{
  "id": "uuid-123456",
  "status": "aprovado",
  "valor": "100.00",
  "mercado_pago_id": "123456789",
  "data_pagamento": "2026-04-17T15:55:30Z"
}
```

### Listar Pagamentos do Usuário

```http
GET http://localhost:8000/api/pagamentos/
Authorization: Bearer {seu_token_aqui}
```

### Cancelar Pagamento

```http
POST http://localhost:8000/api/pagamentos/{pagamento_id}/cancelar/
Authorization: Bearer {seu_token_aqui}
```

## 4️⃣ Teste Frontend - Checkout

### Pré-requisitos

1. Adicione um produto ao carrinho
2. Faça login no frontend
3. Vá para o checkout

### Fluxo de Teste

1. **Selecione endereço ou crie novo**
   - ✅ Verificar se calcula frete corretamente

2. **Selecione método de pagamento (PIX)**
   - ✅ Radio button deve estar disponível

3. **Clique em "Confirmar pedido"**
   - ✅ Deve chamar `/api/pagamentos/`
   - ✅ Deve exibir QR Code abaixo do botão
   - ✅ Deve exibir código "Cópia e Cola"

4. **Escaneie o QR Code ou copie o código**
   - ✅ Botão "Copiar" deve funcionar
   - ✅ Feedback visual "Código copiado!"

5. **Espere a confirmação automática**
   - ✅ Frontend verifica status a cada 5 segundos
   - ✅ Após aprovação, deve criar pedido automaticamente
   - ✅ Deve mostrar mensagem de sucesso

### Esperado no Console do Browser

```javascript
// Você deve ver requisições para:
POST /api/pagamentos/ (201 Created)
GET /api/pagamentos/{id}/status/ (200 OK) - múltiplas chamadas
```

## 5️⃣ Teste E2E Simulado

### Simular Pagamento Aprovado

Como não temos webhook real, você pode:

1. **Opção 1: Simular via Django Shell**

```bash
python manage.py shell
```

```python
from pagamentos.models import Pagamento
from django.utils import timezone

# Encontre o pagamento criado
pagamento = Pagamento.objects.last()

# Simule aprovação
pagamento.status = 'aprovado'
pagamento.data_pagamento = timezone.now()
pagamento.save()

# Verificar
print(f"Status: {pagamento.status}")
```

2. **Opção 2: Verificar via API**

Após simular no shell, faça uma requisição GET ao status e o frontend deve responder automaticamente.

## 6️⃣ Teste de Erros

### Teste com dados inválidos

**Teste 1: Valor zero**
```http
POST http://localhost:8000/api/pagamentos/
{
  "valor": "0",
  "metodo_pagamento": "pix",
  "items": [],
  "descricao": "Erro teste"
}
```
**Esperado:** 400 Bad Request com mensagem

**Teste 2: Sem itens**
```http
POST http://localhost:8000/api/pagamentos/
{
  "valor": "100.00",
  "metodo_pagamento": "pix",
  "items": [],
  "descricao": "Erro teste"
}
```
**Esperado:** 400 Bad Request

**Teste 3: Sem autenticação**
```http
POST http://localhost:8000/api/pagamentos/
(sem Authorization header)
```
**Esperado:** 401 Unauthorized

**Teste 4: Usuário não autenticado**
- Não fazer login no frontend
- Tentar finalizar compra
- **Esperado:** Redirecionar para login

## 7️⃣ Verificar Logs

```bash
# Ver logs em tempo real
tail -f logs/pagamentos/info.log
tail -f logs/pagamentos/errors.log

# Ou acessar via cat
cat logs/pagamentos/info.log | grep -i "pix"
```

## 8️⃣ Teste de Segurança

### Verificar se tokens não são expostos

```bash
# Pesquisar por tokens em arquivos versionados
git log --all --full-history --oneline -- .env
git grep "APP_USR"

# Verificar .gitignore
cat .gitignore | grep -E "\.env|\.secrets"
```

**Esperado:**
- ✅ `.env` e `.secrets/` estão em `.gitignore`
- ✅ Nenhum token nos commits
- ✅ Tokens apenas em `.secrets/.env.local`

## 9️⃣ Teste de Isolamento de Dados

### Verificar segurança multi-usuário

```python
# Django shell
from django.contrib.auth.models import User
from pagamentos.models import Pagamento

# Crie 2 usuários
user1, _ = User.objects.get_or_create(username='user1', email='user1@test.com')
user2, _ = User.objects.get_or_create(username='user2', email='user2@test.com')

# Crie pagamentos para cada um
pag1 = Pagamento.objects.create(usuario=user1, valor=100, status='pendente')
pag2 = Pagamento.objects.create(usuario=user2, valor=200, status='pendente')

# Verifique isolamento
print(user1.pagamentos.all())  # Deve ver apenas pag1
print(user2.pagamentos.all())  # Deve ver apenas pag2

# User1 não deve conseguir ver pagamentos de user2 via API
# (teste no Postman com tokens diferentes)
```

## 🔟 Checklist Final

- [ ] Tokens carregados do `.env`
- [ ] Banco de dados migrado
- [ ] Admin Django funciona
- [ ] API endpoints respondendo
- [ ] Frontend exibe QR Code
- [ ] Status atualiza automaticamente
- [ ] Auditoria registra eventos
- [ ] Logs salvos em `/logs/pagamentos/`
- [ ] Dados isolados por usuário
- [ ] Erros tratados graciosamente

## 🆘 Troubleshooting

### "MERCADO_PAGO_ACCESS_TOKEN não encontrado"
```bash
# Verificar se .env está carregado
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print(os.getenv('MERCADO_PAGO_ACCESS_TOKEN'))"

# Ou source .env manualmente
export $(cat .env | xargs)
```

### "Erro ao conectar com Mercado Pago"
- Verificar token em `.secrets/.env.local`
- Verificar conexão internet
- Verificar IP whitelist no Mercado Pago

### "QR Code não aparece no frontend"
- Verificar console do browser (F12)
- Verificar se a resposta da API tem campo `qr_code`
- Verificar se base64 é válido (começa com `data:image/png;base64,`)

### "Pagamentos antigos desaparecem"
- Verificar se alguém deletou do admin (não deveria ser possível)
- Verificar migrações e backup do banco

## 📞 Suporte

Para dúvidas:
1. Verificar logs: `tail -f logs/pagamentos/errors.log`
2. Verificar admin: http://localhost:8000/admin/pagamentos/
3. Verificar documentação: [pagamentos/README.md](./README.md)
