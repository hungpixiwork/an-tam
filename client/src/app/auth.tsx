import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Me } from '@shared/types/api';
import type { Salutation } from '@shared/types/domain';
import { api, ApiError } from '@/lib/api';
import { qk } from '@/lib/queries';

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  salutation: Salutation;
}

interface AuthValue {
  me: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Me>;
  demoLogin: () => Promise<Me>;
  register: (input: RegisterInput) => Promise<Me>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const meQuery = useQuery({
    queryKey: qk.me,
    queryFn: async () => {
      try {
        return await api.get<Me>('/auth/me');
      } catch (err: any) {
        if (err?.status === 401 || (err instanceof ApiError && err.status === 401)) return null;
        throw err;
      }
    },
    staleTime: Infinity,
    retry: false,
  });

  const onAuthed = (me: Me) => {
    qc.clear();
    qc.setQueryData(qk.me, me);
    return me;
  };

  const loginMut = useMutation({ mutationFn: (v: { email: string; password: string }) => api.post<Me>('/auth/login', v), onSuccess: onAuthed });
  const registerMut = useMutation({ mutationFn: (v: RegisterInput) => api.post<Me>('/auth/register', { ...v }), onSuccess: onAuthed });
  const logoutMut = useMutation({
    mutationFn: () => api.post<null>('/auth/logout'),
    onSettled: () => {
      qc.clear();
      qc.setQueryData(qk.me, null);
    },
  });

  // Tự động xóa phiên và cập nhật giao diện khi token hết hạn giữa chừng
  useEffect(() => {
    const handleExpired = () => {
      qc.clear();
      qc.setQueryData(qk.me, null);
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [qc]);

  const demoLogin = async (): Promise<Me> => {
    const demoEmail = 'demo@antam.vn';
    const demoPassword = 'DemoPassword123!';
    try {
      return await loginMut.mutateAsync({ email: demoEmail, password: demoPassword });
    } catch {
      return await registerMut.mutateAsync({
        email: demoEmail,
        password: demoPassword,
        fullName: 'Nguyễn Văn Minh',
        salutation: 'anh',
      });
    }
  };

  const value: AuthValue = {
    me: meQuery.data ?? null,
    loading: meQuery.isPending,
    login: (email, password) => loginMut.mutateAsync({ email, password }),
    demoLogin,
    register: (input) => registerMut.mutateAsync(input),
    logout: async () => {
      try {
        await logoutMut.mutateAsync();
      } catch {
        // Tránh unhandled promise khi mất mạng hoặc token đã hết hạn trên server
        qc.clear();
        qc.setQueryData(qk.me, null);
      }
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải nằm trong <AuthProvider>');
  return ctx;
}

/** Dùng trong màn đã đăng nhập — luôn có `me`. */
export function useMe(): Me {
  const { me } = useAuth();
  if (!me) throw new Error('Chưa đăng nhập');
  return me;
}
