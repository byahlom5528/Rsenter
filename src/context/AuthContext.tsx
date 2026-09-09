import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types/database';
import { db } from '../services/db';

interface AuthContextType {
  currentUser: User | null;
  currentRole: Role | null;
  isAdmin: boolean;
  isLoading: boolean;
  loginWithPersonalId: (personalId: string) => Promise<{ success: boolean; isNewUser?: boolean; isAdmin?: boolean }>;
  registerUser: (userData: {
    personal_id: string;
    full_name: string;
    role_id: string;
    entry_date: string;
    previous_roles: string[];
  }) => Promise<User>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Persistent LocalStorage keys for session retention across page reloads
const CURRENT_USER_ID_KEY = 'onboarding_current_user_id';
const CURRENT_USER_DATA_KEY = 'onboarding_current_user_data';
const CURRENT_ROLE_DATA_KEY = 'onboarding_current_role_data';
const CURRENT_PERSONAL_ID_KEY = 'onboarding_current_personal_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronously initialize currentUser and currentRole from localStorage
  // to avoid session loss or redirect flash on page refresh
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedData = localStorage.getItem(CURRENT_USER_DATA_KEY);
      if (savedData) {
        return JSON.parse(savedData) as User;
      }
      return null;
    } catch (e) {
      console.error('Failed to parse cached user data from localStorage', e);
      return null;
    }
  });

  const [currentRole, setCurrentRole] = useState<Role | null>(() => {
    try {
      const savedRole = localStorage.getItem(CURRENT_ROLE_DATA_KEY);
      if (savedRole) {
        return JSON.parse(savedRole) as Role;
      }
      return null;
    } catch (e) {
      console.error('Failed to parse cached role data from localStorage', e);
      return null;
    }
  });

  // Only show initial full-page loader if there is an ID stored but data hasn't loaded yet
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const hasCachedUser = Boolean(localStorage.getItem(CURRENT_USER_DATA_KEY));
    const hasUserId = Boolean(localStorage.getItem(CURRENT_USER_ID_KEY));
    return !hasCachedUser && hasUserId;
  });

  const persistSession = (user: User | null, role: Role | null) => {
    if (user) {
      localStorage.setItem(CURRENT_USER_ID_KEY, user.id);
      localStorage.setItem(CURRENT_USER_DATA_KEY, JSON.stringify(user));
      localStorage.setItem(CURRENT_PERSONAL_ID_KEY, user.personal_id);
    } else {
      localStorage.removeItem(CURRENT_USER_ID_KEY);
      localStorage.removeItem(CURRENT_USER_DATA_KEY);
      localStorage.removeItem(CURRENT_PERSONAL_ID_KEY);
    }

    if (role) {
      localStorage.setItem(CURRENT_ROLE_DATA_KEY, JSON.stringify(role));
    } else {
      localStorage.removeItem(CURRENT_ROLE_DATA_KEY);
    }
  };

  const fetchRoleForUser = async (user: User): Promise<Role | null> => {
    if (user.role_id) {
      const role = await db.getRoleById(user.role_id);
      setCurrentRole(role);
      if (role) {
        localStorage.setItem(CURRENT_ROLE_DATA_KEY, JSON.stringify(role));
      } else {
        localStorage.removeItem(CURRENT_ROLE_DATA_KEY);
      }
      return role;
    } else {
      setCurrentRole(null);
      localStorage.removeItem(CURRENT_ROLE_DATA_KEY);
      return null;
    }
  };

  const refreshUserData = async () => {
    if (!currentUser) return;
    try {
      const freshUser = 
        (await db.getUserById(currentUser.id)) || 
        (await db.getUserByPersonalId(currentUser.personal_id));
      
      if (freshUser) {
        setCurrentUser(freshUser);
        const role = await fetchRoleForUser(freshUser);
        persistSession(freshUser, role);
      }
    } catch (err) {
      console.error('Error refreshing user data:', err);
    }
  };

  // Verify and refresh session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedUserId = localStorage.getItem(CURRENT_USER_ID_KEY);
        const savedPersonalId = localStorage.getItem(CURRENT_PERSONAL_ID_KEY);

        if (savedUserId || savedPersonalId) {
          let user: User | null = null;
          if (savedUserId) {
            user = await db.getUserById(savedUserId);
          }
          if (!user && savedPersonalId) {
            user = await db.getUserByPersonalId(savedPersonalId);
          }

          if (user) {
            setCurrentUser(user);
            const role = await fetchRoleForUser(user);
            persistSession(user, role);
          } else {
            // Keep existing cached user if DB is still synchronizing;
            // DO NOT clear localStorage unless user explicitly logs out!
          }
        }
      } catch (err) {
        console.error('Error verifying user auth session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const loginWithPersonalId = async (personalId: string) => {
    // 1. Check if Admin code
    if (personalId === '0000000') {
      let adminUser = await db.getUserByPersonalId('0000000');
      if (!adminUser) {
        // Create admin user if not exists
        adminUser = await db.createUser({
          personal_id: '0000000',
          full_name: 'מנהל מערכת ראשי',
          role_id: '',
          entry_date: new Date().toISOString().split('T')[0],
          previous_roles: ['ניהול מערכת'],
          is_admin: true,
        });
      }
      setCurrentUser(adminUser);
      setCurrentRole(null);
      persistSession(adminUser, null);
      return { success: true, isAdmin: true };
    }

    // 2. Check if user exists
    const existingUser = await db.getUserByPersonalId(personalId);
    if (existingUser) {
      setCurrentUser(existingUser);
      const role = await fetchRoleForUser(existingUser);
      persistSession(existingUser, role);
      return { success: true, isAdmin: existingUser.is_admin, isNewUser: false };
    }

    // 3. User does not exist, redirect to register
    return { success: true, isNewUser: true, isAdmin: false };
  };

  const registerUser = async (userData: {
    personal_id: string;
    full_name: string;
    role_id: string;
    entry_date: string;
    previous_roles: string[];
  }) => {
    const newUser = await db.createUser(userData);
    setCurrentUser(newUser);
    const role = await fetchRoleForUser(newUser);
    persistSession(newUser, role);
    return newUser;
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentRole(null);
    persistSession(null, null);
  };

  const isAdmin = Boolean(currentUser?.is_admin || currentUser?.personal_id === '0000000');

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        isAdmin,
        isLoading,
        loginWithPersonalId,
        registerUser,
        logout,
        refreshUserData,
      }}
    >
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
