# Xác thực & bảo mật

## Luồng
1. **Đăng ký** `POST /api/auth/register` → kiểm tra email trùng → băm mật khẩu → tạo `users`, `user_settings`,
   `financial_profiles` **rỗng** → tạo session → trả `Me` (`onboarded: false`) + cookie. Không nạp dữ liệu mẫu.
   Client chuyển tới `/bat-dau`; `POST /api/onboarding` ghi dữ liệu đầu tiên (hoặc bỏ qua) và đặt `onboarded_at`.
2. **Đăng nhập** `POST /api/auth/login` → so khớp mật khẩu (thời gian hằng) → tạo session.
3. **Mọi `/api/*` khác** đi qua `requireAuth`: đọc cookie → SHA-256 → tra `sessions` chưa hết hạn → `c.set('userId')`.
4. **Đổi mật khẩu** `POST /api/me/password` → kiểm tra mật khẩu hiện tại → băm lại → xóa mọi session khác (giữ phiên hiện tại).
5. **Đăng xuất** xóa row session + xóa cookie. **Xóa tài khoản** (`DELETE /api/me`) xóa user, cascade toàn bộ dữ liệu.

## Mật khẩu (`worker/lib/password.ts`)
- PBKDF2-SHA256, **100 000 vòng** (giới hạn của Workers WebCrypto), salt ngẫu nhiên 16 byte, khóa 256 bit, lưu base64.
- So sánh thời gian hằng. Khi email không tồn tại vẫn chạy PBKDF2 để không lộ email qua thời gian phản hồi.
- Mật khẩu 8–128 ký tự.

## Session (`worker/lib/session.ts`)
- Token 32 byte ngẫu nhiên (hex) trong cookie `at_session`: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` khi HTTPS, hết hạn 30 ngày.
- DB chỉ lưu SHA-256 của token → lộ DB không dùng lại được session.
- Cron hằng ngày xóa session hết hạn.

## Phía client
- `AuthProvider` (`client/src/app/auth.tsx`) giữ `me` bằng TanStack Query (`/auth/me`, 401 → `null`).
- `AppShell` chặn route khi chưa đăng nhập → `/dang-nhap` (nhớ trang cũ để quay lại); đã đăng nhập nhưng `onboarded = false` → `/bat-dau`. `AuthLayout` đẩy người đã đăng nhập về `/`. `OnboardingLayout` chỉ mở cho tài khoản chưa hoàn tất.
- Đăng nhập / đăng ký / đăng xuất đều `queryClient.clear()` để không lẫn dữ liệu giữa tài khoản.

## Khác
- Cùng origin → không bật CORS.
- Mọi truy vấn dữ liệu cá nhân lọc theo `userId` của session; id tài nguyên từ URL luôn kèm điều kiện `AND user_id = ?`.
- Việc cần làm trước production: rate-limit `/auth/login` (Cloudflare Rate Limiting rule hoặc Durable Object), xác minh email, quên mật khẩu.
