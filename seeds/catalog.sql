-- Dữ liệu danh mục dùng chung cho mọi người dùng (idempotent): kịch bản mô phỏng, câu hỏi thói quen, bài học.
-- KHÔNG chứa dữ liệu cá nhân — tài khoản mới bắt đầu trống và tự nhập qua màn "Bắt đầu".

-- Kịch bản mô phỏng phổ biến (màn 03)
INSERT OR REPLACE INTO simulation_presets (id, slug, name, icon, params_json, order_idx) VALUES
('sp1', 'suy-thoai-nhe',   'Suy thoái nhẹ',   'trending-down', '{"marketDropPct":-10,"inflationPct":4,"incomePauseMonths":2,"interestRateDeltaPct":0,"surpriseCost":30000000}', 1),
('sp2', 'nam-kho-khan',    'Năm khó khăn',    'cloud-rain',    '{"marketDropPct":-20,"inflationPct":6,"incomePauseMonths":6,"interestRateDeltaPct":-1.5,"surpriseCost":120000000}', 2),
('sp3', 'mua-nha-som-hon', 'Mua nhà sớm hơn', 'home',          '{"marketDropPct":0,"inflationPct":4,"incomePauseMonths":0,"interestRateDeltaPct":0,"surpriseCost":0,"goalShiftMonths":-12}', 3),
('sp4', 'bien-dong-manh',  'Biến động mạnh',  'activity',      '{"marketDropPct":-35,"inflationPct":8,"incomePauseMonths":9,"interestRateDeltaPct":2,"surpriseCost":200000000}', 4);

-- Kịch bản kiểm tra thói quen (màn 05)
INSERT OR REPLACE INTO habit_scenarios (id, prompt, context, icon, options_json, order_idx) VALUES
('hs1', 'Khi danh mục giảm 10%', 'Thị trường đi xuống một chút.', 'trending-down',
 '[{"key":"hold","label":"Bạn giữ nguyên","risk":7},{"key":"reduce","label":"Bạn muốn giảm bớt rủi ro","risk":4},{"key":"sell","label":"Bạn bán hết","risk":1},{"key":"buy","label":"Bạn mua thêm","risk":9}]', 1),
('hs2', 'Khi giảm 20%', 'Thị trường giảm mạnh hơn.', 'bar-chart',
 '[{"key":"hold","label":"Bạn giữ nguyên","risk":7},{"key":"reduce","label":"Bạn muốn giảm bớt rủi ro","risk":4},{"key":"sell","label":"Bạn bán hết","risk":1},{"key":"buy","label":"Bạn mua thêm","risk":9}]', 2),
('hs3', 'Khi thu nhập gián đoạn', 'Bạn tạm thời mất nguồn thu nhập.', 'wallet',
 '[{"key":"cash","label":"Bạn ưu tiên tiền mặt","risk":3},{"key":"keep","label":"Bạn giữ nguyên danh mục","risk":6},{"key":"loan","label":"Bạn vay để giữ khoản đầu tư","risk":9}]', 3);

-- Bài học cộng đồng (màn 09)
INSERT OR REPLACE INTO lessons (id, slug, kind, title, excerpt, body_md, category, icon, read_time, is_featured, order_idx) VALUES
('l1', 'quy-du-phong-du-manh', 'lesson', 'Làm sao để có quỹ dự phòng đủ mạnh?',
 'Quỹ dự phòng giúp bạn vững vàng trước những rủi ro bất ngờ như mất việc, chi phí y tế hay biến động thu nhập. Bài học này hướng dẫn cách tính quỹ dự phòng phù hợp với từng giai đoạn cuộc sống, và cách bắt đầu ngay từ những khoản nhỏ.',
 '## Vì sao cần quỹ dự phòng?\nQuỹ dự phòng là lớp đệm đầu tiên...\n\n## Bao nhiêu là đủ?\nThông thường từ 6 đến 12 tháng chi tiêu thiết yếu...',
 'Cơ bản', 'piggy-bank', '5 phút', 1, 1),
('l2', 'dau-tu-dai-han-la-gi', 'lesson', 'Đầu tư dài hạn là gì?',
 'Hiểu cách đầu tư dài hạn giúp bạn xây dựng tài sản bền vững và vượt qua biến động ngắn hạn.', '', 'Kiến thức', 'sprout', '4 phút', 0, 2),
('l3', 'binh-tinh-khi-thi-truong-giam', 'lesson', 'Khi thị trường giảm, nên bình tĩnh thế nào?',
 'Học cách duy trì tâm lý vững vàng và đưa ra quyết định sáng suốt khi thị trường biến động.', '', 'Tâm lý đầu tư', 'trending-down', '6 phút', 0, 3),
('l4', 'mua-nha-chuan-bi-tien', 'lesson', 'Mua nhà: chuẩn bị tiền ra sao?',
 'Tìm hiểu các bước chuẩn bị tài chính, tính toán chi phí và lựa chọn phù hợp với khả năng của bạn.', '', 'Mục tiêu lớn', 'home', '7 phút', 0, 4),
('l5', 'tien-du-phong-bao-nhieu-la-du', 'lesson', 'Tiền dự phòng bao nhiêu là đủ?',
 'Biết cách xác định mức quỹ dự phòng phù hợp với thu nhập, chi tiêu và mục tiêu cuộc sống.', '', 'Quản lý vốn', 'shield-plus', '5 phút', 0, 5),
('l6', 'cau-chuyen-anh-nam', 'story', 'Anh Nam, 38 tuổi, đã giảm rủi ro danh mục và tăng khả năng mua nhà từ 61% lên 87% sau 6 tháng.',
 'Nhờ những bài học từ cộng đồng và công cụ của An Tâm AI, tôi hiểu rõ hơn về rủi ro, điều chỉnh danh mục phù hợp và có kế hoạch mua nhà rõ ràng hơn.', '', 'Câu chuyện', 'user', '3 phút', 0, 6),
('l7', 'khung-hoang-2008', 'history', 'Khủng hoảng 2008',
 'Học cách nhận biết rủi ro, đa dạng hóa danh mục và giữ tâm lý bình tĩnh.', '', 'Lịch sử', 'building', '6 phút', 0, 7),
('l8', 'lam-phat-cao', 'history', 'Giai đoạn lạm phát cao',
 'Hiểu cách lạm phát ảnh hưởng đến sức mua và học cách bảo vệ tài sản.', '', 'Lịch sử', 'coins', '5 phút', 0, 8),
('l9', 'thi-truong-giam-2020', 'history', 'Thị trường giảm mạnh 2020',
 'Học cách ứng phó với biến động lớn và tìm cơ hội trong khủng hoảng.', '', 'Lịch sử', 'virus', '5 phút', 0, 9);
