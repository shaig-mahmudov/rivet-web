/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';
import { api, UserResponse, AuthResponse } from '../services/api';

interface AuthContextType {
  user: UserResponse | null;
  loading: boolean;
  isAdmin: boolean;
  login: (requestBody: Record<string, unknown>) => Promise<AuthResponse>;
  register: (requestBody: Record<string, unknown>) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<UserResponse | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(() => {
    const activeUser = api.storage.getUser();
    const token = api.storage.getAccessToken();
    return activeUser && token ? activeUser : null;
  });
  const [loading] = useState(false);

  const login = async (requestBody: Record<string, unknown>) => {
    const res = await api.auth.login(requestBody);
    setUser(res.user);
    return res;
  };

  const register = async (requestBody: Record<string, unknown>) => {
    const res = await api.auth.register(requestBody);
    setUser(res.user);
    return res;
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
