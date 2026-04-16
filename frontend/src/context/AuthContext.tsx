import React, { createContext, useContext, useState } from 'react';

interface AuthUser {
  username: string;
  role: string;
  permissions: string[];
  token: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (token: string, username: string, role: string, permissions: string[]) => void;
  logout: () => void;
  refreshPermissions: () => Promise<void>;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedRole = localStorage.getItem('role');
    const storedPerms = localStorage.getItem('permissions');

    if (storedToken && storedUser && storedRole && storedPerms) {
      return {
        token: storedToken,
        username: storedUser,
        role: storedRole,
        permissions: JSON.parse(storedPerms),
      };
    }
    return null;
  });

  const login = (token: string, username: string, role: string, permissions: string[]) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', username);
    localStorage.setItem('role', role);
    localStorage.setItem('permissions', JSON.stringify(permissions));
    setUser({ token, username, role, permissions });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('permissions');
    setUser(null);
  };

  // Re-fetches permissions from the backend so the UI stays in sync
  // when an admin changes a role's permissions during an active session.
  const refreshPermissions = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/roles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      // Re-decode the JWT to get the current role, then find matching role in DB
      const parts = token.split('.');
      if (parts.length !== 3) return;
      const payload = JSON.parse(window.atob(parts[1]));
      const roles: { name: string; permissions: string[] }[] = await res.json();
      const myRole = roles.find((r) => r.name === payload.role);
      if (myRole && user) {
        const updated = { ...user, permissions: myRole.permissions };
        localStorage.setItem('permissions', JSON.stringify(myRole.permissions));
        setUser(updated);
      }
    } catch {
      // silently ignore — stale permissions are still usable
    }
  };

  const hasPermission = (permission: string): boolean =>
    user?.permissions.includes(permission) ?? false;

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshPermissions, isAuthenticated: !!user, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
