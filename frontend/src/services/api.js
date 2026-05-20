import axios from "axios";

const defaultApiHost = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? 'http://127.0.0.1:8000'
  : 'https://projeto-loja-uqac.onrender.com';
const RAW_API_URL = (import.meta.env.VITE_API_URL || defaultApiHost).replace(/\/+$/, "");
export const API_URL = RAW_API_URL.endsWith("/api") ? RAW_API_URL : `${RAW_API_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
});

// INTERCEPTOR → adiciona token automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || localStorage.getItem("access");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }


  return config;
});

// INTERCEPTOR → trata token expirado
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Token expirado
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refresh = localStorage.getItem("refresh_token") || localStorage.getItem("refresh");

      if (!refresh) {
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_URL}/token/refresh/`, {
          refresh,
        });

        const newAccess = res.data.access;

        localStorage.setItem("token", newAccess);
        localStorage.setItem("access", newAccess);

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;

        return api(originalRequest);
      } catch (err) {
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;