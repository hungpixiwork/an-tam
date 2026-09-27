---
name: integrate-branch
description: Merge nhánh worktree của subagent vào main An Tâm AI — giải các xung đột hay gặp theo công thức sẵn, kiểm tra typecheck/test/build, migrate + seed lại, smoke test, commit. Use ngay khi một subagent worktree báo xong.
---

# Merge nhánh subagent vào main

## 1. Merge
```bash
git merge --no-edit <worktree-branch> 2>&1 | grep -E "CONFLICT|Merge made"
git diff --name-only --diff-filter=U        # danh sách file xung đột
```
Xem nhanh các khúc xung đột: `awk '/^<<<<<<< /,/^>>>>>>> /' <file>`.

## 2. Công thức giải xung đột hay gặp
Giải bằng Python (regex `<<<<<<< HEAD\n(.*?)=======\n(.*?)>>>>>>> [^\n]+\n`, flags `re.S`) — nhanh và không lỗi tay.

| File | Nguyên nhân | Cách giải |
|---|---|---|
| `client/src/lib/queries/index.ts`, `shared/engine/index.ts`, `shared/types/api/index.ts` | 2 bên cùng thêm `export *` | giữ **cả hai** (HEAD + theirs) |
| `client/src/lib/queries/keys.ts` (`FINANCE_KEYS`) | 2 bên thêm key | **hợp** 2 danh sách |
| `scripts/seed-demo.mjs` — thân hàm | 2 bên thêm hàm mới cùng chỗ | giữ cả hai; kiểm tra dấu `}` đóng hàm giữa 2 khối (thường cần `a + "}\n\n" + b`) |
| `scripts/seed-demo.mjs` — mảng `steps` | 2 bên thêm bước | hợp, giữ thứ tự: tài khoản → hồ sơ → tài sản → mục tiêu → sổ thu chi → … → phần có webhook/nhật ký cuối |
| `scripts/seed-demo.mjs` — cùng 1 dòng dữ liệu | 2 bên sửa 1 object | ghép trường của cả hai (vd note của HEAD + category của theirs) |
| `.agents/pages/README.md` | mỗi bên đánh ✅ dòng của mình | lấy dòng ✅ của từng bên |
| Route/SQL cùng chỗ (vd `worker/routes/earn.ts`) | 2 bên thêm cột | ghép cả cột lẫn tham số `.bind()` — đếm lại số `?` khớp số tham số |
| `categoryIcons.ts` / import | 2 bên thêm import | hợp danh sách import |

Sau khi giải: `grep -rn "<<<<<<<\|>>>>>>>" client/src shared worker tests scripts` phải rỗng.

## 3. Kiểm tra (bắt buộc trước commit)
```bash
git add <các file đã giải>
npm run typecheck && npm test && npm run build
git commit -q -m "merge: <tên trang/việc>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

## 4. Dữ liệu & chạy thử
```bash
npm run db:migrate
node scripts/seed-demo.mjs        # so dòng tóm tắt với kỳ vọng (skill dev-env)
node scripts/dev/smoke.mjs        # mọi route ✓
```
- Seed đổi số (điểm tụt, tổng thu/chi lệch) → tìm nguyên nhân trong phần seed vừa merge; sửa đầu vào hoặc bù, **không** đổi engine để ép số.
- Merge có thêm secret mới (`.dev.vars` trong worktree) → copy sang thư mục chính rồi khởi động lại worker (skill `dev-env` §2).

## 5. Sau merge
- Tự `Read` ảnh vòng cuối của agent so với mockup.
- Ghi các điểm "slowed down" vào skill liên quan, commit skill.
- Báo người dùng: đã merge gì, test bao nhiêu, số liệu nào khác mockup và vì sao, việc tiếp theo.
