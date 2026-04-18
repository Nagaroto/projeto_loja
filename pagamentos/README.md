# App Pagamentos - Integração Mercado Pago

Aplicação Django para gerenciar pagamentos via Mercado Pago com geração de QR Code PIX, confirmação de pagamento e armazenamento seguro de transações.

## 📋 Funcionalidades

- ✅ Criação de pagamentos PIX com QR Code
- ✅ Consulta de status de pagamento
- ✅ Geração de comprovantes
- ✅ Gerenciamento de cartões (tokens seguros)
- ✅ Auditoria de transações
- ✅ Integração com Mercado Pago API
- ✅ Webhook para confirmação automática

## 🔧 Configuração

### Tokens Mercado Pago

Os tokens estão salvos em `.secrets/.env.local`:
- **Production**: `APP_USR-1817398686620074-041500-30952e03cffb8140d3e9cf18ab06d19a-3338201566`
- **Development**: `APP_USR-8f057bd7-6dc4-4937-ae56-000b54a9351d`

### Variáveis de Ambiente

```bash
MERCADO_PAGO_ACCESS_TOKEN=seu_token_aqui
PIX_EXPIRACAO_MINUTOS=15
WEBHOOK_URL=http://localhost:8000/api/pagamentos/webhook/
```

## 📡 API Endpoints

### Criar Pagamento (PIX)

```http
POST /api/pagamentos/
Content-Type: application/json
Authorization: Bearer {token}

{
  "valor": "150.00",
  "metodo_pagamento": "pix",
  "items": [
    {"id": 1, "name": "Produto A", "quantity": 2, "price": "75.00"}
  ],
  "descricao": "Compra na loja"
}
```

**Response (201 Created):**
```json
{
  "pagamento_id": "uuid-aqui",
  "mercado_pago_id": "123456789",
  "qr_code": "data:image/png;base64,iVBORw0KGgo...",
  "copia_cola": "00020126360014br.gov.bcb.pix...",
  "expiracao": "2026-04-17T16:00:00Z",
  "valor": "150.00",
  "status": "processando"
}
```

### Consultar Status

```http
GET /api/pagamentos/{id}/status/
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "id": "uuid-aqui",
  "status": "aprovado",
  "valor": "150.00",
  "mercado_pago_id": "123456789",
  "data_pagamento": "2026-04-17T15:55:30Z",
  "copia_cola": "00020126360014br.gov.bcb.pix...",
  "data_criacao": "2026-04-17T15:40:30Z"
}
```

### Listar Pagamentos

```http
GET /api/pagamentos/
Authorization: Bearer {token}
```

### Cancelar Pagamento

```http
POST /api/pagamentos/{id}/cancelar/
Authorization: Bearer {token}
```

## 📊 Models

### Pagamento
- `id` (UUID): Identificador único
- `usuario` (ForeignKey): Usuário que realizou o pagamento
- `valor` (Decimal): Valor em reais
- `status` (CharField): pendente, processando, aprovado, recusado, expirado, cancelado
- `mercado_pago_id` (CharField): ID do pagamento no Mercado Pago
- `qr_code_base64` (TextField): QR Code em base64
- `copia_cola` (TextField): Código PIX para cópia e cola
- `metodo_pagamento` (CharField): pix, cartao, boleto
- `data_criacao`, `data_atualizacao`, `data_pagamento`: Timestamps

### Comprovante
- `id` (UUID): Identificador único
- `pagamento` (OneToOneField): Relacionado ao Pagamento
- `usuario` (ForeignKey): Usuário
- `numero_comprovante` (CharField): Número único do comprovante
- `dados_compra` (JSONField): Dados do pedido
- `valor_pago` (Decimal): Valor pago
- `data_confirmacao`: Timestamp

### Cartao
- `id` (UUID): Identificador único
- `usuario` (ForeignKey): Usuário
- `numero_token` (CharField): Token do Mercado Pago (NUNCA o número real)
- `nome_titular` (CharField): Nome do titular
- `ultimos_digitos` (CharField): Últimos 4 dígitos
- `bandeira` (CharField): Visa, Mastercard, Elo, etc.
- `mes_validade`, `ano_validade` (IntegerField): Data de validade
- `ativo`, `padrao` (BooleanField): Status

### TransacaoAuditoria
- `id` (UUID): Identificador único
- `pagamento` (ForeignKey): Relacionado ao Pagamento
- `tipo_evento` (CharField): criacao, webhook, consulta, atualizacao_manual, erro
- `status_anterior`, `status_novo` (CharField): Status da transição
- `dados_evento` (JSONField): Dados do evento
- `mensagem` (TextField): Descrição do evento

## 🔐 Segurança

- ✅ **Nunca armazenar CVV**: Apenas tokens do Mercado Pago
- ✅ **Isolamento de dados**: Cada usuário vê apenas seus pagamentos
- ✅ **Auditoria completa**: Todas as mudanças são registradas
- ✅ **Tokens em .env**: Não versionados no Git
- ✅ **Validação de requisições**: Apenas usuários autenticados

## 🔄 Fluxo de Pagamento PIX

1. **Frontend envia**: POST `/api/pagamentos/` com dados do pagamento
2. **Backend cria**: Pagamento no banco com status `processando`
3. **Backend chama**: API Mercado Pago para gerar QR Code
4. **Backend retorna**: QR Code + Cópia e Cola
5. **Frontend exibe**: QR Code para o usuário escanear
6. **Usuário paga**: Via app do banco
7. **Webhook**: Mercado Pago notifica o backend
8. **Backend atualiza**: Status para `aprovado`
9. **Frontend verifica**: Status a cada 5 segundos
10. **Frontend cria**: Pedido após aprovação

## 📝 Logs

Os logs estão salvos em `/logs/pagamentos/`:
- `info.log`: Informações gerais
- `errors.log`: Erros
- `debug.log`: Debug detalhado

## 🚀 Desenvolvimento

### Testar localmente

```bash
# Ativar venv
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Fazer migrações
python manage.py migrate

# Criar superusuário
python manage.py createsuperuser

# Rodar servidor
python manage.py runserver
```

### Testar endpoints

```bash
# Obter token de autenticação
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com", "password":"password"}'

# Criar pagamento
curl -X POST http://localhost:8000/api/pagamentos/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "valor": "100.00",
    "metodo_pagamento": "pix",
    "items": [{"id": 1, "name": "Item", "quantity": 1, "price": "100.00"}],
    "descricao": "Teste"
  }'
```

## 📞 Contato e Suporte

Para dúvidas ou problemas, verifique:
- Logs em `/logs/pagamentos/`
- Admin Django em `/admin/`
- Documentação Mercado Pago: https://developers.mercadopago.com/

## 📄 Licença

Projeto privado - Todos os direitos reservados
