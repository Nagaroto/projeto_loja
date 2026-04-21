import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const AlertContext = createContext(null);

function normalizeMessage(message) {
  if (message == null) return '';
  return typeof message === 'string' ? message : String(message);
}

export function AlertProvider({ children }) {
  const [alertState, setAlertState] = useState({
    isOpen: false,
    title: 'Aviso',
    message: '',
    type: 'info',
  });
  const resolverRef = useRef(null);
  const nativeAlertRef = useRef(window.alert.bind(window));

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current();
      resolverRef.current = null;
    }
  }, []);

  const showAlert = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setAlertState({
        isOpen: true,
        title: options.title || 'Aviso',
        message: normalizeMessage(message),
        type: options.type || 'info',
      });
    });
  }, []);

  useEffect(() => {
    window.alert = (message) => {
      showAlert(message);
    };

    return () => {
      window.alert = nativeAlertRef.current;
    };
  }, [showAlert]);

  const typeClassMap = {
    success: 'bg-white border-cereon-green text-cereon-dark',
    error: 'bg-white border-red-200 text-cereon-dark',
    warning: 'bg-white border-cereon-green text-cereon-dark',
    info: 'bg-white border-gray-200 text-cereon-dark',
  };

  const cardClass = typeClassMap[alertState.type] || typeClassMap.info;

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}

      {alertState.isOpen ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-xl border shadow-xl ${cardClass}`}>
            <div className="p-6 space-y-3">
              <h3 className="text-xl font-semibold">{alertState.title}</h3>
              <p className="text-sm leading-relaxed break-words">{alertState.message}</p>
            </div>
            <div className="px-6 pb-6 flex justify-end">
              <button
                type="button"
                onClick={closeAlert}
                className="px-5 py-2 rounded-lg font-medium bg-cereon-green text-white hover:bg-green-600 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error('useAlert deve ser usado dentro de AlertProvider');
  }
  return ctx;
}
