# Regression Test Bắt Buộc: Chunk Recovery Khi Deploy Phiên Bản Mới

## 1. Bối cảnh & Tình huống Kỹ thuật (Problem Statement)
Trong kiến trúc Single Page Application (React 19 + Vite + Cloudflare Workers Assets):
* Khi người dùng đang mở ứng dụng ở phiên bản cũ (v1), trình duyệt lưu trong bộ nhớ các chunk hash cũ (ví dụ: `LedgerPage-[oldhash].js`).
* Đội ngũ phát triển tiến hành deploy phiên bản mới (v2) lên Cloudflare Workers. Lúc này các file chunk trên CDN đã đổi sang hash mới (`LedgerPage-[newhash].js`).
* Người dùng tiếp tục tương tác trên giao diện và click sang một lazy-loaded route (ví dụ: click vào tab "Sổ thu chi" `/thu-chi`).
* Trình duyệt thực hiện dynamic import gọi file chunk `LedgerPage-[oldhash].js` trên máy chủ.

### Nguy cơ nghiêm trọng nếu không xử lý:
1. **Lỗi SPA Fallback (200 HTML thay vì 404):** Khi Cloudflare Worker Assets cấu hình `not_found_handling: "single-page-application"` mà không có bộ lọc đường dẫn, mọi request chunk không tồn tại sẽ bị CDN trả về file `index.html` với mã HTTP `200 OK`. Trình duyệt cố gắng thực thi mã HTML dưới dạng JavaScript module dẫn đến lỗi cú pháp nghiêm trọng `SyntaxError: Unexpected token '<'`.
2. **Vòng lặp Reload vô tận (Infinite Reload Loop):** Nếu cơ chế chunk recovery chỉ đơn thuần gọi `window.location.reload()` không có guard kiểm soát (như hàm bắt lỗi preload mặc định), khi có lỗi đứt mạng kéo dài hoặc lỗi CDN, trình duyệt sẽ tự reload liên tục hàng trăm lần/giây, làm treo tab và crash trình duyệt của người dùng.

---

## 2. Giải pháp Kiến trúc Triệt để (Architectural Solution)

### A. Phía Server (Cloudflare Worker & Wrangler Configuration)
1. **Kiểm soát Route ưu tiên (`wrangler.jsonc`):**
   ```jsonc
   "assets": {
     "directory": "./client/dist",
     "binding": "ASSETS",
     "not_found_handling": "single-page-application",
     // API và Assets do Worker xử lý, chặn SPA fallback nuốt nhầm assets không tồn tại
     "run_worker_first": ["/api/*", "/assets/*"]
   }
   ```
2. **Bộ lọc HTTP sạch sẽ cho Assets (`worker/index.ts`):**
   ```ts
   app.all('/assets/*', async (c) => {
     if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
       return c.text('Method Not Allowed', 405);
     }
     if (!c.env.ASSETS) return c.text('Not Found', 404);

     const res = await c.env.ASSETS.fetch(c.req.raw);
     const contentType = res.headers.get('content-type') || '';

     // Chặn triệt để: Nếu asset 404 hoặc bị SPA fallback trả về 200 text/html -> Buộc trả về 404 text/plain
     if (res.status === 404 || contentType.includes('text/html')) {
       return c.text('Not Found', 404, {
         'Content-Type': 'text/plain; charset=utf-8',
         'Cache-Control': 'no-cache, no-store, must-revalidate',
       });
     }
     return res;
   });
   ```
3. **Endpoint kiểm tra phiên bản máy chủ (`/api/version`):**
   Trả về JSON `200 OK` chứa version và buildTime độc lập với session đăng nhập.

---

