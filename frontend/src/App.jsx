// Raiz da SPA: providers, rotas e layout com Navbar/Footer para a loja.

import React from 'react'
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { AlertProvider } from './context/AlertContext'
import { ThemeProvider } from './context/ThemeContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { CartDrawer } from './components/CartDrawer'
import { ScrollToTop } from './components/ScrollToTop'
import { Home } from './pages/Home'
import { Catalogo } from './pages/Catalogo'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { UserAccount } from './pages/UserAccount'
import { Sobre } from './pages/Sobre'
import { ProductDetail } from './pages/ProductDetail'
import { Checkout } from './pages/Checkout'
import { Dashboard } from './pages/Dashboard'
import { PoliticaPrivacidade } from './pages/PoliticaPrivacidade'
import { TermosUso } from './pages/TermosUso'
import { TrocasDevolucoes } from './pages/TrocasDevolucoes'

function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <CartDrawer />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AlertProvider>
        <AuthProvider>
          <CartProvider>
            <Router>
              <ScrollToTop />
              <Routes>
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/catalogo" element={<Catalogo />} />
                  <Route path="/produto/:id" element={<ProductDetail />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/cadastro" element={<Register />} />
                  <Route
                    path="/minha-conta"
                    element={
                      <ProtectedRoute customerOnly>
                        <UserAccount />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/checkout"
                    element={
                      <ProtectedRoute customerOnly>
                        <Checkout />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/sobre" element={<Sobre />} />
                  <Route path="/privacidade" element={<PoliticaPrivacidade />} />
                  <Route path="/termos" element={<TermosUso />} />
                  <Route path="/trocas-devolucoes" element={<TrocasDevolucoes />} />
                </Route>
              </Routes>
            </Router>
          </CartProvider>
        </AuthProvider>
      </AlertProvider>
    </ThemeProvider>
  )
}

export default App
