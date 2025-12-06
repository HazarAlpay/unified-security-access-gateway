import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
} from 'react';
import { jwtDecode } from 'jwt-decode';

import api, { TOKEN_STORAGE_KEY } from '../api/axios';

const ROLE_STORAGE_KEY = 'usag_role';
const USER_STORAGE_KEY = 'usag_user';

const AuthContext = createContext(null);

const getStoredUser = () => {
  const stored = localStorage.getItem(USER_STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY),
  );
  const [role, setRole] = useState(() => localStorage.getItem(ROLE_STORAGE_KEY));
  const [user, setUser] = useState(getStoredUser);
  
  const isAuthenticated = Boolean(token);

  const persistSession = useCallback((accessToken, userRole) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    localStorage.setItem(ROLE_STORAGE_KEY, userRole);

    let decodedUser = null;
    try {
      const decoded = jwtDecode(accessToken);
      decodedUser = { username: decoded.sub ?? 'user' };
    } catch {
      decodedUser = { username: 'user' };
    }

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(decodedUser));
    setToken(accessToken);
    setRole(userRole);
    setUser(decodedUser);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(ROLE_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setRole(null);
    setUser(null);
    
    // Force Light Mode on Logout
    // Manual reset to avoid Context dependency
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
  }, []);

  const login = useCallback(async (username, password, captchaToken = null) => {
    const payload = { username, password };
    if (captchaToken) {
        payload.captcha_token = captchaToken;
    }
    const { data } = await api.post('/auth/login', payload);
    if (data.access_token) {
      persistSession(data.access_token, data.role);
    }
    return data;
  }, [persistSession]);

  const verifyMfa = useCallback(
    async (tempToken, code) => {
      const { data } = await api.post('/auth/mfa/verify', {
        temp_token: tempToken,
        code,
      });

      persistSession(data.access_token, data.role);
      return data;
    },
    [persistSession],
  );

  const logout = useCallback(async () => {
    try {
      // Attempt backend logout to clear ActiveSession
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Backend logout failed:', error);
    } finally {
      clearSession();
    }
  }, [clearSession]);

  // --- WEBSOCKET NOTIFICATIONS LOGIC ---
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const wsUrl = `ws://localhost:8000/ws/notifications?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket Connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'FORCE_LOGOUT') {
          console.warn('Received Force Logout command');
          clearSession();
          window.location.href = '/login?reason=terminated';
        }
      } catch (e) {
        console.error('WS Message Error:', e);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket Disconnected');
    };

    return () => {
      ws.close();
    };
  }, [isAuthenticated, token, clearSession]);

  // --- IDLE SESSION TIMEOUT LOGIC ---
  //const IDLE_TIMEOUT_MS = 10000; // 10 seconds (FOR TESTING ONLY)
  const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes (Production Standard)

  const idleTimerRef = useRef(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    if (isAuthenticated) {
      idleTimerRef.current = setTimeout(() => {
        // console.log('User idle for too long, logging out...');
        clearSession();
        window.location.href = '/login?expired=true';
      }, IDLE_TIMEOUT_MS);
    }
  }, [isAuthenticated, clearSession]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }

    const handleActivity = () => resetIdleTimer();

    // Events to listen for
    const events = ['mousemove', 'keydown', 'click', 'scroll'];

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Start the timer initially
    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, resetIdleTimer]);

  const value = useMemo(
    () => ({
      user,
      token,
      role,
      isAuthenticated,
      login,
      verifyMfa,
      logout,
    }),
    [user, token, role, isAuthenticated, login, verifyMfa, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

