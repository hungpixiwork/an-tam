# 05 · Kiểm tra thói quen (Habits)

## Mục đích
Giúp người dùng hiểu rõ mức rủi ro mà họ thực sự chấp nhận qua hành động, so sánh với tự đánh giá của bản thân, và nhận được insights từ AI về tính cách phản ứng tài chính.

## Route
`/kiem-tra-thoi-quen` (không có sub-route)

## Dữ liệu / API
**Hook:** `useHabits()` → `HabitsData`
- `scenarios`: Mảng các tình huống với prompt, context, icon, và các lựa chọn (option key, label, risk 0..10).
- `answers`: Record ánh xạ `scenarioId` → `optionKey` (lựa chọn đã chọn).
- `profile`: `HabitsProfile` chứa selfScore (0..10), actualScore (null hoặc 0..10), traits (3 hàng), insights (mảng), answered/total.

**Mutations:**
- `useAnswerHabit()`: POST `/habits/answers` với `{scenarioId, choice}` → cập nhật profile.
- `useSetSelfScore()`: PUT `/habits/self-score` với `{score}` → cập nhật profile.

## Bố cục & các khối
1. **PageHero**: Title "Bạn nghĩ mình chịu được rủi ro đến đâu?", highlight "Hành động của bạn mới cho câu trả lời thật.", scene WindingPath (42%).
2. **Hồ sơ phản ứng của bạn**: Pixel avatar (seed từ useMe), 3 IconTile traits (icon, tone, label, value pill).
3. **Tự đánh giá vs hành động thực tế**: 2 ScoreRing cạnh nhau (selfScore/10 xanh, actualScore/10 xanh dương hoặc "−"), mỗi có caption. Nút − / +, lưu nếu thay đổi.
4. **Bạn đã chọn gì**: 1 hàng/scenario: icon, prompt (bold), context (small), pill hoặc buttons chọn lựa. Modal/dropdown để thay đổi.
5. **AI nhận ra**: 3 dòng insights hoặc hint "Trả lời thêm…" (answered/total).
6. **Gợi ý thói quen**: 3 hàng tĩnh → /ke-hoach, /muc-tieu, /danh-muc.
7. **AI không làm gì**: Tone violet, badge "MUA BÁN" có gạch chéo đỏ, text giải thích.

**Grid XL:** [profile 1.15fr | self-vs-actual 1fr] / [choices 1.15fr | insights 1fr] / [tips 1.15fr | AI-not 1fr].

## Tương tác
- Nút − / + trên ScoreRing tự đánh giá; nút Lưu khi thay đổi.
- Click pill option → mở danh sách 4 buttons chọn lựa hoặc đóng; mutate khiến pill cập nhật.
- Link từ Tips card đẩy tới plan/goals/portfolio.

## Trạng thái
- **Loading:** PageSkeleton.
- **Error:** ErrorState với nút Thử lại (refetch).
- **Empty scenarios / no answers:** Cards vẫn render, AI insights show hint, option buttons visible.
- **Saving:** Nút disable, spinner nếu có.
