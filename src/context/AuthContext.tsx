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

const CURRENT_USER_KEY = 'onboarding_current_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchRoleForUser = async (user: User) => {
    if (user.role_id) {
      const role = await db.getRoleById(user.role_id);
      setCurrentRole(role);
    } else {
      setCurrentRole(null);
    }
  };

  const refreshUserData = async () => {
    if (!currentUser) return;
    const freshUser = await db.getUserById(currentUser.id);
    if (freshUser) {
      setCurrentUser(freshUser);
      await fetchRoleForUser(freshUser);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedUserId = localStorage.getItem(CURRENT_USER_KEY);
        if (savedUserId) {
          const user = await db.getUserById(savedUserId);
          if (user) {
            setCurrentUser(user);
            await fetchRoleForUser(user);
          } else {
            localStorage.removeItem(CURRENT_USER_KEY);
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
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
      localStorage.setItem(CURRENT_USER_KEY, adminUser.id);
      return { success: true, isAdmin: true };
    }

    // 2. Check if user exists
    const existingUser = await db.getUserByPersonalId(personalId);
    if (existingUser) {
      setCurrentUser(existingUser);
      await fetchRoleForUser(existingUser);
      localStorage.setItem(CURRENT_USER_KEY, existingUser.id);
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
    await fetchRoleForUser(newUser);
    localStorage.setItem(CURRENT_USER_KEY, newUser.id);
    return newUser;
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentRole(null);
    localStorage.removeItem(CURRENT_USER_KEY);
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
