# Bốn tính năng đột phá (B1–B4)

> File này mô tả chi tiết 4 tính năng tạo khác biệt cho An Tâm: vấn đề, cách làm, người dùng thấy gì, API, test. Dev đọc để code; người pitch đọc để trả lời giám khảo.
> Tất cả đều 📐 (đã chốt, chưa code). Tổng quan sản phẩm: [ba.md](ba.md).

## Vì sao cần 4 tính năng này

Soi code ngày 27/09: bậc 1–2 (dòng tiền, an toàn) đã vững nhưng app nào cũng có. Bậc 3–5 mới là nơi tạo khác biệt, và đang yếu:

| Bậc | Đang có | Thiếu |
|:-:|---|---|
| 3. Năng lực kiếm tiền | `incomeGrowthPlan` trong `shared/engine/earn.ts` chỉ in gợi ý mẫu theo số giờ | Chưa tính giá trị vốn con người, chưa đo rủi ro nghề |
| 4. Tích lũy | `portfolioAnalysis` phân bổ theo lớp tài sản; `habitsProfile` đo phản ứng khi thua lỗ | Chưa đối chiếu với nghề; bài test tâm lý không được dùng ở đâu |
| 5. Tự do lựa chọn | Chỉ có loại mục tiêu `retirement` và trang bài học | Không có con số nào đo "tự do" |

Cả 4 tính năng **dùng lại engine sẵn có** (`applyShock`, `goalProbability`, `habitsProfile`, `afterChange`), không dựng hệ mới.

---

## B1. Lựa chọn cuộc đời (Life Options) — bậc 5

**Vấn đề.** "Tự do tài chính" hiện chỉ là khẩu hiệu. Người dùng không biết một quyết định lớn có làm mình kiệt quệ không.

**Cách làm.** Mỗi lựa chọn được chuyển thành một bộ tham số mô phỏng và chạy qua engine có sẵn:

| Mã | Lựa chọn | Mặc định (ƯỚC TÍNH, người dùng sửa được) |
|---|---|---|
| `study` | Nghỉ việc đi học | 12–24 tháng không lương; học phí; sau khi học thu nhập tăng theo nhóm nghề |
| `care` | Nghỉ chăm con / cha mẹ | 6 tháng; thu nhập còn 0–30%; chi phí chăm sóc tăng |
| `startup` | Khởi nghiệp | 12 tháng không lương; vốn góp ban đầu |
| `switch` | Đổi sang nghề lương thấp hơn nhưng ổn định hơn | Thu nhập −20%; rủi ro nghề giảm |
| `sabbatical` | Nghỉ dài hạn | 3–12 tháng không lương |

```text
Lựa chọn → tham số mô phỏng → applyShock()     (shared/engine/simulate.ts ✅)
                            → goalProbability() (shared/engine/goals.ts ✅)
                            → Runway mới        (ba.md §5.1)
                            → Vốn con người     (B2)
                            → Kết luận + điều kiện để kham nổi
```

Kết luận có 3 mức:
- **Kham nổi:** số tháng trụ được ≥ thời gian lựa chọn + 3 tháng, và không mục tiêu ưu tiên 1 nào tụt dưới 50% khả năng đạt.
- **Kham nổi có điều kiện:** engine tìm được **một** điều kiện đủ — để dành thêm X/tháng trong N tháng, hoặc lùi thời điểm M tháng, hoặc giảm chi tiêu thiết yếu Y%. Tìm bằng tìm kiếm nhị phân, không dùng LLM.
- **Chưa kham nổi:** không điều kiện đơn lẻ nào đủ; hiện khoảng còn thiếu.

Hai con số cho bậc 5:
- **Số tháng tự do** = tài sản dễ rút sau trừ hao ÷ chi tiêu thiết yếu. Số tháng sống được mà không cần bất kỳ thu nhập nào.
- **Số lựa chọn đã mở khóa** = số lựa chọn đang ở mức "kham nổi" (x/5).

**Người dùng thấy.** *"Nghỉ việc học thạc sĩ 18 tháng: kham nổi nếu để dành thêm ¥1.200/tháng trong 10 tháng tới."* Bấm xem chi tiết: trụ được 21 tháng trong lúc học, mục tiêu mua nhà lùi 14 tháng, giá trị nghề sau khi học tăng khoảng 12% (ước tính). Trên Tổng quan: *"Bạn đã mở khóa 2/5 lựa chọn cuộc đời."*

