# 📋 Referência Rápida de Endpoints

## 🔐 Autenticação

### Obter Token JWT
```http
POST /api/token/
Content-Type: application/json

{
  "email": "usuario@example.com",
  "password": "senha123"
}

HTTP/1.1 200 OK
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Refresh Token
```http
POST /api/token/refresh/
Content-Type: application/json

{
  "refresh": "seu_refresh_token"
}

HTTP/1.1 200 OK
{
  "access": "novo_token_jwt"
}
```

---

## 💳 Pagamentos

### Criar Pagamento (PIX)
```http
POST /api/pagamentos/
Authorization: Bearer seu_token_jwt
Content-Type: application/json

{
  "valor": "150.50",
  "metodo_pagamento": "pix",
  "items": [
    {
      "id": 1,
      "name": "Produto A",
      "quantity": 2,
      "price": "75.25"
    },
    {
      "id": 2,
      "name": "Produto B",
      "quantity": 1,
      "price": "0.00"
    }
  ],
  "descricao": "Compra de produtos"
}

HTTP/1.1 201 Created
{
  "pagamento_id": "550e8400-e29b-41d4-a716-446655440000",
  "mercado_pago_id": "123456789",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "copia_cola": "00020126360014br.gov.bcb.pix0136550e8400-e29b-41d4-a716...",
  "expiracao": "2026-04-17T15:45:30.123456Z",
  "valor": "150.50",
  "status": "processando"
}
```

### Listar Pagamentos
```http
GET /api/pagamentos/
Authorization: Bearer seu_token_jwt

HTTP/1.1 200 OK
{
  "count": 5,
  "next": "http://localhost:8000/api/pagamentos/?page=2",
  "previous": null,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "usuario_email": "usuario@example.com",
      "valor": "150.50",
      "status": "processando",
      "metodo_pagamento": "pix",
      "data_criacao": "2026-04-17T15:30:30.123456Z",
      "data_pagamento": null,
      "mercado_pago_id": "123456789"
    },
    ...
  ]
}
```

### Listar com Paginação
```http
GET /api/pagamentos/?page=1&page_size=10
Authorization: Bearer seu_token_jwt

HTTP/1.1 200 OK
```

### Ver Detalhes do Pagamento
```http
GET /api/pagamentos/550e8400-e29b-41d4-a716-446655440000/
Authorization: Bearer seu_token_jwt

HTTP/1.1 200 OK
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "usuario_email": "usuario@example.com",
  "valor": "150.50",
  "status": "processando",
  "metodo_pagamento": "pix",
  "mercado_pago_id": "123456789",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAA...",
  "copia_cola": "00020126360014br.gov.bcb.pix0136...",
  "data_criacao": "2026-04-17T15:30:30.123456Z",
  "data_atualizacao": "2026-04-17T15:35:30.123456Z",
  "data_expiracao": "2026-04-17T15:45:30.123456Z",
  "data_pagamento": null,
  "descricao": "Compra de produtos"
}
```

### Consultar Status do Pagamento
```http
GET /api/pagamentos/550e8400-e29b-41d4-a716-446655440000/status/
Authorization: Bearer seu_token_jwt

HTTP/1.1 200 OK
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "aprovado",
  "valor": "150.50",
  "mercado_pago_id": "123456789",
  "data_pagamento": "2026-04-17T15:35:30.123456Z",
  "copia_cola": "00020126360014br.gov.bcb.pix0136...",
  "data_criacao": "2026-04-17T15:30:30.123456Z"
}
```

### Cancelar Pagamento
```http
POST /api/pagamentos/550e8400-e29b-41d4-a716-446655440000/cancelar/
Authorization: Bearer seu_token_jwt

HTTP/1.1 200 OK
{
  "mensagem": "Pagamento cancelado com sucesso",
  "pagamento_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "cancelado"
}

Error (409):
{
  "erro": "Não é possível cancelar um pagamento aprovado. Use reembolso."
}
```

---

## 📄 Comprovantes

### Listar Comprovantes
```http
GET /api/comprovantes/
Authorization: Bearer seu_token_jwt

HTTP/1.1 200 OK
{
  "count": 2,
  "results": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "numero_comprovante": "COMP-2026-001",
      "usuario_email": "usuario@example.com",
      "valor_pago": "150.50",
      "data_confirmacao": "2026-04-17T15:35:30.123456Z",
      "dados_compra": {...},
      "pagamento_info": {
        "pagamento_id": "550e8400-e29b-41d4-a716-446655440000",
        "mercado_pago_id": "123456789",
        "status": "aprovado"
      },
      "referencia_externo": "ref-123"
    }
  ]
}
```

### Ver Comprovante
```http
GET /api/comprovantes/660e8400-e29b-41d4-a716-446655440001/
Authorization: Bearer seu_token_jwt

HTTP/1.1 200 OK
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "numero_comprovante": "COMP-2026-001",
  "usuario_email": "usuario@example.com",
  "valor_pago": "150.50",
  "data_confirmacao": "2026-04-17T15:35:30.123456Z",
  "dados_compra": {
    "items": [...],
    "endereco": {...}
  },
  "pagamento_info": {...},
  "referencia_externo": "ref-123"
}
```

---

## 💳 Cartões

### Listar Cartões Salvos
```http
GET /api/cartoes/
Authorization: Bearer seu_token_jwt

