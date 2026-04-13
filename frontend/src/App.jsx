import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { CartDrawer } from './components/CartDrawer'
import { ScrollToTop } from './components/ScrollToTop'
import { Home } from './pages/Home'
import { Catalogo } from './pages/Catalogo'
import { Login } from './pages/Login'
import { Sobre } from './pages/Sobre'
import { ProductDetail } from './pages/ProductDetail'

function App() {
  return (
    <CartProvider>
      <Router>
        <ScrollToTop />
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <CartDrawer />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/catalogo" element={<Catalogo />} />
              <Route path="/produto/:id" element={<ProductDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/sobre" element={<Sobre />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </CartProvider>
  )
}

export default App