**API và file.** `GET /api/life-options/templates` · `POST /api/life-options/evaluate` → `{ verdict, unlockCondition, runwayMonths, goalImpacts, hcBefore, hcAfter, explain }` · `GET /api/life-options/summary`. File `shared/engine/life-options.ts`. Loại câu hỏi AI: `life_decision`. Không cần bảng mới.

**Test.** Cùng đầu vào cho cùng kết luận; áp dụng điều kiện mở khóa thì kết luận chuyển sang "kham nổi"; số tháng tự do ≥ 0; chi tiêu thiết yếu = 0 không gây lỗi chia.

**Cơ sở học thuật.** Bodie, Merton & Samuelson (1992): khả năng linh hoạt trong công việc có giá trị như một quyền chọn. Dixit & Pindyck (1994): quyền chọn thực cho quyết định khó đảo ngược.

---

## B2. Vốn con người theo mức phơi nhiễm AI — bậc 3

**Vấn đề.** Với người trẻ, tài sản lớn nhất là khả năng kiếm tiền trong tương lai, nhưng không app nào tính nó. AI đang làm giá trị này thay đổi nhanh.

**Cách làm.**
$$HC = \sum_{t=1}^{T} \frac{\text{Thu nhập năm nay} \times (1+g)^t}{(1 + r + \pi)^t}$$

| Ký hiệu | Nghĩa | Lấy từ đâu |
|---|---|---|
| $T$ | Số năm còn đi làm | Người dùng nhập tuổi và tuổi nghỉ hưu |
| $g$ | Tốc độ tăng thu nhập | Theo nhóm nghề (ƯỚC TÍNH) |
| $r$ | Lãi suất không rủi ro | Theo loại tiền (ƯỚC TÍNH) |
| $\pi$ | Mức bất định của nghề | Theo mức phơi nhiễm AI của ILO: không phơi nhiễm 1% · mức 1: 2% · mức 2: 3% · mức 3: 4% · mức 4: 5% (ƯỚC TÍNH) |

Dữ liệu: ILO Working Paper 140 (5/2025) chấm mức phơi nhiễm AI tạo sinh cho 427 nghề theo mã ISCO-08, chia 4 mức. An Tâm dùng bảng rút gọn khoảng 30 nghề phổ biến (lập trình viên, kế toán, nhân viên văn phòng, giáo viên, điều dưỡng, thiết kế, bán hàng, chăm sóc khách hàng, marketing…).

**Đọc dữ liệu cho đúng.** ILO nhấn mạnh: phơi nhiễm **không** có nghĩa là mất việc — nhiều nghề được AI hỗ trợ hơn là bị thay thế. Vì vậy An Tâm dùng mức phơi nhiễm cho hai việc: (1) mức bất định của thu nhập, (2) cho thấy **giá trị của việc học kỹ năng mới**. App không bao giờ nói "nghề của bạn sẽ biến mất".

**Giờ học thành giá trị.** Nâng `incomeGrowthPlan` từ gợi ý mẫu thành phép tính: giờ/tuần × số tháng → nếu đủ ngưỡng, mô phỏng $g$ tăng và $\pi$ giảm một mức → hiện phần vốn con người tăng thêm, ghi rõ ước tính.

**Người dùng thấy.** *"5 giờ/tuần trong 12 tháng (khoảng 260 giờ) có thể làm giá trị nghề của bạn tăng khoảng 8% (ước tính). Đây không phải lời hứa tăng lương."*

**API và file.** `GET /api/human-capital` → `{ hc, exposureLevel, pi, g, skillDelta, explain }`. File `shared/engine/human-capital.ts`, `shared/data/ilo-exposure.ts`. Cột mới: `income_profiles.isco_code`, `financial_profiles.birth_year`, `financial_profiles.retirement_age` (hiện chỉ có `users.life_stage`, chưa đủ để tính $T$).

**Test.** $\pi$ tăng thì HC giảm; $T \le 0$ thì HC = 0; cùng đầu vào cùng kết quả.

---

## B3. Thử tải có tính phản ứng cảm xúc — bậc 2 và 4

**Vấn đề.** Mô phỏng thông thường giả định người dùng bình tĩnh. Thực tế, thiệt hại lớn nhất khi khủng hoảng thường đến từ việc hoảng loạn bán tháo. App đã đo điều này (`habitsProfile` ✅) nhưng chưa dùng.