HTTP/1.1 200 OK
{
  "count": 2,
  "results": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "usuario_email": "usuario@example.com",
      "nome_titular": "João da Silva",
      "ultimos_digitos": "4242",
      "bandeira": "Visa",
      "mes_validade": 12,
      "ano_validade": 2026,
      "ativo": true,
      "padrao": true,
      "data_criacao": "2026-04-15T10:30:00.000000Z"
    }
  ]
}
```

### Salvar Novo Cartão
```http
POST /api/cartoes/
Authorization: Bearer seu_token_jwt
Content-Type: application/json

{
  "numero_token": "token_mercado_pago_123456",
  "nome_titular": "João da Silva",
  "ultimos_digitos": "4242",
  "bandeira": "Visa",
  "mes_validade": 12,
  "ano_validade": 2026,
  "padrao": false
}

HTTP/1.1 201 Created
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "usuario_email": "usuario@example.com",
  "nome_titular": "João da Silva",
  "ultimos_digitos": "4242",
  "bandeira": "Visa",
  "mes_validade": 12,
  "ano_validade": 2026,
  "ativo": true,
  "padrao": false,
  "data_criacao": "2026-04-17T15:40:00.000000Z"
}
```

### Definir Cartão como Padrão
```http
POST /api/cartoes/770e8400-e29b-41d4-a716-446655440002/definir_padrao/
Authorization: Bearer seu_token_jwt

HTTP/1.1 200 OK
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "usuario_email": "usuario@example.com",
  "nome_titular": "João da Silva",
  "ultimos_digitos": "4242",
  "bandeira": "Visa",
  "mes_validade": 12,
  "ano_validade": 2026,
  "ativo": true,
  "padrao": true,
  "data_criacao": "2026-04-17T15:40:00.000000Z"
}
```

### Deletar Cartão
```http
DELETE /api/cartoes/770e8400-e29b-41d4-a716-446655440002/
Authorization: Bearer seu_token_jwt

HTTP/1.1 204 No Content
```

---

## 📊 Auditoria

### Listar Eventos de Auditoria
```http
GET /api/auditoria/
Authorization: Bearer seu_token_jwt

HTTP/1.1 200 OK
{
  "count": 5,
  "results": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "tipo_evento": "criacao",
      "status_anterior": null,
      "status_novo": "pendente",
      "dados_evento": null,
      "mensagem": "Pagamento criado",
      "data_criacao": "2026-04-17T15:30:30.123456Z"
    },
    {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "tipo_evento": "webhook",
      "status_anterior": "pendente",
      "status_novo": "aprovado",
      "dados_evento": {
        "mercado_pago_id": "123456789",
        "status": "approved"
      },
      "mensagem": "Pagamento aprovado via webhook",
      "data_criacao": "2026-04-17T15:35:30.123456Z"
    }
  ]
}
```

### Ver Evento de Auditoria
```http
GET /api/auditoria/880e8400-e29b-41d4-a716-446655440003/
Authorization: Bearer seu_token_jwt

HTTP/1.1 200 OK
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "tipo_evento": "criacao",
  "status_anterior": null,
  "status_novo": "pendente",
  "dados_evento": null,
  "mensagem": "Pagamento criado",
  "data_criacao": "2026-04-17T15:30:30.123456Z"
}
```

---

## ⚠️ Códigos de Erro

| Código | Erro | Solução |
|--------|------|---------|
| 400 | Bad Request | Verificar dados enviados |
| 401 | Unauthorized | Obter novo token |
| 403 | Forbidden | Sem permissão (não é seu pagamento) |
| 404 | Not Found | ID não existe |
| 409 | Conflict | Ação inválida para este status |
| 500 | Server Error | Erro interno (ver logs) |

---

## 🧪 Exemplos com cURL

### Criar Pagamento
```bash
curl -X POST http://localhost:8000/api/pagamentos/ \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "valor": "100.00",
    "metodo_pagamento": "pix",
    "items": [{"id": 1, "name": "Teste", "quantity": 1, "price": "100.00"}],
    "descricao": "Teste"
  }'
```

### Consultar Status
```bash
curl -X GET http://localhost:8000/api/pagamentos/seu_id/status/ \
  -H "Authorization: Bearer seu_token"
```

### Listar Pagamentos
```bash
curl -X GET "http://localhost:8000/api/pagamentos/?page=1" \
  -H "Authorization: Bearer seu_token"
```

---

## 🔑 Headers Obrigatórios

Todos os endpoints (exceto `/token/`) requerem:

```http
Authorization: Bearer seu_token_jwt
Content-Type: application/json
```

---

## 📝 Notas

- IDs são UUIDs (v4)
- Valores monetários são strings: `"100.50"`
- Datas em ISO 8601: `2026-04-17T15:30:30.123456Z`
- Status é enum: `pendente|processando|aprovado|recusado|expirado|cancelado`
- Limite de requisições: 100/minuto por usuário

---

## 🔗 URLs Base

- **Local:** `http://localhost:8000/api/`
- **Staging:** `https://staging.exemplo.com/api/`
- **Production:** `https://api.exemplo.com/api/`

---

**Última atualização:** 17 de Abril de 2026  
**Versão:** 1.0.0
