# 🚀 Quick Start - App Pagamentos

## ⚡ 5 Minutos para Começar

### 1. Verificar se tudo está funcionando
```bash
cd /home/destwarrio/projetos_1/projeto_loja
python manage.py shell < pagamentos/test_integration.py
```
Esperado: Todos os testes ✅

### 2. Acessar Admin Django
```
http://localhost:8000/admin/
Login com seu superusuário
Navegue para: Pagamentos → Pagamentos
```

### 3. Fazer primeira requisição

#### Opção A: Postman/Thunder Client
```http
POST http://localhost:8000/api/token/
Content-Type: application/json

{
  "email": "seu_email@example.com",
  "password": "sua_senha"
}
```
Copie o token `access` recebido

```http
POST http://localhost:8000/api/pagamentos/
Authorization: Bearer {seu_token}
Content-Type: application/json

{
  "valor": "50.00",
  "metodo_pagamento": "pix",
  "items": [{"id": 1, "name": "Teste", "quantity": 1, "price": "50.00"}],
  "descricao": "Primeiro pagamento"
}
```

#### Opção B: cURL
```bash
# Obter token
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com", "password":"senha"}'

# Usar token para criar pagamento (copie o token acima)
curl -X POST http://localhost:8000/api/pagamentos/ \
  -H "Authorization: Bearer {TOKEN_AQUI}" \
  -H "Content-Type: application/json" \
  -d '{
    "valor": "50.00",
    "metodo_pagamento": "pix",
    "items": [{"id": 1, "name": "Teste", "quantity": 1, "price": "50.00"}],
    "descricao": "Teste"
  }'
```

### 4. Resposta Esperada

```json
{
  "pagamento_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "mercado_pago_id": "123456789",
  "qr_code": "data:image/png;base64,iVBORw0KGgo...",
  "copia_cola": "00020126360014br.gov.bcb.pix0136...",
  "expiracao": "2026-04-17T16:00:00Z",
  "valor": "50.00",
  "status": "processando"
}
```

### 5. Testar no Frontend

1. Adicionar um produto ao carrinho
2. Clicar em "Finalizar Compra"
3. Preencher endereço
4. Clicar em "Confirmar pedido"
5. Ver QR Code aparecer ✨

---

## 📡 Endpoints Principais

### Pagamentos

| Método | URL | Descrição |
|--------|-----|-----------|
| POST | `/api/pagamentos/` | Criar pagamento |
| GET | `/api/pagamentos/` | Listar seus pagamentos |
| GET | `/api/pagamentos/{id}/` | Ver detalhes |
| GET | `/api/pagamentos/{id}/status/` | Consultar status |
| POST | `/api/pagamentos/{id}/cancelar/` | Cancelar |

### Comprovantes
| GET | `/api/comprovantes/` | Listar comprovantes |
| GET | `/api/comprovantes/{id}/` | Ver comprovante |

### Cartões
| GET | `/api/cartoes/` | Listar cartões |
| POST | `/api/cartoes/` | Salvar cartão (token) |
| POST | `/api/cartoes/{id}/definir_padrao/` | Definir padrão |
| DELETE | `/api/cartoes/{id}/` | Deletar |

---

## 🔑 Status de Pagamento

| Status | Significado | Cor |
|--------|-------------|-----|
| `pendente` | Aguardando | ⚪ Cinza |
| `processando` | Sendo processado | 🔵 Azul |
| `aprovado` | ✅ Aprovado | 🟢 Verde |
| `recusado` | ❌ Recusado | 🔴 Vermelho |
| `expirado` | QR Code expirou | 🟠 Laranja |
| `cancelado` | Cancelado pelo usuário | ⚫ Preto |

---

## 🛠️ Troubleshooting Rápido

### Erro: 401 Unauthorized
```bash
# Você não passou token valido
# Solução: Obtenha um novo token primeiro
POST /api/token/
```

### Erro: 400 Bad Request
```bash
# Dados inválidos
# Verificar:
# - valor > 0
# - items não vazio
# - valor é string: "50.00" (não número)
```

### Erro: 404 Not Found
```bash
# Pagamento não existe
# Verifique o ID
```

### QR Code não aparece
```bash
# 1. Verificar se response tem qr_code
# 2. Verificar se começa com: data:image/png;base64,
# 3. Ver console do browser: F12
```

---

## 📚 Documentação Completa

- **API Completa:** `pagamentos/README.md`
- **Testes:** `TESTING_PAGAMENTOS.md`
- **Overview:** `IMPLEMENTACAO_PAGAMENTOS.md`
- **Setup:** `SETUP_PAGAMENTOS.md`

---

## ✅ Checklist Rápido

- [ ] Testes de integração passando
- [ ] Admin acessível
- [ ] Primeiro pagamento criado
- [ ] QR Code gerado
- [ ] Frontend exibe QR Code
- [ ] Tudo funciona! 🎉

---

## 🎯 Próximo Passo

Seguir o guia em `TESTING_PAGAMENTOS.md` para testes mais detalhados.

---

**Tempo estimado:** ⏱️ 5-10 minutos  
**Nível:** 🟢 Iniciante  
**Sucesso:** ✅ Esperado
