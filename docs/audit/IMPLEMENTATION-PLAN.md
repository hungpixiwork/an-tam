# 🛠️ KẾ HOẠCH TRIỂN KHAI PHẪU THUẬT SAU KIỂM TOÁN (IMPLEMENTATION PLAN)

Kế hoạch này được lập dựa trên kết quả đồng thuận từ 10 phân hệ kiểm toán chuyên sâu.  
**Nguyên tắc thực thi:** Không rewrite toàn app; sửa chữa theo từng **Vertical Slice** (Data -> Logic -> Persistence -> UI -> Reload -> Tests) hoàn chỉnh trước khi chuyển sang slice tiếp theo.

---

## 🚦 MA TRẬN PHÂN LOẠI ĐỘ ƯU TIÊN (PRIORITY MATRIX)

- **P0 — BẮT BUỘC (Blockers cho người dùng thật):** Sửa lỗi tính điểm ảo, bảo mật namespace lưu trữ, chia cho 0, chặn multi-click.
- **P1 — TRƯỚC PUBLIC BETA:** Bổ sung IndexedDB fallback, dọn dẹp route alias cũ, hoàn thiện Empty States.
- **P2 — SAU BETA:** Multi-tab broadcast channel sync, Web Push Notifications.
- **P3 — TƯƠNG LAI:** Cloud sync mã hóa đầu-cuối (E2EE), Plugin marketplace.

---

## 🧱 10 VERTICAL SLICES TRIỂN KHAI CHI TIẾT

###  slice 1: Vá Điểm An Tâm Ảo Khi 0-Dữ Liệu (P0)
- **Files liên quan:** `shared/engine/peace.ts`, `client/src/features/overview/KpiRow.tsx`, `client/src/components/layout/Topbar.tsx`
- **Hiện trạng:** Khi profile mới tạo không có mục tiêu và tài sản, `peace.ts` tự gán 50% probability và optimal risk share làm điểm tính ra 35/100 ("Cần hành động").
- **Vấn đề:** Bịa số liệu cho người dùng mới, vi phạm nguyên tắc Zero Fake Data.
- **Expected Behavior:** Khi `goals.length === 0` và `totalAssets === 0`, trả về `{ score: null, calibrated: false, label: 'Chưa hiệu chuẩn' }`.
- **Implementation:**
  ```typescript
  if (goals.length === 0 && holdings.length === 0 && monthlyIncome === 0) {
    return { peaceScore: 0, calibrated: false, message: 'Cần bổ sung thông tin thu chi để tính Điểm An Tâm' };
  }
  ```
- **Acceptance Criteria:** Tài khoản mới tinh hiển thị "Chưa hiệu chuẩn" kèm nút CTA "+ Thêm thu nhập", không hiện 35/100.
- **Tests:** Thêm test case vào `tests/peace-score.test.ts`.

---

### slice 2: Chuẩn Hóa Namespace Lưu Trữ Đa Người Dùng (P0)
- **Files liên quan:** `client/src/lib/storage/ledgerStorage.ts`, `client/src/lib/storage/userStorage.ts`, `client/src/app/auth.tsx`
- **Hiện trạng:** `LEDGER_STORAGE_KEY` dùng hằng số cố định `antam.ledger.transactions.v1` không gắn với `userId`.
- **Vấn đề:** User A đăng xuất, User B đăng nhập trên cùng browser sẽ thấy giao dịch của User A.
- **Expected Behavior:** Mọi key lưu trữ phải có định dạng `antam:v1:user:{userId}:{module}`.
- **Implementation:**
  ```typescript
  export function getLedgerStorageKey(userId: string): string {
    return `antam:v1:user:${userId}:ledger.transactions`;
  }
  ```
  Trong `auth.tsx`, khi gọi `logout()`, thực hiện `queryClient.clear()` và xóa token phiên, giữ nguyên data local của user trong key namespace.
- **Acceptance Criteria:** Chuyển đổi giữa 2 account trên cùng trình duyệt không bị rò rỉ hay ghi đè dữ liệu của nhau.
- **Tests:** Viết unit test giả lập multi-user isolation trong `tests/user-isolation.test.ts`.

---

### slice 3: Phòng Chống Chia Cho 0 & NaN Trong Mô Phỏng (P0)
- **Files liên quan:** `client/src/features/simulation/SimulationResultPage.tsx`, `client/src/features/simulation/tinh-toan.ts`
- **Hiện trạng:** Phép tính tỷ lệ thay đổi tài sản `(after.netWorth - before.netWorth) / before.netWorth` sinh ra `NaN%` khi `before.netWorth === 0`.
- **Vấn đề:** Lỗi giao diện hiển thị `NaN%`.
- **Implementation:**
  ```typescript
  const changePercent = before.netWorth > 0 
    ? Math.round(((after.netWorth - before.netWorth) / before.netWorth) * 100) 
    : 0;
  ```
- **Acceptance Criteria:** Khi `netWorth = 0`, hiển thị `+0%` hoặc giá trị số tiền thay đổi tuyệt đối thay vì `NaN%`.
- **Tests:** Thêm test case cho `calculateSimulationImpact(0, 50_000_000)`.

---

### slice 4: Chặn Multi-Click & Thêm Idempotency Key Cho AI Apply (P0)
- **Files liên quan:** `client/src/features/overview/SuggestionsCard.tsx`, `client/src/components/actions/DecisionStrip.tsx`, `worker/routes/actions.ts`
- **Hiện trạng:** Nút "Áp dụng" chưa disable trạng thái `isSubmitting` trong 300ms đầu.
- **Vấn đề:** Người dùng click nhanh nhiều lần có thể kích hoạt nhiều batch mutation trùng lặp.
- **Implementation:**
  - Thêm `disabled={isPending}` và visual spinner vào nút Áp dụng.
  - Gắn header `Idempotency-Key: crypto.randomUUID()` vào mỗi request gửi lên Worker API.
