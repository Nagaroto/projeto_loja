# 🏗️ Arquitetura do Sistema de Pagamentos

## Fluxo de Dados - Diagrama Visual

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (React)                                 │
│                        frontend/src/pages/Checkout.jsx                      │
│                                                                              │
│  1. Usuário clica "Confirmar Pedido"                                        │
│     ↓                                                                        │
│  2. POST /api/pagamentos/ com dados do pedido                               │
│     (valor, items, metodo_pagamento)                                        │
│     ↓                                                                        │
│  3. Recebe: pagamento_id, qr_code, copia_cola, expiracao                   │
│     ↓                                                                        │
│  4. Renderiza QR Code + Botão "Copiar PIX"                                  │
│     ↓                                                                        │
│  5. Polling: GET /api/pagamentos/{id}/status/ a cada 5s                     │
│     ↓                                                                        │
│  6. Se status === 'aprovado':                                               │
│     ├─ Para polling                                                         │
│     ├─ Cria pedido                                                          │
│     └─ Exibe "Sucesso!"                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
                            HTTP/JSON (API)
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DJANGO BACKEND                                      │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ API Views (pagamentos/views.py)                                     │   │
│  │                                                                     │   │
│  │ PagamentoViewSet                                                   │   │
│  │ ├─ create() → Processa requisição                                  │   │
│  │ ├─ status() → Consulta status                                      │   │
│  │ └─ cancelar() → Cancela pagamento                                  │   │
│  │                                                                     │   │
│  │ ComprovanteViewSet (read-only)                                     │   │
│  │ CartaoViewSet (CRUD + definir_padrao)                              │   │
│  │ TransacaoAuditoriaViewSet (read-only)                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│            ↓                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Serializers (pagamentos/serializers.py)                             │   │
│  │                                                                     │   │
│  │ PagamentoCreateSerializer                                          │   │
│  │ ├─ Validação de dados                                              │   │
│  │ ├─ items (lista)                                                   │   │
│  │ └─ valor, metodo_pagamento                                         │   │
│  │                                                                     │   │
│  │ PagamentoDetailSerializer                                          │   │
│  │ └─ QR Code em base64                                               │   │
│  │                                                                     │   │
│  │ PagamentoStatusResponseSerializer                                  │   │
│  │ └─ Retorna status + dados essenciais                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│            ↓                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Services (pagamentos/services.py)                                   │   │
│  │                                                                     │   │
│  │ MercadoPagoService                                                 │   │
│  │ ├─ criar_pagamento_pix(valor, email, items)                        │   │
│  │ │  ├─ Chama API Mercado Pago                                       │   │
│  │ │  ├─ Recebe qr_code + copia_cola                                  │   │
│  │ │  └─ Retorna dados                                                │   │
│  │ │                                                                  │   │
│  │ ├─ gerar_qr_code_base64(qr_data)                                   │   │
│  │ │  ├─ Converte para imagem                                         │   │
│  │ │  └─ Codifica em base64                                           │   │
│  │ │                                                                  │   │
│  │ ├─ consultar_status_pagamento(mp_id)                               │   │
│  │ │  ├─ Chama API Mercado Pago                                       │   │
│  │ │  ├─ Mapeia status                                                │   │
│  │ │  └─ Retorna resultado                                            │   │
│  │ │                                                                  │   │
│  │ └─ reembolsar_pagamento(mp_id, valor)                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│            ↓                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Models (pagamentos/models.py)                                       │   │
│  │                                                                     │   │
│  │ Pagamento (Principal)                                              │   │
│  │ ├─ id: UUID                                                        │   │
│  │ ├─ usuario: FK(User)                                               │   │
│  │ ├─ valor: Decimal                                                  │   │
│  │ ├─ status: CharField (pendente→processando→aprovado/recusado)     │   │
│  │ ├─ mercado_pago_id: CharField                                      │   │
│  │ ├─ qr_code_base64: TextField (base64 da imagem)                    │   │
│  │ ├─ copia_cola: TextField (código PIX)                              │   │
│  │ ├─ metodo_pagamento: CharField (pix/cartao/boleto)                │   │
│  │ └─ data_*: DateTimeField (timestamps)                              │   │
│  │                                                                     │   │
│  │ Comprovante                                                        │   │
│  │ ├─ pagamento: OneToOne                                             │   │
│  │ ├─ numero_comprovante: CharField (unique)                          │   │
│  │ ├─ dados_compra: JSONField                                         │   │
│  │ └─ valor_pago: Decimal                                             │   │
│  │                                                                     │   │
│  │ Cartao                                                             │   │
│  │ ├─ numero_token: CharField (NUNCA número real!)                    │   │
│  │ ├─ ultimos_digitos: CharField (4 dígitos)                          │   │
│  │ ├─ bandeira, mes_validade, ano_validade                            │   │
│  │ └─ ativo, padrao: BooleanField                                     │   │
│  │                                                                     │   │
│  │ TransacaoAuditoria                                                 │   │
│  │ ├─ pagamento: FK(Pagamento)                                        │   │
│  │ ├─ tipo_evento: CharField (criacao/webhook/consulta/erro)          │   │
│  │ ├─ status_anterior → status_novo                                   │   │
│  │ ├─ dados_evento: JSONField                                         │   │
│  │ └─ mensagem: TextField                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│            ↓                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Database (SQLite - Desenvolvimento)                                 │   │
│  │                                                                     │   │
│  │ Tabelas: pagamento, comprovante, cartao, transacao_auditoria       │   │
│  │ Relações: FK, OneToOne, UUID primários                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
                        HTTPS/REQUESTS (Externo)
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MERCADO PAGO API                                    │
│                                                                              │
│  1. POST /v1/payments                                                       │
│     ├─ Request: transaction_amount, payer.email, notification_url         │
│     ├─ Response: id, status, point_of_interaction.transaction_data         │
│     └─ Dados: qr_code, copy_paste_qr                                       │
│                                                                              │
│  2. GET /v1/payments/{id}                                                  │
│     ├─ Request: payment_id                                                 │
│     └─ Response: status (pending/approved/rejected), transaction_amount    │
│                                                                              │
│  3. POST /v1/payments/{id}/refunds                                         │
│     ├─ Request: amount (opcional)                                          │
│     └─ Response: refund_id, status                                         │
│                                                                              │
│  4. Webhook (POST)                                                         │
│     ├─ Event: payment.updated                                              │
│     ├─ Data: id, status, external_reference                                │
│     └─ Backend valida e atualiza status                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Estrutura de Diretórios

