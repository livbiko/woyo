import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Sentry from '@sentry/react-native';
import * as Crypto from 'expo-crypto';
import { setSessionExpiredHandler } from '../api/client';

type Role = 'passenger' | 'driver' | 'admin' | null;

interface AuthUser {
  _id: string;
  phone: string;
  name?: string;
  avatar?: string;
  [key: string]: unknown;
}

interface AuthState {
  token: string | null;
  role: Role;
  user: AuthUser | null;
  loading: boolean;
  signIn: (token: string, role: Role, user: AuthUser, refreshToken?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: (user: AuthUser) => void;
  deviceToken: string | null;
}

const AuthContext = createContext<AuthState>({} as AuthState);

// Generate or retrieve a permanent device token (survives logout, not app uninstall)
async function getOrCreateDeviceToken(): Promise<string> {
  let dt = await SecureStore.getItemAsync('deviceToken');
  if (!dt) {
    dt = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      Math.random().toString() + Date.now().toString()
    );
    await SecureStore.setItemAsync('deviceToken', dt);
  }
  return dt;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const dt = await getOrCreateDeviceToken();
        setDeviceToken(dt);

        const [t, r, u] = await Promise.all([
          SecureStore.getItemAsync('token'),
          SecureStore.getItemAsync('role'),
          SecureStore.getItemAsync('user'),
        ]);

        if (t) {
          // Existing session — restore from SecureStore instantly (no network needed)
          setToken(t);
          setRole((r || 'passenger') as Role);
          if (u) setUser(JSON.parse(u));
        } else {
          // No session — preload cached user for instant display, then try device login
          if (u) setUser(JSON.parse(u));
          try {
            const { default: client } = await import('../api/client');
            const { data } = await client.post('/auth/device-login', { deviceToken: dt });
            await Promise.all([
              SecureStore.setItemAsync('token', data.token),
              SecureStore.setItemAsync('role', data.role || 'passenger'),
              SecureStore.setItemAsync('user', JSON.stringify(data.user)),
              data.refreshToken ? SecureStore.setItemAsync('refreshToken', data.refreshToken) : Promise.resolve(),
            ]);
            setToken(data.token);
            setRole(data.role || 'passenger');
            setUser(data.user);
            Sentry.setUser({ id: data.user._id });
          } catch {
            // Device not registered — will show register screen
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (t: string, r: Role, u: AuthUser, refreshToken?: string) => {
    await Promise.all([
      SecureStore.setItemAsync('token', t),
      SecureStore.setItemAsync('role', r || 'passenger'),
      SecureStore.setItemAsync('user', JSON.stringify(u)),
      refreshToken ? SecureStore.setItemAsync('refreshToken', refreshToken) : Promise.resolve(),
    ]);
    setToken(t);
    setRole(r);
    setUser(u);
    Sentry.setUser({ id: u._id });

    // Register device so future logins skip OTP
    const dt = await getOrCreateDeviceToken();
    setDeviceToken(dt);
    try {
      const { default: client } = await import('../api/client');
      await client.post('/auth/register-device', { deviceToken: dt });
    } catch {}
  };

  const signOut = useCallback(async () => {
    await Promise.all([
      SecureStore.deleteItemAsync('token'),
      SecureStore.deleteItemAsync('role'),
      SecureStore.deleteItemAsync('user'),
      SecureStore.deleteItemAsync('refreshToken'),
    ]);
    setToken(null);
    setRole(null);
    setUser(null);
    Sentry.setUser(null);
  }, []);

  // Register with the API client so it can trigger a full sign-out (React state +
  // SecureStore) when a refresh token is genuinely rejected by the server.
  useEffect(() => {
    setSessionExpiredHandler(signOut);
  }, [signOut]);

  const refreshUser = (u: AuthUser) => {
    setUser(u);
    SecureStore.setItemAsync('user', JSON.stringify(u));
  };

  return (
    <AuthContext.Provider value={{ token, role, user, loading, signIn, signOut, refreshUser, deviceToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
