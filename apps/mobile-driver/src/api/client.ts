import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const API_URL   = process.env.EXPO_PUBLIC_API_URL   ?? 'https://api.tekeche.com';
const        APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN ?? '';

const client = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
  headers: APP_TOKEN ? { 'x-app-token': APP_TOKEN } : {},
});

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let pendingQueue: { resolve: (t: string) => void; reject: (e: any) => void }[] = [];

const processQueue = (error: any, token: string | null) => {
  pendingQueue.forEach(p => error ? p.reject(error) : p.resolve(token!));
  pendingQueue = [];
};

// Called by AuthContext on mount so the interceptor can trigger a full sign-out
// (clearing SecureStore + updating React state) without importing the context directly.
let _onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (fn: () => void) => { _onSessionExpired = fn; };

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (err.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token) => { original.headers.Authorization = `Bearer ${token}`; resolve(client(original)); },
            reject,
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) throw new Error('no refresh token');

        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
        const newToken = data.token;

        await SecureStore.setItemAsync('token', newToken);
        client.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        original.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        return client(original);
      } catch (refreshErr: any) {
        processQueue(refreshErr, null);
        // 503 or network error — DB was temporarily down, keep the session alive so
        // the user can retry. Only a genuine 401 from the refresh endpoint means the
        // token is truly expired and the user must re-authenticate.
        if (refreshErr?.response?.status !== 401) {
          isRefreshing = false;
          return Promise.reject(new Error('Service temporairement indisponible. Réessayez.'));
        }
        // Genuine session expiry — sign out via AuthContext so React state is also cleared.
        _onSessionExpired?.();
        return Promise.reject(new Error('Session expirée. Veuillez vous reconnecter.'));
      } finally {
        isRefreshing = false;
      }
    }

    const apiMessage = err.response?.data?.message;
    const isNetworkError = !err.response && (err.message === 'Network Error' || err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK');
    const isTimeout = err.code === 'ECONNABORTED' || (err.message ?? '').startsWith('timeout');
    const message = apiMessage ?? (isTimeout ? 'Erreur réseau.' : isNetworkError ? 'Erreur réseau.' : err.message ?? 'Erreur réseau.');
    return Promise.reject(new Error(message));
  }
);

export default client;