### B. Phía Client (Chunk Recovery & Reload Guard)
Toàn bộ logic được đóng gói tại [`client/src/lib/chunkRecovery.ts`](file:///D:/07-Competitions-Hackathons/an-tam/client/src/lib/chunkRecovery.ts):
1. **Phân loại lỗi thông minh (`isChunkLoadError`):**
   - Chỉ bắt các lỗi nạp module động (`Failed to fetch dynamically imported module`, `Loading chunk`, `NetworkError`).
   - Tuyệt đối bỏ qua các lỗi runtime/logic component (`TypeError`, `ReferenceError`) để không reload nhầm.
2. **Phát hiện phiên bản máy chủ (`checkForNewVersion`):**
   - Truy vấn `/api/version?_t=timestamp` (hoặc fallback sang `/version.json`) kèm cache-busting để xác định phiên bản mới đã sẵn sàng.
3. **Bộ đệm Reload Guard chống vòng lặp (`triggerChunkReloadGuard`):**
   - Sử dụng `sessionStorage` gắn với từng route riêng biệt (`an_tam_chunk_reload_<route>`).
   - Thời gian giãn cách cooldown: **10 giây** (`RELOAD_COOLDOWN_MS = 10_000`).
   - Lỗi lần đầu: Cho phép `window.location.reload()` an toàn đúng 1 lần.
   - Lỗi lặp lại trong 10 giây: Chặn reload lập tức, ném lỗi ra `RouteErrorBoundary` để hiển thị UI fallback ("Phiên bản mới sẵn sàng" / nút "Thử lại"), bảo toàn tab người dùng.
4. **Tự động dọn dẹp (`clearChunkReloadGuard`):**
   - Khi lazy component nạp thành công, cờ reload trong `sessionStorage` lập tức được giải phóng.

---

## 3. Danh mục Kiểm thử Regression Test Bắt Buộc

File test chính thức: [`tests/chunk-recovery-regression.test.ts`](file:///D:/07-Competitions-Hackathons/an-tam/tests/chunk-recovery-regression.test.ts) (gồm 17 bài test độc lập):

| Nhóm kiểm thử | Mục tiêu xác minh | Trạng thái |
| :--- | :--- | :---: |
| **1. HTTP Response** | Request chunk cũ trả về HTTP 404 text/plain sạch sẽ, `no-store`, không HTML | PASS |
| **1. HTTP Response** | Chặn đứng kịch bản SPA fallback trả về 200 text/html cho file `.js` | PASS |
| **1. HTTP Response** | Request chunk mới hợp lệ trả về HTTP 200 application/javascript | PASS |
| **1. HTTP Response** | Request phương thức lạ (POST/PUT) trên `/assets/*` trả về 405 Method Not Allowed | PASS |
| **1. HTTP Response** | Endpoint `/api/version` luôn khả dụng công khai 200 JSON cho recovery | PASS |
| **2. Phân loại lỗi** | Nhận diện chính xác 6 biến thể lỗi dynamic import của trình duyệt & Vite | PASS |
| **2. Phân loại lỗi** | Từ chối kích hoạt recovery với `TypeError`, `SyntaxError`, `ReferenceError` | PASS |
| **3. Phiên bản mới** | `checkForNewVersion` phát hiện phiên bản khác nhau giữa client và server | PASS |
| **3. Phiên bản mới** | `checkForNewVersion` nhận diện phiên bản trùng khớp không có cập nhật | PASS |
| **3. Phiên bản mới** | Fallback mượt mà sang `version.json` tĩnh nếu `/api/version` gặp sự cố | PASS |
| **4. Reload Guard** | Cho phép reload đúng 1 lần và ghi nhận timestamp route vào `sessionStorage` | PASS |
| **4. Reload Guard** | Chặn đứng lần reload thứ 2 liên tiếp trong vòng 10 giây (chống infinite loop) | PASS |
| **4. Reload Guard** | Cách ly cờ reload độc lập giữa các route (`/thu-chi` vs `/danh-muc`) | PASS |
| **4. Reload Guard** | Tự động mở lại quyền reload sau khi hết 10 giây cooldown | PASS |
| **4. Reload Guard** | Dọn dẹp cờ reload khi nạp route thành công | PASS |
| **5. End-to-End** | **Kịch bản thành công:** Mở v1 -> Deploy v2 -> Click lazy route -> Reload 1 lần -> Render v2 | PASS |
| **5. End-to-End** | **Kịch bản lỗi mạng dai dẳng:** Không bị lặp vô tận, ném lỗi ra ErrorBoundary an toàn | PASS |

---

## 4. Hướng dẫn Chạy Kiểm tra (Verification Command)

Để chạy riêng bộ regression test này:
```bash
npm run test:chunk-recovery
```

Để chạy toàn bộ test suite dự án:
```bash
npm test
```

Để kiểm tra tính toàn vẹn kiểu dữ liệu TypeScript:
```bash
npm run typecheck
```