```
projeto_loja/
│
├── pagamentos/                                 ← NOVO APP
│   ├── migrations/
│   │   ├── __init__.py
│   │   └── 0001_initial.py                    (4 models: Pagamento, Comprovante, Cartao, TransacaoAuditoria)
│   │
│   ├── management/
│   │   └── commands/                          (comandos customizados)
│   │
│   ├── __init__.py
│   ├── admin.py                               (Admin customizado com cores e previews)
│   ├── apps.py
│   ├── models.py                              (4 models com UUIDs)
│   ├── serializers.py                         (8 serializers DRF)
│   ├── services.py                            (MercadoPagoService)
│   ├── views.py                               (4 ViewSets + endpoints)
│   ├── urls.py                                (Rotas do app)
│   ├── tests.py                               (Placeholder)
│   ├── test_integration.py                    (9 testes - TODOS PASSANDO ✅)
│   └── README.md                              (Documentação API)
│
├── config/
│   ├── settings.py                            (UPDATED: 'pagamentos' em INSTALLED_APPS + logging)
│   ├── urls.py                                (UPDATED: include('pagamentos.urls'))
│   ├── wsgi.py
│   └── asgi.py
│
├── beckend/
│   ├── models.py                              (Product, Order, etc)
│   ├── views.py
│   ├── urls.py
│   └── ...
│
├── frontend/
│   ├── src/pages/
│   │   └── Checkout.jsx                       (UPDATED: integrado com /api/pagamentos/)
│   ├── package.json
│   └── ...
│
├── .secrets/
│   └── .env.local                             (TOKENS MERCADO PAGO - NÃO VERSIONADO)
│
├── .env                                        (UPDATED: variáveis públicas)
├── .gitignore                                 (UPDATED: .env, .secrets)
├── requirements.txt                           (UPDATED: Pillow>=11.0.0)
│
├── logs/
│   └── pagamentos/
│       ├── info.log                           (Logs de informação)
│       ├── errors.log                         (Logs de erro)
│       └── debug.log                          (Logs de debug)
│
├── TESTING_PAGAMENTOS.md                      (Guia completo de testes)
├── QUICK_START_PAGAMENTOS.md                  (5 minutos para começar)
├── ENDPOINTS_REFERENCE.md                     (Referência de endpoints)
├── IMPLEMENTACAO_PAGAMENTOS.md                (Overview técnico)
├── SETUP_PAGAMENTOS.md                        (Status de setup)
├── CONCLUSAO_PAGAMENTOS.md                    (Resumo final)
│
├── manage.py
├── db.sqlite3
└── README.md
```

