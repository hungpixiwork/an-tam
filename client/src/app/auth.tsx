import { createContext, useContext, type ReactNode } from 'react';
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
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
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

  const value: AuthValue = {
    me: meQuery.data ?? null,
    loading: meQuery.isPending,
    login: (email, password) => loginMut.mutateAsync({ email, password }),
    register: (input) => registerMut.mutateAsync(input),
    logout: async () => {
      await logoutMut.mutateAsync();
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
