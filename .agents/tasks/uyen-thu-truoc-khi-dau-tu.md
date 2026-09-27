# Nghiên cứu: "Thử trước khi đầu tư" — nên tính và hiển thị thế nào cho hợp lý

**Giao cho:** Uyên (HoangHaUyen) · **Người nhận kết quả:** Hưng · **Hạn gợi ý:** 03/10/2026
**Loại việc:** nghiên cứu + đề xuất thiết kế (chưa cần code)

## Bối cảnh
Trang **Danh mục & rủi ro tập trung** (`/danh-muc`, mockup số 7) có khối **"Thử trước khi đầu tư"**: người dùng chọn loại tài sản, số tiền, thời gian nắm giữ → app cho biết trước/sau về **rủi ro tập trung**, **số tháng an toàn**, **tiến độ mục tiêu**.

Code hiện tại (`shared/engine/concentration.ts` → `whatIfAllocate`, `portfolioRisk`):
- Rủi ro tập trung theo ngành gộp **cả tài sản lẫn nghề nghiệp**: thu nhập được quy đổi thành "vốn nghề nghiệp" = 2 năm lương, tính vào ngành đang làm (`HC_INCOME_MULTIPLE = 2`).
- Tiền để đầu tư lấy từ tiền mặt nhàn rỗi trước, thiếu thì lấy từ quỹ dự phòng.
- Với nhân vật demo (làm ngành công nghệ, 112tr cổ phiếu công ty mình), thử bỏ 50tr vào "Quỹ ETF toàn cầu" chỉ làm rủi ro giảm **62 → 61**, trong khi mockup là **70 → 48**. Lý do: phần nghề nghiệp chiếm tỷ trọng quá lớn nên thêm 50tr gần như không đổi. Đúng toán nhưng khó thuyết phục khi demo.

## Câu hỏi cần trả lời
1. **Cách đo rủi ro tập trung** nào hợp lý cho người dùng cá nhân Việt Nam: chỉ tính tài sản, hay gộp nghề nghiệp? Nếu gộp thì quy đổi thu nhập thế nào (bao nhiêu năm lương, có chiết khấu không)? Có nguồn/tài liệu tham khảo nào (CFA, bài nghiên cứu về human capital & portfolio)?
2. **Quỹ ETF toàn cầu / ETF trong nước** nên được coi là phân tán theo ngành ra sao (tỷ trọng ngành thực tế của ví dụ VN30 ETF, ETF S&P 500, MSCI World…)? Người dùng VN mua được những loại nào?
3. **Nguồn tiền khi thử đầu tư**: có nên cho người dùng chọn lấy từ đâu (tiền mặt nhàn rỗi / tiền để dành hàng tháng / bán bớt cổ phiếu công ty) thay vì tự động lấy từ quỹ dự phòng?
4. **Kết quả nên hiển thị gì** để người không rành tài chính hiểu ngay: 3 con số trước/sau hiện tại có đủ không? Cần thêm câu giải thích nào? Mức "Thấp / Trung bình / Cao" nên đặt ngưỡng bao nhiêu?
5. **Danh mục đề xuất**: với mỗi nhóm thời hạn mục tiêu (dưới 2 năm, 2–5 năm, trên 5 năm) và mức chịu rủi ro, tỷ lệ tiền mặt / trái phiếu / quỹ / cổ phiếu hợp lý là bao nhiêu? (Code hiện có `recommendedRiskyShare`: ≤24 tháng 25%, ≤60 tháng 40%, ≤120 tháng 55%, còn lại 70%.)

## Ràng buộc bắt buộc
- **Không phá bố cục giao diện hiện tại.** Khối "Thử trước khi đầu tư" giữ nguyên vị trí và khung như mockup số 7 (form 3 ô + nút "Xem tác động" | 3 ô kết quả | hộp gợi ý AI). Đề xuất chỉ được thay đổi **cách tính, chữ, nhãn, ngưỡng** hoặc thêm tối đa 1 dòng giải thích — không thêm cột/khối mới.
- Chữ trên màn hình tiếng Việt đơn giản: không dùng "HHI", "human capital", "exposure", "runway".
- Mọi con số phải tính từ dữ liệu người dùng nhập (không gõ cứng).

## Kết quả mong đợi (1 file markdown, ≤2 trang)
Ghi vào `.agents/tasks/uyen-thu-truoc-khi-dau-tu-ket-qua.md`:
1. Công thức đề xuất (dễ hiểu, có ví dụ số với nhân vật anh Hưng: thu nhập 28,5tr/tháng, ngành công nghệ, đầu tư 320tr gồm cổ phiếu 144tr — trong đó 112tr cổ phiếu công ty, quỹ ETF 80tr, trái phiếu 48tr, tiền mặt 32tr, khác 16tr; quỹ dự phòng 84tr).
2. Kết quả dự kiến cho 2–3 kịch bản thử (vd 50tr vào ETF toàn cầu; 50tr vào cổ phiếu công nghệ; bán 50tr cổ phiếu công ty chuyển sang trái phiếu).
3. Bảng danh mục đề xuất theo thời hạn mục tiêu + mức chịu rủi ro.
4. Chữ hiển thị đề xuất cho 3 ô kết quả + hộp gợi ý AI.
5. Nguồn tham khảo.

Hưng sẽ chuyển kết quả thành code trong `shared/engine/concentration.ts` và module phân bổ mới (`shared/engine/allocation.ts`).
