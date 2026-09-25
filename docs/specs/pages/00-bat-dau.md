# 00 · Bắt đầu — `/bat-dau`

Mã: `client/src/features/onboarding/OnboardingPage.tsx` · API: `POST /api/onboarding` · Layout: `OnboardingLayout`.

## Mục đích
Tài khoản mới **không có dữ liệu mẫu**. Màn này giúp người dùng nhập dữ liệu thật đầu tiên trong khoảng 2 phút
và thấy ngay AI phản ứng. Mọi bước đều có thể bỏ qua.

## Điều hướng
- Sau đăng ký → `/bat-dau`. `AppShell` chuyển mọi route về đây khi `me.onboarded === false`.
- `OnboardingLayout` đẩy người chưa đăng nhập về `/dang-nhap`, người đã hoàn tất về `/`.

## Các bước
| # | Nội dung | Ghi chú |
|---|---|---|
| 1 | Thu nhập, chi tiêu hằng tháng (`MoneyInput` + chip nhanh), số tháng dự phòng 3/6/12 | hiện "có thể để dành X/tháng" |
| 2 | Tài sản theo 5 loại (tiền mặt, quỹ, cổ phiếu, trái phiếu, vàng/khác), chỉ nhập số tiền | dòng 0đ không được gửi |
| 3 | Chọn mẫu mục tiêu (Mua nhà, Quỹ dự phòng, Học cho con, Nghỉ hưu) → số tiền, đã có, thời hạn, để dành/tháng | Quỹ dự phòng mặc định = chi tiêu × số tháng, đã có = tiền mặt bước 2 |
| — | Kết quả: điểm an tâm, nhãn, cảnh báo AI vừa mở; nút "Vào Tổng quan" / "Ghi khoản thu chi đầu tiên" | chưa có thu chi lẫn tài sản → không hiện điểm |

"Bỏ qua bước này" đánh dấu bước bị bỏ, không gửi dữ liệu của bước đó. Bước 3 bấm Hoàn tất / Bỏ qua đều gửi request.

## Sau khi gửi
Worker ghi nguyên khối (`db.batch`), đặt `users.onboarded_at`, gọi `afterChange` → nhật ký AI có dòng
"Hoàn tất hồ sơ đầu tiên". Client chỉ cập nhật `me` khi người dùng rời bước kết quả (`useOnboarding().finish`).
