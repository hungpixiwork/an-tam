import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/app/auth';
import { LocaleProvider } from '@/app/locale';
import { router } from '@/app/router';
import { ApiError } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { triggerChunkReloadGuard } from '@/lib/chunkRecovery';
import './index.css';

// Xử lý lỗi preload từ Vite (Xóa bỏ reload loop vô điều kiện)
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  console.warn('[vite:preloadError] Lỗi tải tài nguyên động:', event);

  // Chỉ reload nếu guard cho phép (chưa reload trong vòng 10s cho route này)
  if (triggerChunkReloadGuard(window.location.pathname)) {
    window.location.reload();
  } else {
    console.error(
      '[vite:preloadError] Bị chặn bởi reload guard để chống lặp vô hạn (quá 1 lần trong 10s).'
    );
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Không thử lại lỗi 4xx (sai dữ liệu / chưa đăng nhập)
      retry: (count, err: any) => !((err?.status >= 400 && err?.status < 500) || (err instanceof ApiError && err.status >= 400 && err.status < 500)) && count < 2,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LocaleProvider>
            <RouterProvider router={router} />
          </LocaleProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
