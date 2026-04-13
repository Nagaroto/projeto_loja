# Cereon - Frontend React

Frontend moderno e responsivo para a loja virtual **Cereon**, desenvolvido com React, Vite e Tailwind CSS.

## 🚀 Características

- **React 18** com Hooks e Context API
- **Vite** para build rápido e otimizado
- **React Router v6** para navegação
- **Tailwind CSS** para estilização
- **Framer Motion** para animações suaves
- **Lucide React** para ícones modernos
- **Design Responsivo** (Mobile First)
- **Tema Verde Claro** (Cereon Green)
- **State Management com Context API**
- **Dados Mockados** para demonstração

## 📁 Estrutura do Projeto

```
frontend/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx          # Barra de navegação responsiva
│   │   ├── Footer.jsx          # Rodapé
│   │   ├── ProductCard.jsx     # Card de produto
│   │   ├── CartDrawer.jsx      # Drawer/painel do carrinho
│   │   ├── Hero.jsx            # Seção hero da home
│   │   └── WhyChoose.jsx       # Seção "Por que escolher"
│   ├── pages/
│   │   ├── Home.jsx            # Página inicial
│   │   ├── Catalogo.jsx        # Catálogo com filtros
│   │   ├── Login.jsx           # Página de login
│   │   └── Sobre.jsx           # Página sobre
│   ├── context/
│   │   └── CartContext.jsx     # Context do carrinho
│   ├── data/
│   │   └── mockProducts.js     # Dados mockados
│   ├── App.jsx                 # Componente principal com Router
│   ├── main.jsx                # Entry point
│   └── index.css               # Estilos globais
├── index.html                  # HTML principal
├── vite.config.js             # Configuração do Vite
├── tailwind.config.js         # Configuração do Tailwind
├── postcss.config.js          # PostCSS para Tailwind
└── package.json               # Dependências e scripts
```

## 🛠️ Instalação e Uso

### Pré-requisitos
- Node.js 16+ 
- npm ou yarn

### Instalação

```bash
cd frontend
npm install
```

### Desenvolvimento

```bash
npm run dev
```

O servidor será iniciado em `http://localhost:3000`

### Build para Produção

```bash
npm run build
```

### Preview de Produção

```bash
npm run preview
```

## 📦 Dependências Principais

- **react** (18.2.0) - Biblioteca React
- **react-dom** (18.2.0) - DOM para React
- **react-router-dom** (6.20.0) - Roteamento
- **tailwindcss** (3.3.6) - Framework CSS
- **framer-motion** (10.16.16) - Animações
- **lucide-react** (0.294.0) - Ícones
- **vite** (5.0.8) - Build tool
- **autoprefixer** (10.4.16) - PostCSS plugin
- **postcss** (8.4.32) - Transformer CSS

## 🎨 Paleta de Cores

- **Verde Cereon**: `#4ade80`
- **Verde Escuro**: `#16a34a`
- **Verde Claro**: `#f0fdf4`
- **Cinza Escuro**: `#1f2937`
- **Branco**: `#ffffff`

## 📄 Páginas

### Home (`/`)
- Hero section com gradiente verde
- Seção "Por que escolher Cereon"
- Produtos em destaque
- CTA para catálogo

### Catálogo (`/catalogo`)
- Grid responsivo de produtos
- Busca por nome
- Filtros por categoria
- Integração com carrinho

### Sobre (`/sobre`)
- História da marca
- Valores da empresa
- Estatísticas
- CTA para ação

### Login (`/login`)
- Formulário de login
- Validação de campos
- Toggle de visualização de senha
- Opção de cadastro

## 🛒 Carrinho (Context API)

Funcionalidades:
- Adicionar produtos
- Remover produtos
- Atualizar quantidade
- Calcular total
- Drawer lateral responsivo

### Usando o Contexto

```jsx
import { useCart } from './context/CartContext'

function MeuComponente() {
  const { cartItems, addToCart, removeFromCart } = useCart()
  // ...
}
```

## ✨ Animações

- Menu mobile com fade
- Cartão de produto com hover
- Seções com scroll animations
- Hero section com parallax
- Transições suaves com Framer Motion

## 📱 Responsividade

- **Mobile**: 100% responsivo
- **Tablet**: Layout adaptado
- **Desktop**: Experiência otimizada

Breakpoints Tailwind:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

## 🔧 Configuração do Tailwind

Configurado em `tailwind.config.js`:
- Cores customizadas (Cereon Green)
- Fonte Poppins
- Utilidades estendidas

## 📝 Notas de Desenvolvimento

- Dados de produtos são mockados em `src/data/mockProducts.js`
- Sem integração com API/Django neste momento
- Estado do carrinho persiste durante a sessão
- Código comentado para maior clareza

## 🚀 Próximas Etapas

- [ ] Integração com API Django
- [ ] Autenticação real
- [ ] Checkout com pagamento
- [ ] Histórico de pedidos
- [ ] Wishlist
- [ ] Avaliações de produtos
- [ ] Sistema de notificações

## 📞 Suporte

Para dúvidas ou sugestões sobre o frontend, consulte a documentação de cada componente.

---

**Desenvolvido com ❤️ para Cereon**