---

## Fluxo Detalhado de Criação de Pagamento PIX

```
User clica "Confirmar Pedido"
│
├─→ frontend/src/pages/Checkout.jsx
│   ├─ handleProcessPayment()
│   ├─ POST /api/pagamentos/
│   │  {
│   │    "valor": "150.00",
│   │    "metodo_pagamento": "pix",
│   │    "items": [{...}],
│   │    "descricao": "Compra..."
│   │  }
│   └─ [Envia requisição para backend]
│
└─→ backend/pagamentos/views.py
   ├─ PagamentoViewSet.create()
   ├─ Validações
   │  ├─ valor > 0
   │  ├─ items não vazio
   │  └─ usuário autenticado
   │
   ├─ Cria Pagamento no BD
   │  ├─ status = 'pendente'
   │  └─ data_expiracao = now + 15 min
   │
   ├─ Registra Auditoria
   │  ├─ tipo_evento = 'criacao'
   │  └─ status_novo = 'pendente'
   │
   ├─ MercadoPagoService.criar_pagamento_pix()
   │  ├─ Valida token
   │  ├─ POST https://api.mercadopago.com/v1/payments
   │  │  Envia: transaction_amount, payer.email, notification_url
   │  │  Recebe: id, qr_code, copia_cola
   │  └─ Retorna dados
   │
   ├─ gerar_qr_code_base64()
   │  ├─ Usa biblioteca qrcode
   │  ├─ Gera imagem PNG
   │  └─ Codifica em base64
   │
   ├─ Atualiza Pagamento
   │  ├─ mercado_pago_id = id recebido
   │  ├─ qr_code_base64 = imagem base64
   │  ├─ copia_cola = código PIX
   │  ├─ status = 'processando'
   │  └─ salva no BD
   │
   ├─ Registra Auditoria (sucesso)
   │  └─ mensagem = "QR Code gerado com sucesso"
   │
   └─ Retorna Response 201 Created
      {
        "pagamento_id": "uuid",
        "mercado_pago_id": "123456",
        "qr_code": "data:image/png;base64,...",
        "copia_cola": "00020126360014br...",
        "expiracao": "2026-04-17T16:00:00Z",
        "valor": "150.00",
        "status": "processando"
      }

Volta para Frontend
│
└─→ frontend/src/pages/Checkout.jsx
   ├─ setPaymentData(resposta)
   ├─ setShowPaymentSection(true)
   ├─ Renderiza QR Code
   │  └─ <img src={paymentData.qr_code} />
   │
   ├─ Renderiza Código PIX
   │  └─ Botão "Copiar" funciona
   │
   └─ Inicia Polling
      ├─ GET /api/pagamentos/{id}/status/
      ├─ A cada 5 segundos
      └─ Enquanto status !== 'aprovado'

Usuário Escaneia/Copia PIX
│
└─→ App do Banco / Mercado Pago
   ├─ Usuário confirma pagamento
   └─ Mercado Pago atualiza status

Mercado Pago Aprova
│
├─→ Webhook para backend (POST /api/pagamentos/webhook/)
│   [PREPARADO - Não implementado no MVP]
│
└─→ Frontend Detecta via Polling
   ├─ GET /api/pagamentos/{id}/status/
   ├─ status === 'aprovado'
   ├─ Para polling
   ├─ Registra auditoria (webhook simulado)
   └─ Cria pedido automaticamente

Sucesso! ✅
│
└─→ Frontend Exibe Confirmação
    ├─ "Pagamento aprovado com sucesso!"
    ├─ Limpa carrinho
    └─ Redireciona para Minha Conta
```

