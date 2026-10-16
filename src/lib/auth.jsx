import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, tokenStore } from '@/lib/api';
import { queryClientInstance } from '@/lib/query-client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  useEffect(() => {
    if (!tokenStore.get()) return;
    api.get('/auth/me').then(setUser).catch(() => tokenStore.set(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const out = () => { setUser(null); queryClientInstance.clear(); };
    window.addEventListener('encore:signed-out', out);
    return () => window.removeEventListener('encore:signed-out', out);
  }, []);

  const signIn = useCallback(({ token, user: u }) => {
    tokenStore.set(token);
    queryClientInstance.clear();
    setUser(u);
  }, []);

  const signOut = useCallback(() => {
    tokenStore.set(null);
    queryClientInstance.clear();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, setUser, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function homeFor(user) {
  if (!user) return '/welcome';
  if (user.role === 'admin') return '/admin';
  if (user.role === 'driver') return '/driver';
  return '/app';
}

export function usePublicSettings() {
  return useQuery({ queryKey: ['public-settings'], queryFn: () => api.get('/auth/public-settings'), staleTime: 5 * 60000 });
}