- **Acceptance Criteria:** Double click chỉ gửi đúng 1 request duy nhất.
- **Tests:** Test concurrent requests trong `tests/action-idempotency.test.ts`.

---

### slice 5: Dọn Dẹp Route Alias Cũ (P1)
- **Files liên quan:** `client/src/features/simulation/SimulationResultPage.tsx:161`, `client/src/features/portfolio/HabitsTab.tsx:245-246`
- **Hiện trạng:** Gọi link `/ke-hoach` và `/muc-tieu` (phải redirect sang `/quy-an-toan`).
- **Implementation:** Thay thế trực tiếp thành `<Link to="/quy-an-toan">`.
- **Acceptance Criteria:** Không còn link nội bộ nào kích hoạt redirect handler.

---

### slice 6: Gắn Empty State Hoàn Chỉnh Cho Holdings & Workspace (P1)
- **Files liên quan:** `client/src/features/portfolio/HoldingsCard.tsx`, `client/src/features/workspace/WorkspacePage.tsx`
- **Hiện trạng:** Khi `holdings = []` hoặc `run = null`, component render khung trống.
- **Implementation:**
  - `HoldingsCard`: Hiển thị `<EmptyState icon={PieChart} title="Chưa có tài sản nào" description="Thêm cổ phiếu, tiền gửi hoặc bất động sản để theo dõi rủi ro tập trung." actionLabel="+ Thêm tài sản" onAction={openAddModal} />`.
  - `WorkspacePage`: Hiển thị thẻ hướng dẫn kích hoạt Agent khi chưa có run nào.
- **Acceptance Criteria:** 100% màn hình hiển thị Empty State lịch sự, rõ ràng, có CTA 1-chạm.

---

### slice 7: Minimum Onboarding 4 Hạt Nhân (P1)
- **Files liên quan:** `client/src/features/onboarding/OnboardingPage.tsx`
- **Hiện trạng:** Có 3 bước và 4 persona.
- **Tối ưu:** Giữ nguyên 3 bước ngắn gọn, tối ưu các chip tiền nhanh (10tr, 20tr, 30tr) để người dùng hoàn tất trong 15 giây và có thể "Bỏ qua" bất kỳ lúc nào để vào thẳng ứng dụng.
- **Acceptance Criteria:** Time-to-value < 15 giây.

---

### slice 8: Phân Tầng IndexedDB Khi Dung Lượng > 1MB (P1/P2)
- **Files liên quan:** `client/src/lib/storage/index.ts`, `client/src/lib/storage/indexedDbAdapter.ts`
- **Thiết kế:** Tạo adapter `IndexedDbAdapter` cho store `ledger_transactions` và `ai_events`.
- **Ngưỡng kích hoạt:** Khi `localStorage` của user vượt 1MB (~4.000 giao dịch), tự động di chuyển lịch sử cũ vào IndexedDB `antam_indexed_db_v1`.

---

### slice 9: Đồng Bộ Đa Tab Bằng BroadcastChannel (P2)
- **Files liên quan:** `client/src/lib/storage/syncBus.ts`
- **Thiết kế:** `const channel = new BroadcastChannel('antam_sync_bus');`
- Khi Tab A thêm giao dịch, phát tin nhắn `channel.postMessage({ type: 'TX_CREATED' })` -> Tab B tự động invalidate TanStack Query và cập nhật UI tức thì mà không cần F5.

---

### slice 10: Backup & Export JSON v1 Chuẩn Hóa (P1)
- **Files liên quan:** `client/src/features/settings/LocalStorageCard.tsx`, `client/src/lib/storage/backup.ts`
- **Thiết kế:**
  - Nút "Xuất dữ liệu": Tạo file `antam-backup-{userId}-{date}.json` chứa toàn bộ profile, ledger, goals, holdings kèm SHA-256 checksum.
  - Nút "Khôi phục dữ liệu": Kiểm tra Zod schema trước khi ghi đè, hiển thị modal xem trước số lượng bản ghi sẽ phục hồi.
  - Nút "Xóa toàn bộ": Yêu cầu gõ chữ "XÓA" để xác nhận.

---

## 🧪 QUY TRÌNH VERIFICATION & ACCEPTANCE TEST

### Acceptance Test Kịch Bản Vàng (Golden Path Test):
```text
1. Mở trình duyệt ẩn danh (0 byte storage).
2. Đăng ký tài khoản mới "Nguyễn Văn A".
3. Hoàn thành Onboarding 15s (Thu nhập: 25tr, Chi phí: 12tr, Tiền mặt: 50tr).
4. Màn hình Tổng quan: Điểm An Tâm tính đúng theo số vừa nhập (không bị 35/100 giả).
5. Vào Sổ thu chi: Thêm 1 khoản chi tiêu 50.000 đ ăn sáng -> Số dư tiền mặt giảm đúng 50.000 đ.
6. F5 tải lại trang: Dữ liệu vẫn giữ nguyên 100%.
7. Đăng xuất -> Đăng nhập tài khoản "Trần Thị B".
8. Kiểm tra Sổ thu chi của B: Hoàn toàn trống, không thấy bất kỳ giao dịch nào của A.
9. Đăng xuất B -> Đăng nhập lại A: Toàn bộ giao dịch của A xuất hiện trở lại đầy đủ.
10. Vào Cài đặt -> Xuất dữ liệu JSON -> Xóa toàn bộ dữ liệu -> Nhập lại file JSON -> Mọi số liệu được phục hồi 100%.
```