---

## Integração Frontend-Backend

```
FRONTEND (React)                    BACKEND (Django)
════════════════════════════════════════════════════════

Checkout.jsx
    │
    ├─ const [paymentData, setPaymentData] = useState(null)
    │
    ├─ handleProcessPayment()
    │   │
    │   └─→ axios.post('/api/pagamentos/', payload)
    │       │
    │       ├─ Headers: Authorization: Bearer token
    │       ├─ Content-Type: application/json
    │       │
    │       └─→ PagamentoViewSet.create()
    │           ├─ Serializer.is_valid()
    │           ├─ Create Pagamento
    │           ├─ Call MercadoPagoService
    │           ├─ Generate QR Code
    │           ├─ Save to DB
    │           └─ Return 201 Created
    │               ↓
    ├─ Recebe resposta
    │   ├─ setPaymentData(resposta)
    │   ├─ setShowPaymentSection(true)
    │   └─ Renderiza QR Code
    │
    ├─ useEffect(() => {polling})
    │   │
    │   └─→ GET /api/pagamentos/{id}/status/
    │       │
    │       └─→ PagamentoViewSet.status()
    │           ├─ Get Pagamento
    │           ├─ Call MercadoPagoService.consultar_status()
    │           ├─ Update if changed
    │           ├─ Register Auditoria
    │           └─ Return 200 OK
    │               ↓
    ├─ Recebe novo status
    │   ├─ setPaymentStatus(status)
    │   │
    │   └─ if (status === 'aprovado')
    │       ├─ clearInterval(polling)
    │       ├─ handlePlaceOrderAfterPayment()
    │       │   │
    │       │   └─→ POST /checkout/place/
    │       │       (do otro app)
    │       │
    │       ├─ clearCart()
    │       ├─ navigate('/minha-conta')
    │       └─ Exibe "Sucesso!"
```

---

## Fluxo de Dados em Tempo Real

```
Estado no BD

Pagamento 1:
├─ status: "pendente"           ← Criado
├─ data_criacao: 15:30:30
└─ qr_code_base64: base64data

    ↓ (Após 30 segundos - usuário paga)

Pagamento 1:
├─ status: "aprovado"           ← Webhook/API aprova
├─ data_pagamento: 15:30:45
├─ qr_code_base64: base64data
└─ copia_cola: "00020126..."

Auditoria:
├─ Evento 1: criacao (pendente → pendente)
├─ Evento 2: webhook (pendente → processando)
└─ Evento 3: webhook (processando → aprovado)
```

---

## Segurança - Fluxo de Tokens

```
Cliente HTTP
    │
    ├─→ POST /api/token/
    │   └─ email + password
    │       ↓
    │   Django AUTH
    │   ├─ Verifica credenciais
    │   ├─ Gera JWT
    │   └─ Retorna token + refresh
    │       ↓
    ├─ Armazena token em localStorage
    │
    ├─→ POST /api/pagamentos/
    │   ├─ Authorization: Bearer {JWT}
    │   ├─ Content-Type: application/json
    │   └─ Payload
    │       ↓
    │   Django Authentication
    │   ├─ Decodifica JWT
    │   ├─ Verifica assinatura
    │   ├─ Verifica expiração
    │   ├─ Obtém user_id
    │   └─ Autentica request
    │       ↓
    │   ViewSet.create(request)
    │   ├─ request.user = User autenticado
    │   ├─ Cria Pagamento com request.user
    │   ├─ Usuário A não vê pagamento de B
    │   └─ Sucesso!
    │
    └─ (Se token inválido)
        └─ 401 Unauthorized
```

---

**Diagrama Criado:** 17 de Abril de 2026  
**Sistema:** Projeto Loja - App Pagamentos  
**Status:** ✅ Completo e Funcional
