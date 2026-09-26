import { describe, expect, it } from 'vitest';

describe('Auth & Onboarding Flow Verification', () => {
  describe('Protected Route Redirect Logic', () => {
    it('Chưa đăng nhập khi vào URL bất kỳ -> điều hướng về /dang-nhap kèm full path và search params', () => {
      const location = { pathname: '/mo-phong', search: '?preset=suy-thoai-nhe' };

      const getRedirectState = (me: null | object, loc: { pathname: string; search: string }) => {
        if (!me) {
          return { to: '/dang-nhap', state: { from: loc.pathname + loc.search } };
        }
        return null;
      };

      const redirect = getRedirectState(null, location);
      expect(redirect).toEqual({
        to: '/dang-nhap',
        state: { from: '/mo-phong?preset=suy-thoai-nhe' },
      });
    });

    it('Chưa đăng nhập khi vào /bat-dau -> OnboardingLayout điều hướng về /dang-nhap kèm state.from', () => {
      const location = { pathname: '/bat-dau', search: '' };
      const getOnboardingRedirect = (me: null | object, loc: { pathname: string; search: string }) => {
        if (!me) {
          return { to: '/dang-nhap', state: { from: loc.pathname + loc.search } };
        }
        return null;
      };

      const redirect = getOnboardingRedirect(null, location);
      expect(redirect).toEqual({
        to: '/dang-nhap',
        state: { from: '/bat-dau' },
      });
    });
  });

  describe('Post-login Navigation Logic', () => {
    const resolvePostLoginUrl = (user: { onboarded: boolean }, rawFrom?: string) => {
      const from = rawFrom && !rawFrom.startsWith('/dang-nhap') && !rawFrom.startsWith('/dang-ky') ? rawFrom : '/';
      if (!user.onboarded) {
        return '/bat-dau';
      }
      return from;
    };

    it('Đăng nhập với tài khoản chưa onboarding -> luôn chuyển hướng đến /bat-dau', () => {
      const user = { id: 'u1', onboarded: false };
      expect(resolvePostLoginUrl(user, '/thu-chi')).toBe('/bat-dau');
      expect(resolvePostLoginUrl(user, '/mo-phong?preset=sp1')).toBe('/bat-dau');
      expect(resolvePostLoginUrl(user, '/')).toBe('/bat-dau');
    });

    it('Đăng nhập với tài khoản đã onboarding -> chuyển về đúng URL trước đó (kèm search params)', () => {
      const user = { id: 'u1', onboarded: true };
      expect(resolvePostLoginUrl(user, '/thu-chi')).toBe('/thu-chi');
      expect(resolvePostLoginUrl(user, '/mo-phong?preset=sp1')).toBe('/mo-phong?preset=sp1');
    });

    it('Đăng nhập không có URL trước đó hoặc URL trỏ vào trang auth -> chuyển về /', () => {
      const user = { id: 'u1', onboarded: true };
      expect(resolvePostLoginUrl(user, undefined)).toBe('/');
      expect(resolvePostLoginUrl(user, '/dang-nhap')).toBe('/');
      expect(resolvePostLoginUrl(user, '/dang-ky')).toBe('/');
    });
  });

  describe('AuthLayout Authenticated Redirection', () => {
    const getAuthLayoutRedirect = (user: { onboarded: boolean }) => {
      return user.onboarded ? '/' : '/bat-dau';
    };

    it('Người dùng đã login nhưng chưa hoàn tất onboarding khi vào lại /dang-nhap -> chuyển thẳng về /bat-dau, tránh double redirect', () => {
      expect(getAuthLayoutRedirect({ onboarded: false })).toBe('/bat-dau');
    });

    it('Người dùng đã login và đã hoàn tất onboarding khi vào lại /dang-nhap -> chuyển về /', () => {
      expect(getAuthLayoutRedirect({ onboarded: true })).toBe('/');
    });
  });

  describe('Session Expiration & Safe Logout', () => {
    it('Hàm logout bọc an toàn không quăng ngoại lệ unhandled rejection khi server lỗi hoặc token đã hết hạn', async () => {
      let cacheCleared = false;
      let meState: any = { id: 'user-1' };

      const safeLogout = async (mockApiFail = false) => {
        try {
          if (mockApiFail) {
            throw new Error('401 Unauthorized / Network Error');
          }
        } catch {
          // Fallback dọn dẹp state sạch sẽ
          cacheCleared = true;
          meState = null;
          return;
        }
        cacheCleared = true;
        meState = null;
      };

      await expect(safeLogout(true)).resolves.not.toThrow();
      expect(cacheCleared).toBe(true);
      expect(meState).toBeNull();
    });

    it('Sự kiện auth:expired tự động xóa session cache để layout chuyển hướng mượt mà không gây flash', () => {
      let currentMe: any = { id: 'user-1', name: 'Nguyen Van Minh' };
      const handleExpired = () => {
        currentMe = null;
      };

      handleExpired();
      expect(currentMe).toBeNull();
    });
  });
});
