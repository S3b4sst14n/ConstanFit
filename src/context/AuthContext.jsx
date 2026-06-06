import { useEffect, useState } from "react";
import { api, tokenStorage } from "../lib/api";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(tokenStorage.get()));

  useEffect(() => {
    if (!tokenStorage.get()) return;
    let cancelled = false;
    api.auth
      .me()
      .then((res) => { if (!cancelled) setUser(res.user); })
      .catch(() => tokenStorage.clear())
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const login = async (credentials) => {
    const { user, token } = await api.auth.login(credentials);
    tokenStorage.set(token);
    setUser(user);
    return user;
  };

  const logout = () => {
    tokenStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