**Cách làm.**
- Điểm phản ứng thực tế (`habitsProfile().actualScore`) ≥ 6: mô phỏng như bình thường.
- Điểm < 6: mô phỏng việc bán tài sản biến động ở đáy và mua lại sau vài tháng (ƯỚC TÍNH).
- **Khoảng cách hành vi** = giá trị tài sản nếu giữ nguyên − giá trị tài sản nếu bán tháo.

**Kịch bản khủng hoảng thật** (số làm tròn từ dữ liệu công khai, ƯỚC TÍNH, lưu trong bảng `simulation_presets` ✅):

| Kịch bản | Thị trường giảm | Cú sốc thu nhập |
|---|---|---|
| Khủng hoảng 2008 | S&P 500 ≈ −55%; Shanghai Composite ≈ −70% | Mất việc 6 tháng: tài chính, bất động sản, sản xuất |
| COVID-19 (3/2020) | S&P 500 ≈ −34% trong khoảng 1 tháng | Thu nhập −30% trong 3 tháng: dịch vụ, bán lẻ, du lịch |
| Sa thải ngành công nghệ 2022–2023 | Nasdaq ≈ −33% (năm 2022) | Mất việc 4 tháng: công nghệ |

Cú sốc thu nhập **chỉ áp dụng khi ngành của người dùng trùng ngành bị ảnh hưởng** — minh họa trực tiếp cho rủi ro tiền và nghề cùng lúc.

Khoảng P10/P50/P90 của Runway dùng phân phối Student-t (ν = 4) thay cho phân phối chuẩn, để các cú sốc cực đoan xuất hiện gần với thực tế hơn. Seed cố định theo người dùng và tham số, nên kết quả vẫn lặp lại được. File `shared/engine/montecarlo.ts`.

> ⚠️ Các con số khủng hoảng trên được ghi theo số liệu phổ biến, **cần tra lại nguồn gốc trước khi đưa lên slide**.

**Người dùng thấy.** *"Nếu thị trường giảm 30% và bạn bán ra như câu trả lời ở bài kiểm tra thói quen, bạn có thể mất thêm khoảng ¥18.000 so với giữ nguyên kế hoạch."* Kèm một hành động đề xuất (chờ xác nhận): đặt quy tắc "không bán trong 30 ngày sau khi thị trường giảm trên 20%".

**Test.** Khoảng cách hành vi ≥ 0; điểm ≥ 6 thì khoảng cách = 0; cùng seed cùng kết quả; ngành không trùng thì không áp cú sốc thu nhập.

**Cơ sở.** Kahneman & Tversky (1979), Prospect Theory — nỗi sợ thua lỗ. Morningstar, báo cáo thường niên *Mind the Gap* — chênh lệch giữa lợi nhuận của quỹ và lợi nhuận nhà đầu tư thực nhận.

---

## B4. Thử trước khi xuống tiền + cổ phiếu thưởng — bậc 4

**Vấn đề.** Người dùng hay đầu tư vào đúng ngành mình làm vì "hiểu ngành", và nhận cổ phiếu thưởng của chính công ty. Khi ngành gặp khó, họ mất cả lương lẫn tiền để dành.

**Cách làm.**
- `whatIfAllocate()` trong `shared/engine/career-overlap.ts`: người dùng nhập "bỏ thêm X vào nhóm ngành Y". Engine so sánh trước và sau: chỉ số tập trung rủi ro $C_s$ ([ba.md](ba.md) §5.2), khả năng đạt mục tiêu (`goalProbability` ✅), số tháng trụ được nếu lấy từ tiền mặt.
- Chỉ ở mức nhóm ngành × loại tài sản. Hỏi mã cổ phiếu cụ thể sẽ bị từ chối.
- Cột `holdings.is_employer_stock`: cổ phiếu công ty mình làm có $\beta = 1$ với ngành hiện tại, kèm cảnh báo riêng *"Lương và cổ phiếu thưởng của bạn đến từ cùng một công ty."*
- Khi người dùng đổi nghề, thu nhập hoặc ngành (`PUT /api/earn`): dùng lại `afterChange` (`worker/lib/refresh.ts` ✅) để tính lại vốn con người, $C_s$ và tạo cảnh báo mới trong `ai_alerts` ✅.

