# Trang 9 — Nhật ký AI, kiểm toán & quyền riêng tư `/nhat-ky-ai`

## Lưới (1672px)
- H1: `AuditHero` 12 cột — tiêu đề trái, hộp "Dữ liệu của bạn luôn an toàn" nổi trên ảnh phải.
- H2: `AuditLogCard` ~8 cột (3 bộ lọc + bảng 6 cột + ⋯, "Xem thêm", dấu "Nhật ký toàn vẹn") | `PrivacyCard` ~4 cột `#privacy` (3 hộp; Xuất / Xóa dữ liệu).
- H3: `IntegrationsCard` `#integrations` (Google Calendar, Gmail, Sheets, Ngân hàng SePay, Notion) | `SystemStatusCard`.

## Luồng dữ liệu
| Khối | Hook | Endpoint | Nguồn |
|---|---|---|---|
| Nhật ký | `useAuditLog` (infinite) | `GET /api/audit?agent&status&from&cursor&limit` | `audit_log` (0008, append-only, rowid cursor) |
| Toàn vẹn | `useAuditVerify` | `GET /api/audit/verify` | `verifyAuditChain` (worker/lib/audit.ts) |
| Quyền riêng tư | `downloadMyData`, `useDeleteAccount` | `GET /api/me/export`, `DELETE /api/me` | ghi audit `privacy.export` |
| Tích hợp | `useIntegrations`, `useLinkBank`, `useVerifyBank`, `useUnlinkBank` | `GET /api/integrations`, `POST /api/integrations/sepay/{link,verify}`, `DELETE /api/integrations/sepay` | `integrations`, `bank_accounts` (+0023 hash/verified_at/last_event_at), `bank_webhook_events` |
| Hệ thống | `useHealth` + 2 hook trên | `GET /api/health` | D1 ping, lastSyncedAt, chuỗi hash |

Webhook công khai `POST /api/webhooks/sepay`: `Authorization: Apikey <SEPAY_WEBHOOK_KEY>` (timing-safe) → zod → chống trùng `referenceCode` → khớp `account_hash` → `transactions` (source `sepay`, `external_id`) + danh mục tự đoán + audit `bank.transaction` + `afterChange`.

Ghi audit (actor `user`, tóm tắt đã che số) ở: giao dịch / tài sản / mục tiêu (thêm-sửa-xóa), ngân sách, liên kết/xác thực ngân hàng, xuất dữ liệu.

## Hành động → khối đổi
- Đổi bộ lọc → bảng tải lại. Bấm "Xác thực" (khi đã nhận giao dịch) → dòng ngân hàng "Đã kết nối" + dòng nhật ký "Đã phê duyệt" mới.
- Thêm giao dịch ở Sổ thu chi → dòng "Tài chính cá nhân" mới trong nhật ký.
- Xóa dữ liệu: gõ đúng email → xóa tài khoản → về /dang-nhap.

## Vòng đối chiếu
- r1: bộ lọc rơi xuống dòng + chữ cụt; tên tác nhân / mô tả tích hợp bị cắt; cột phải "Tình trạng hệ thống" tràn.
- r2: khớp bố cục. Còn lại: không có số % uptime (không có dữ liệu thật → hiện phiên bản / thời điểm kiểm tra); thêm hàng Notion.
