---
name: dispatch-agents
description: Chia việc An Tâm AI cho nhiều subagent chạy song song trong worktree (mỗi agent 1 trang/1 tính năng) — vẽ phụ thuộc, cấp cổng/số migration, mẫu prompt ngắn, nhắn thêm khi đang chạy, và nhận báo cáo. Use khi có ≥2 việc độc lập (trang, tính năng) hoặc người dùng yêu cầu "chạy song song / dùng subagent".
---

# Giao việc song song cho subagent

Kinh nghiệm: tuần tự 1 trang ≈ 20–30 phút; song song 4–5 agent xong cả nhóm trong ~20 phút. Chi phí chính là merge (xem skill `integrate-branch`).

## 1. Vẽ phụ thuộc trước khi giao
Chỉ chạy song song các việc không cần dữ liệu/engine của nhau. Ví dụ đợt redesign:
- Đợt A (độc lập): Sổ thu chi, Quỹ an toàn, Tăng thu nhập, Lịch AI, Danh mục.
- Đợt B: Lựa chọn cuộc đời (cần Tăng thu nhập + Danh mục), AI Workspace + Nhật ký AI (cần Lịch AI/tích hợp).
Việc cần sửa file dùng chung (tokens, shell, router, tách i18n) → làm **trước**, 1 agent, rồi mới mở song song.

## 2. Cấp tài nguyên cho từng agent
| Thứ | Quy ước |
|---|---|
| Cổng | worker `8800+N`, vite `5200+N` (N = số trang/việc; thư mục chính giữ 8787/5173) |
| Trình duyệt | `agent-browser --session pN` |
| Migration | cấp sẵn số riêng cho từng agent (vd 0020, 0021, 0023) để không trùng |
| File sở hữu | ghi rõ; file dùng chung chỉ được *thêm* dòng (barrel index, seed `steps`) |

## 3. Mẫu prompt (ngắn — chi tiết nằm trong skill)
```
Build <việc> using the project skill <mockup-page | …> in parallel (worktree) mode, N=<n>
(worker 88<0n>, vite 52<0n>, agent-browser --session p<n>). cwd is a git worktree of
D:\07-Competitions-Hackathons\an-tam — FIRST `git merge --ff-only main`.
Read: .claude/skills/an-tam-conventions/SKILL.md, .claude/skills/<skill>/SKILL.md, <mockup/ảnh>, <mục pages.md>.
Page notes: <file hiện có cần sửa/gộp; route stub cần thay; bảng/engine đã có để dùng lại;
hành động người dùng nào phải chạy thật; seed cần thêm gì; số migration được cấp>.
Rules: real data, plain Vietnamese, minimal tests (<test cụ thể nếu cần>).
Commit on your worktree branch; stop your worker/vite at the end.
Report ≤200 words: branch + commit, blocks, new endpoints/tables, remaining diffs, what slowed you down.
```
- Luôn yêu cầu mục **"what slowed you down"** → dùng để sửa skill ngay sau mỗi agent.
- Dùng model mặc định cho việc code UI + backend; `haiku` chỉ cho việc dọn dẹp/di chuyển file.
- Việc cần giữ bố cục (thêm tính năng vào trang đã xong) → dùng skill `safe-feature`.

## 4. Khi agent đang chạy
- Phát hiện mẹo/lỗi chung → `SendMessage` cho **tất cả** agent đang chạy (ngắn, 3–4 dòng).
- Người dùng đổi yêu cầu (vd "tối đa 3 vòng") → nhắn ngay, đồng thời sửa skill.
- Không đọc file output của agent; chờ thông báo hoàn thành.

## 5. Khi agent xong
1. Merge theo skill `integrate-branch`.
2. Tự xem ảnh vòng cuối (Read) so với mockup — không tin báo cáo một chiều.
3. Đưa các điểm "slowed down" vào skill tương ứng rồi commit skill **trước** khi giao đợt tiếp.
4. Giao ngay việc vừa được mở khóa phụ thuộc.
