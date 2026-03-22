import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  setAuthTokenGetter,
  useGetMe,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import type { UserProfile } from "@workspace/api-client-react";

setAuthTokenGetter(() => localStorage.getItem("poultry_erp_token"));

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setTokenState] = useState<string | null>(
    localStorage.getItem("poultry_erp_token")
  );

  const {
    data: user,
    isLoading: isUserLoading,
    error,
  } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      retry: false,
    },
  });

  useEffect(() => {
    if (error) {
      doLogout();
    }
  }, [error]);

  const login = (newToken: string) => {
    localStorage.setItem("poultry_erp_token", newToken);
    setTokenState(newToken);
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  };

  const doLogout = () => {
    localStorage.removeItem("poultry_erp_token");
    setTokenState(null);
    queryClient.clear();
    window.location.href = "/";
  };

  const logout = doLogout;

  const isLoading = isUserLoading && !!token;

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
