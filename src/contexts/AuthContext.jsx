import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthChange, logoutUser, reloadCurrentUser, sendVerificationEmail } from '../lib/auth';

const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  isEmailVerified: false,
  logout: async () => {},
  getIdToken: async () => null,
  reloadUser: async () => null,
  resendVerification: async () => ({ success: false }),
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  useEffect(() => {
    // Timeout de segurança: garante que a aplicação nunca fique travada na tela de splash
    // se o Firebase Auth demorar ou falhar em responder (ex: rede instável, offline).
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 2500);

    const unsubscribe = onAuthChange(async (currentUser) => {
      clearTimeout(safetyTimer);
      setUser(currentUser);
      setIsEmailVerified(Boolean(currentUser?.emailVerified));
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

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
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

  const reloadUser = async () => {
    try {
      const refreshed = await reloadCurrentUser();
      if (refreshed) {
        setIsEmailVerified(Boolean(refreshed.emailVerified));
        // Cria um proxy para garantir nova referência de estado no React sem perder métodos do protótipo (como getIdTokenResult)
        const userProxy = new Proxy(refreshed, {
          get(target, prop, receiver) {
            const val = Reflect.get(target, prop, receiver);
            if (typeof val === 'function') return val.bind(target);
            return val;
          }
        });
        setUser(userProxy);
        if (typeof refreshed.getIdToken === 'function') {
          const idToken = await refreshed.getIdToken(true);
          setToken(idToken);
        }
      }
      return refreshed;
    } catch (err) {
      console.error('[AuthContext] Erro ao recarregar usuário:', err);
      return null;
    }
  };

  const resendVerification = async () => {
    return await sendVerificationEmail(user);
  };

  const computedIsEmailVerified = Boolean(isEmailVerified || (user && user.emailVerified));

  const logout = async () => {
    setLoading(true);
    await logoutUser();
    setUser(null);
    setToken(null);
    setIsEmailVerified(false);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isEmailVerified: computedIsEmailVerified,
      logout,
      getIdToken,
      reloadUser,
      resendVerification
    }}>
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
