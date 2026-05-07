import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../services/api';

const typeLabel = (t) => {
  if (t === 'promocao') return 'Promoção';
  if (t === 'cupom') return 'Cupom';
  return 'Aviso';
};

export function NotificationsBell() {
  const { token, getValidToken } = useAuth();
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);
  const wrapRef = useRef(null);

  const panelClasses = useMemo(() => {
    return isDark
      ? 'bg-gray-800 border-gray-700 text-gray-100'
      : 'bg-white border-cereon-green/20 text-cereon-dark';
  }, [isDark]);

  const fetchNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const t = await getValidToken();
      if (!t) return;
      const res = await axios.get(`${API_URL}/me/notifications/`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      setUnreadCount(res.data?.unread_count ?? 0);
      setItems(Array.isArray(res.data?.results) ? res.data.results : []);
    } catch (e) {
      // silencia: navbar não deve travar por falha na API
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      const t = await getValidToken();
      if (!t) return;
      await axios.post(
        `${API_URL}/me/notifications/${id}/read/`,
        {},
        { headers: { Authorization: `Bearer ${t}` } }
      );
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      const t = await getValidToken();
      if (!t) return;
      await axios.post(
        `${API_URL}/me/notifications/read-all/`,
        {},
        { headers: { Authorization: `Bearer ${t}` } }
      );
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: n.read_at || new Date().toISOString() })));
      setUnreadCount(0);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const id = window.setInterval(fetchNotifications, 30000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!open) return;
    fetchNotifications();
    // Regra: ao "visualizar" (abrir dropdown), as não lidas devem sumir do ícone.
    // Consideramos visualização = abrir a lista.
    if (unreadCount > 0) markAllRead();
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!token) return null;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative p-2 ${isDark ? 'text-gray-100 hover:bg-gray-700' : 'text-cereon-dark hover:bg-cereon-light'} rounded-lg transition-colors`}
        aria-label="Notificações"
        title="Notificações"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full pt-2 z-50 w-[22rem]">
          <div className={`border rounded-xl shadow-xl overflow-hidden ${panelClasses}`}>
            <div className={`px-4 py-2 border-b ${isDark ? 'border-gray-700 bg-cereon-green/20' : 'border-cereon-green/10 bg-cereon-light/80'} flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold tracking-wide uppercase ${isDark ? 'text-cereon-green' : 'text-cereon-green'}`}>
                  Notificações
                </span>
                {loading && <Loader2 className="w-4 h-4 animate-spin opacity-70" />}
              </div>
              <button
                type="button"
                onClick={markAllRead}
                className={`text-xs font-semibold px-2 py-1 rounded-md transition-colors ${
                  isDark ? 'hover:bg-gray-700/70 text-gray-100' : 'hover:bg-cereon-light text-cereon-dark'
                }`}
                title="Marcar todas como lidas"
              >
                <span className="inline-flex items-center gap-1">
                  <CheckCheck className="w-4 h-4" />
                  Ler tudo
                </span>
              </button>
            </div>

            <div className="max-h-[22rem] overflow-auto">
              {items.length === 0 ? (
                <div className={`px-4 py-6 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Nenhuma notificação por aqui.
                </div>
              ) : (
                items.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b last:border-b-0 ${
                      isDark ? 'border-gray-700' : 'border-gray-100'
                    } ${n.is_read ? (isDark ? 'opacity-70' : 'opacity-80') : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              isDark ? 'bg-gray-700 text-gray-100' : 'bg-cereon-light text-cereon-dark'
                            }`}
                          >
                            {typeLabel(n.type)}
                          </span>
                          {!n.is_read && <span className="w-2 h-2 rounded-full bg-red-500" title="Não lida" />}
                        </div>
                        <p className={`mt-1 font-semibold text-sm ${isDark ? 'text-gray-100' : 'text-cereon-dark'} truncate`}>
                          {n.title}
                        </p>
                        <p className={`mt-1 text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {n.message}
                        </p>
                      </div>

                      {!n.is_read && (
                        <button
                          type="button"
                          onClick={() => markRead(n.id)}
                          className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-md transition-colors ${
                            isDark ? 'hover:bg-gray-700/70 text-gray-100' : 'hover:bg-cereon-light text-cereon-dark'
                          }`}
                          title="Marcar como lida"
                        >
                          <span className="inline-flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            Lida
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

