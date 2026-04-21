import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar tema salvo do localStorage na primeira montagem
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('theme-cereon');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Se tem tema salvo, usa ele. Senão, usa preferência do sistema
      const shouldBeDark = savedTheme ? savedTheme === 'dark' : prefersDark;
      
      setIsDark(shouldBeDark);
      applyTheme(shouldBeDark);
    } catch (error) {
      console.error('Erro ao carregar tema:', error);
    }
    setIsLoaded(true);
  }, []);

  // Aplicar tema no DOM
  const applyTheme = (dark) => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Toggle tema e salvar em localStorage
  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    applyTheme(newTheme);
    
    try {
      localStorage.setItem('theme-cereon', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
    }
  };

  const setTheme = (dark) => {
    setIsDark(dark);
    applyTheme(dark);
    
    try {
      localStorage.setItem('theme-cereon', dark ? 'dark' : 'light');
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, setTheme, isLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
}
