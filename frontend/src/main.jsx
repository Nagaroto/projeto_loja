import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Tema: o site deve iniciar no claro (padrão antigo).
// Remove a classe antes do primeiro paint para evitar navbar escuro.
try {
  document.documentElement.classList.remove('dark')
  localStorage.removeItem('theme')
} catch {
  /* ignore */
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
