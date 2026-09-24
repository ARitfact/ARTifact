import {
  createContext,
  useCallback,
  useEffect,
  useState,
} from "react";

import { authService } from "../services/authService";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  const [verificationEmail, setVerificationEmail] =
    useState("");

  const checkAuth = useCallback(async () => {
    try {
      const response =
        await authService.getCurrentUser();

      setUser(
        response?.data?.user || response?.user || null
      );
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback((userData) => {
    setUser(
      userData?.data?.user || userData?.user || userData
    );
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error(
        "Logout failed:",
        error
      );
    } finally {
      setUser(null);
    }
  }, []);

  const value = {
    user,

    loading,

    isAuthenticated: Boolean(user),

    login,

    logout,

    checkAuth,

    verificationEmail,

    setVerificationEmail,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}