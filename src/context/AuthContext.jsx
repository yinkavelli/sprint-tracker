import { createContext, useContext, useState, useEffect } from "react";
import { getCurrentUserId, getUserById, setCurrentUser, clearCurrentUser } from "../services/DataService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = getCurrentUserId();
    if (id) {
      const u = getUserById(id);
      setUser(u || null);
    }
    setLoading(false);
  }, []);

  function login(userObj) {
    setCurrentUser(userObj.id);
    setUser(userObj);
  }

  function logout() {
    clearCurrentUser();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
