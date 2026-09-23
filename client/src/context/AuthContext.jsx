import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize from localStorage and validate session
  useEffect(() => {
    const savedToken = localStorage.getItem('donorsync_token');
    const savedUser = localStorage.getItem('donorsync_user');

    if (savedToken && savedUser) {
      if (savedToken.startsWith('mock-') || savedToken.includes('mock-jwt')) {
        localStorage.removeItem('donorsync_token');
        localStorage.removeItem('donorsync_user');
        setToken(null);
        setUser(null);
      } else {
        try {
          const parsedUser = JSON.parse(savedUser);
          setToken(savedToken);
          setUser(parsedUser);
        } catch (e) {
          localStorage.removeItem('donorsync_token');
          localStorage.removeItem('donorsync_user');
        }
      }
    }
    setLoading(false);

    // Supabase Auth State Change Listener
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('donorsync_token');
          localStorage.removeItem('donorsync_user');
          setToken(null);
          setUser(null);
        } else if (event === 'SIGNED_IN' && session?.user) {
          // If signed in via Supabase Auth directly (e.g. social or magic link)
          if (!localStorage.getItem('donorsync_token')) {
            const sbUser = {
              id: session.user.id,
              email: session.user.email,
              role: session.user.user_metadata?.role || 'Donor',
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0]
            };
            setToken(session.access_token);
            setUser(sbUser);
            localStorage.setItem('donorsync_token', session.access_token);
            localStorage.setItem('donorsync_user', JSON.stringify(sbUser));
          }
        }
      });

      return () => {
        subscription?.unsubscribe();
      };
    }
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      // STRICT VALIDATION: If response is not ok, throw real error - DO NOT FALL BACK TO MOCK TOKENS!
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed. Please check your credentials.');
      }

      if (!data.token || !data.user) {
        throw new Error('Malformed authentication response from server.');
      }

      localStorage.setItem('donorsync_token', data.token);
      localStorage.setItem('donorsync_user', JSON.stringify(data.user));
      sessionStorage.setItem('just_logged_in', 'true');
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      // Strictly rethrow without fabricating sessions
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role, additionalFields = {}) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, ...additionalFields })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed. Please try again.');
      }

      if (!data.token || !data.user) {
        throw new Error('Malformed registration response from server.');
      }

      localStorage.setItem('donorsync_token', data.token);
      localStorage.setItem('donorsync_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('donorsync_token');
    localStorage.removeItem('donorsync_user');
    setToken(null);
    setUser(null);
    if (supabase) {
      supabase.auth.signOut().catch(() => {});
    }
  };

  const isRole = (requiredRole) => {
    return user && user.role === requiredRole;
  };

  const hasAnyRole = (allowedRoles = []) => {
    return user && allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, isRole, hasAnyRole }}>
      {children}
    </AuthContext.Provider>
  );
};