**Người dùng thấy.** *"Sau khoản này, 71% tổng tài sản của bạn — tính cả công việc — phụ thuộc ngành công nghệ (hiện 58%). Quỹ dự phòng giảm từ 6 xuống 3,5 tháng."*

**API.** `GET /api/career-overlap` · `POST /api/career-overlap/what-if` → `{ before, after, deltas, explain }`. Loại câu hỏi AI: `what_if_allocate`.

**Test.** $C_s$ luôn trong [0, 1]; thêm tài sản khác ngành thì $C_s$ ngành mình giảm; đánh dấu cổ phiếu thưởng thì $C_s$ tăng đúng bằng tỷ trọng của nó.

**Cơ sở học thuật.** Campbell & Viceira (2002); Davis & Willen (2000).

---

## So với sản phẩm khác

| Khả năng | Robo-advisor (Wealthfront, Betterment) | Theo dõi tài sản (Empower, Kubera) | Trợ lý chi tiêu AI (Cleo, Copilot Money) | An Tâm |
|---|:-:|:-:|:-:|:-:|
| Dòng tiền, chi tiêu | — | ✓ | ✓ | ✓ |
| Thử tải tương tác | Hạn chế | — | — | ✓ |
| Tính vốn con người theo mức phơi nhiễm AI | — | — | — | B2 |
| Cảnh báo tiền và nghề cùng rủi ro, cổ phiếu thưởng | — | — | — | B4 |
| Đánh giá quyết định cuộc đời | — | — | — | B1 |
| Đưa phản ứng cảm xúc vào mô phỏng | Bảng hỏi cố định | — | — | B3 |

> Dựa trên tính năng các sản phẩm công bố công khai; cần rà lại trước khi đưa vào slide.

---

## Thứ tự ưu tiên và cắt giảm khi trễ

| Ưu tiên | Hạng mục | Hạn | Nếu trễ |
|:-:|---|:-:|---|
| P0 | B4 lõi: $C_s$, `whatIfAllocate`, cổ phiếu thưởng | 07/10 | Không cắt |
| P0 | B2 lõi: vốn con người với bảng ILO | 08/10 | Không cắt |
| P0 | B1 lõi: `study`, `care`, `startup` + số tháng tự do + kết luận | 10/10 | Không cắt — là cao trào demo |
| P1 | B3: khoảng cách hành vi | 12/10 | Cắt được, vẫn kể trong pitch |
| P2 | B3: kịch bản khủng hoảng + Student-t | 13/10 | Cắt được, dùng phân phối chuẩn có seed |
| P2 | B2: giờ học thành giá trị | 13/10 | Cắt được, giữ `incomeGrowthPlan` như cũ |
| P3 | B4: tự tính lại khi đổi việc | 14/10 | Cắt đầu tiên |
| P3 | B1: `switch`, `sabbatical` | 14/10 | Cắt được |

---

## Nguồn

- Bodie, Z., Merton, R. C. & Samuelson, W. F. (1992). *Labor supply flexibility and portfolio choice in a life cycle model.* Journal of Economic Dynamics and Control, 16(3–4).
- Campbell, J. Y. & Viceira, L. M. (2002). *Strategic Asset Allocation.* Oxford University Press.
- Davis, S. J. & Willen, P. (2000). *Occupation-level income shocks and asset returns.* NBER Working Paper 7905.
- Dixit, A. K. & Pindyck, R. S. (1994). *Investment under Uncertainty.* Princeton University Press.
- Kahneman, D. & Tversky, A. (1979). *Prospect Theory: An Analysis of Decision under Risk.* Econometrica, 47(2).
- ILO (2025). *Generative AI and Jobs: A Refined Global Index of Occupational Exposure.* Working Paper 140 — [link](https://webapps.ilo.org/static/english/intserv/working-papers/wp140/index.html)
- ILO (2025). *Generative AI and jobs: A 2025 update.* Research Brief — [link](https://www.ilo.org/publications/generative-ai-and-jobs-2025-update)
- Morningstar. *Mind the Gap* (báo cáo thường niên).
- Tham khảo thêm cho phần vốn con người: Merton (1971); Cocco, Gomes & Maenhout (2005); Benzoni, Collin-Dufresne & Goldstein (2007); Ibbotson, Milevsky, Chen & Zhu (2007).
