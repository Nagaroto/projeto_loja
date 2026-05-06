import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

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
    isToast: false,
    isConfirm: false,
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    danger: false,
  });
  const resolverRef = useRef(null);
  const timeoutRef = useRef(null);
  const nativeAlertRef = useRef(window.alert.bind(window));

  const finalizeResolver = useCallback((value) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    if (typeof resolve === 'function') {
      resolve(value);
    }
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, isOpen: false, isConfirm: false }));
    finalizeResolver(undefined);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [finalizeResolver]);

  const dismissConfirm = useCallback(
    (confirmed) => {
      setAlertState((prev) => ({ ...prev, isOpen: false, isConfirm: false }));
      finalizeResolver(confirmed);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    },
    [finalizeResolver]
  );

  const showAlert = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      const isToast = options.toast === true;
      const duration = options.duration || 2000;

      setAlertState({
        isOpen: true,
        title: options.title || 'Aviso',
        message: normalizeMessage(message),
        type: options.type || 'info',
        isToast,
        isConfirm: false,
        confirmLabel: 'Confirmar',
        cancelLabel: 'Cancelar',
        danger: false,
      });

      if (isToast) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setAlertState((prev) => ({
            ...prev,
            isOpen: false,
            isConfirm: false,
          }));
          finalizeResolver(undefined);
          timeoutRef.current = null;
        }, duration);
      }
    });
  }, [finalizeResolver]);

  const showConfirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      resolverRef.current = resolve;
      setAlertState({
        isOpen: true,
        title: options.title || 'Confirmar',
        message: normalizeMessage(message),
        type: options.type || 'warning',
        isToast: false,
        isConfirm: true,
        confirmLabel: options.confirmLabel || 'Confirmar',
        cancelLabel: options.cancelLabel || 'Cancelar',
        danger: Boolean(options.danger),
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
    warning: 'bg-white border-amber-200 text-cereon-dark',
    info: 'bg-white border-gray-200 text-cereon-dark',
  };

  const toastClassMap = {
    success: 'bg-cereon-green text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-blue-500 text-white',
  };

  const cardClass = alertState.isToast ? toastClassMap[alertState.type] : typeClassMap[alertState.type];

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {alertState.isOpen ? (
        alertState.isToast ? (
          <div className="fixed top-4 right-4 z-[1100] max-w-[min(100vw-2rem,28rem)]">
            <div className={`px-4 py-3 rounded-lg shadow-lg font-medium text-sm ${cardClass} animate-fade-in-out`}>
              {alertState.message}
            </div>
          </div>
        ) : alertState.isConfirm ? (
          <div
            role="presentation"
            className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm"
            onClick={() => dismissConfirm(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-dialog-title"
              className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 pb-4">
                <div className="flex gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                      alertState.danger ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    <AlertTriangle className="h-6 w-6" strokeWidth={2} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                    <h3 id="confirm-dialog-title" className="text-lg font-bold text-gray-900 leading-snug">
                      {alertState.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed break-words">{alertState.message}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => dismissConfirm(false)}
                  className="w-full sm:w-auto rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
                >
                  {alertState.cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={() => dismissConfirm(true)}
                  className={`w-full sm:w-auto rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors ${
                    alertState.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-cereon-green hover:bg-green-600'
                  }`}
                >
                  {alertState.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
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
        )
      ) : null}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error('useAlert deve ser usado dentro de um AlertProvider');
  }
  return ctx;
}
