import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthChange, logoutUser } from '../lib/auth';

const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  logout: async () => {},
  getIdToken: async () => null,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const idToken = await currentUser.getIdToken();
          setToken(idToken);
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('facom_logged_in', 'true');
          }
        } catch (err) {
          console.error('[AuthContext] Erro ao obter token do Firebase:', err);
          setToken(null);
        }
      } else {
        setToken(null);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem('facom_logged_in');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getIdToken = async (forceRefresh = false) => {
    if (!user) return null;
    try {
      const freshToken = await user.getIdToken(forceRefresh);
      setToken(freshToken);
      return freshToken;
    } catch (err) {
      console.error('[AuthContext] Erro ao renovar token:', err);
      return null;
    }
  };

  const logout = async () => {
    setLoading(true);
    await logoutUser();
    setUser(null);
    setToken(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, logout, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
