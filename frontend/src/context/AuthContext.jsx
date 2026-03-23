import { createContext, useContext, useEffect, useState } from 'react';
import { apiUrl } from '../api';

const AuthContext = createContext(null);

function normalizeUser(user) {
  if (!user) return null;
  return {
    ...user,
    verified: !!(user.verified || user.discord?.verified)
  };
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl('/auth/me'), { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) setUser(normalizeUser(data.user));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const res = await fetch(apiUrl('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) setUser(normalizeUser(data.user));
    return data;
  };

  const logout = async () => {
    await fetch(apiUrl('/auth/logout'), { method: 'POST', credentials: 'include' });
    setUser(null);
  };

  const refreshUser = async () => {
    const res = await fetch(apiUrl('/auth/me'), { credentials: 'include' });
    const data = await res.json();
    if (data?.user) setUser(normalizeUser(data.user));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}