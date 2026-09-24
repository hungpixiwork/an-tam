# An Tâm AI — Bộ đặc tả (Specs)

> "Hiểu tiền của bạn. Chuẩn bị cho tương lai."

Bộ tài liệu này là nguồn chuẩn (SSOT) cho toàn bộ sản phẩm: kiến trúc, dữ liệu, API, engine "AI" rule-based,
hệ thống minh họa pixel art và đặc tả 10 màn hình theo mockup.

## Mục lục
| Tài liệu | Nội dung |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Kiến trúc tổng thể, cấu trúc thư mục, luồng dev / build / deploy |
| [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) | Token màu, chữ, khoảng cách, component UI, định dạng tiền VN |
| [PIXEL-ART.md](PIXEL-ART.md) | Engine sprite, palette, danh sách scene, animation |
| [DATABASE.md](DATABASE.md) | Schema D1, quan hệ, migration, dữ liệu demo |
| [API.md](API.md) | Toàn bộ endpoint, request / response, mã lỗi |
| [ENGINE.md](ENGINE.md) | Công thức điểm an tâm, xác suất mục tiêu, mô phỏng, cảnh báo, gợi ý |
| [AUTH.md](AUTH.md) | Đăng ký, đăng nhập, session, bảo mật |
| [pages/](pages/) | Đặc tả từng màn hình (01 → 10) |

## Phạm vi & quyết định sản phẩm
- **AI = rule-based, tất định.** Mọi con số và câu gợi ý đều sinh từ engine trong `shared/engine`. Không gọi LLM.
  Interface `Narrator` được chừa sẵn để sau này có thể cắm Cloudflare Workers AI viết lại câu chữ (không đổi số liệu).
- **Minh họa = pixel art 2D tự code** (SVG + gradient CSS). Không dùng ảnh raster, không cắt từ mockup.
- **Đăng nhập thật** bằng email + mật khẩu, session cookie HttpOnly.
- Giao diện tiếng Việt, tiền tệ VND.
- AI **không bao giờ** mua/bán thay người dùng, không quảng cáo, không bán dữ liệu (xem màn 8, 10).

## Danh sách màn hình
| # | Màn | Route | Mockup |
|---|---|---|---|
| 01 | Tổng quan tài chính | `/` | ảnh (1) |
| 02 | Mục tiêu cuộc sống | `/muc-tieu` | ảnh (2) |
| 03 | Mô phỏng tương lai | `/mo-phong` | ảnh (3) |
| 04 | Kết quả mô phỏng | `/mo-phong/ket-qua/:runId` | ảnh (4) |
| 05 | Kiểm tra thói quen | `/thoi-quen` | ảnh (5) |
| 06 | Danh mục đầu tư | `/danh-muc` | ảnh (6) |
| 07 | Kế hoạch an toàn | `/ke-hoach` | ảnh (7) |
| 08 | AI theo dõi | `/ai-theo-doi` | ảnh (8) |
| 09 | Bài học cộng đồng | `/cong-dong` | ảnh (9) |
| 10 | Cài đặt & quyền riêng tư | `/cai-dat` | ảnh (10) |

## Lộ trình
| Milestone | Nội dung | Trạng thái |
|---|---|---|
| M0 | Bộ specs này | ✅ |
| M1 | Nền móng: deps, `shared/`, router, AppShell, design tokens | ✅ |
| M2 | Engine pixel art + scene cho màn 01 | ✅ |
| M3 | DB migration + seed + Auth | ✅ |
| M4 | Engine rule-based + `GET /api/overview` | ✅ |
| M5 | Màn 01 Tổng quan hoàn chỉnh | ✅ |
| M6 | Màn 02 Mục tiêu | ✅ |
| M7 | Màn 03 + 04 Mô phỏng | ✅ |
| M8 | Màn 06 Danh mục | ✅ |
| M9 | Màn 07 Kế hoạch an toàn | ✅ |
| M10 | Màn 08 AI theo dõi + Cron | ✅ (Cron đã cấu hình, chưa chạy thử trên production) |
| M11 | Màn 05 Thói quen | ✅ |
| M12 | Màn 09 Cộng đồng | ✅ |
| M13 | Màn 10 Cài đặt (export / xóa dữ liệu) | ✅ |
| M14 | Responsive polish, a11y, deploy production | 🟡 responsive đã kiểm tra 4 kích thước; chưa deploy |
