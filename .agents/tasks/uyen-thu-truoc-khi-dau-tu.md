# Uyên: engine đầu tư và mô phỏng "Thử trước khi đầu tư"

**Giao cho:** Uyên (`HoangHaUyen`) · **Người tích hợp:** Hưng · **Issue:** [#1](https://github.com/hungpixi/an-tam/issues/1), triển khai ở [#5](https://github.com/hungpixi/an-tam/issues/5)

## Mục tiêu

Uyên chịu trách nhiệm **thiết kế mô hình tài chính, trực tiếp làm engine và test** cho quyết định đầu tư và mô phỏng trước/sau. Người dùng cần hiểu tiền lấy từ đâu, công việc và tài sản có cùng chịu một rủi ro không, quỹ an toàn và mục tiêu đổi thế nào, và **vì sao** một phương án tốt hoặc xấu hơn. Mockup số 7 và ba ô kết quả hiện tại chỉ là ví dụ tham khảo, không phải công thức hay bố cục bắt buộc.

## Phạm vi engine

- Tự chọn cách mô phỏng nào tạo ra insight rõ nhất: so sánh trước–sau, hai lựa chọn, kịch bản xấu, nguồn tiền khác nhau hoặc cách khác có giá trị hơn. Có thể đề xuất đổi chỉ số và output contract khi có lý do nghiệp vụ; Hưng tích hợp API và `client` sau.
- Chọn công thức rủi ro tập trung và phân bổ dựa trên dữ liệu, giải thích được bằng phép tính mẫu. Kiểm tra tác động từ nghề nghiệp, cổ phiếu công ty đang làm, ETF và tài sản khác; không cần giữ hệ số hai năm lương hay ngưỡng hiện tại nếu không có căn cứ.
- Chọn cách xử lý nguồn tiền đầu tư. Không tự âm thầm dùng quỹ dự phòng hoặc tự coi phần tiền thiếu là tiền mới. Mô phỏng bảo toàn tiền khi chuyển tài sản, không cộng trùng tiền đầu tư vào tiến độ mục tiêu; cho thấy đánh đổi về số tháng an toàn và thời điểm mục tiêu.
- Kiểm chứng giả định lợi nhuận/biến động và kịch bản xấu với `shared/engine/portfolio.ts`, `simulate.ts`; kết quả phải là ước tính có nguồn, không là lời hứa. Dữ liệu thiếu phải cho kết quả chưa đủ căn cứ, không tạo ra sự chính xác giả.
- Đề xuất một câu kết luận và một bước tiếp theo cụ thể, gắn với dữ liệu đã nhập; Hưng triển khai phần chữ và tương tác UI.

## Cách chứng minh tính năng đáng dùng

Dùng hồ sơ mẫu giả trong issue #1 hoặc tự tạo hồ sơ mẫu phù hợp. Cho ít nhất hai quyết định có kết quả khác nhau và một trường hợp thiếu dữ liệu. Với mỗi quyết định, ghi **input → phép tính → kết quả → insight người dùng nhìn thấy → hành động tiếp theo**; ghi nguồn và ngày tham khảo cho dữ liệu ngoài, đánh dấu giả định là “ước tính”. Chỉ số thay đổi phải có lý do thực, không chỉnh để trùng số trên mockup. Nếu kết quả không đủ khác biệt hoặc không dẫn tới quyết định rõ hơn, Uyên được đề xuất thay cách so sánh hoặc metric.

## Bàn giao

Uyên đăng mô hình, phép tính mẫu và nguồn vào #1, rồi **triển khai engine và test trong #5** trên branch riêng; không cần chờ UI ổn định để bắt đầu phần này. Hưng review code, xử lý API/DB/UI và merge khi luồng UI sẵn sàng. Không đưa hồ sơ tài chính thật lên GitHub.
