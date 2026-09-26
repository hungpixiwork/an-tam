# An Tâm AI — Competition Readiness (Shenzhen Demo)

## 1. Product Completeness

### REAL (End-to-End, Tested)
| Flow | Mức | Evidence |
|---|---|---|
| Đăng ký → Onboarding → Dashboard | 5/5 | Full auth + 3-step onboarding + overview |
| Ghi thu chi → AI phản ứng | 5/5 | `afterChange` → peaceScore + alerts + ai_events |
| Đặt mục tiêu → Xác suất → Timeline | 5/5 | `goalProbability` with Normal CDF |
| Mô phỏng rủi ro → Before/After | 4.5/5 | 5 sliders + presets + real-time preview |
| Kế hoạch an toàn → Checklist | 4/5 | 3-step proposal + chart + tasks |
| Kiểm tra thói quen → Score gap | 4/5 | Behavioral finance, self vs actual |
| AI Theo dõi → Cảnh báo tự động | 4/5 | Cron + 3 alert rules + event log |
| Export/Delete dữ liệu | 4/5 | Full JSON export, cascade delete |

### MISSING
| Flow | Impact |
|---|---|
| **EARN — Nâng cao năng lực kiếm tiền** | Đứt gãy journey cho persona Starting (18-24) |

### FAKE / PLACEBO
| Flow | Chi tiết |
|---|---|
| Toggle "Mã hóa dữ liệu" | UI có nhưng `disabled`, D1 không encrypt at-rest |

---

## 2. Innovation

| So với... | An Tâm AI khác gì |
|---|---|
| **Banking app** | Banking nhìn quá khứ (balance, transactions). An Tâm AI nhìn **tương lai** (simulation, probability, safety plan) |
| **Expense tracker** | Tracker chỉ ghi. An Tâm AI **phản ứng** — ghi khoản chi → AI cập nhật peace score + cảnh báo + gợi ý |
| **Robo-advisor** | Robo tối đa lợi nhuận. An Tâm AI tối đa **sự an tâm** — "Không cần lợi nhuận cao nhất. Kế hoạch bền hơn." |
| **ChatGPT finance** | ChatGPT hallucinate số liệu. An Tâm AI dùng **deterministic engine** — cùng input luôn cho cùng output, có test |
| **Productivity app** | Productivity theo dõi tasks. An Tâm AI theo dõi **khả năng chịu đựng biến cố** — "Nếu mất việc 6 tháng, bạn trụ được không?" |

### Unique Selling Points
1. **Peace Score** — Định lượng "sự an tâm" thay vì chỉ hiện con số tài sản
2. **Future-first Simulation** — Stress-test trước khi rủi ro thành hiện thực
3. **Behavioral Finance** — Trắc nghiệm thói quen phản ứng rủi ro (self vs actual score)
4. **Explainable AI** — Không LLM, mọi gợi ý có công thức và số liệu đi kèm
5. **Pixel Art identity** — Minh họa SVG tự vẽ bằng code, tạo identity unique

---

## 3. Commercial Value

**Target segment mạnh nhất:** Stabilizing (30-40) và Growing Wealth (40+) — những người cần sự an tâm và quản trị rủi ro hơn là lợi nhuận thuần túy.

**Monetization potential:**
- Freemium: Core features miễn phí, premium cho simulation nâng cao + AI coaching
- B2B: License engine cho ngân hàng/bảo hiểm (financial wellness tool)
- Data moat: Càng dùng lâu, engine càng chính xác (effectiveProfile từ sổ thu chi)

---

## 4. Human Value

**Chuyển đổi tư duy cốt lõi:**
- Từ: "Tôi có bao nhiêu tiền?"
- Sang: **"Tôi có thể trụ được bao lâu và mục tiêu có an toàn không?"**

**Giá trị tâm lý:**
- Giảm financial anxiety bằng cách đo lường và kiểm soát
- Behavioral nudge: Thói quen ghi sổ → AI phản ứng → thấy tiến bộ → tiếp tục
- Safety-first: Quỹ dự phòng ưu tiên trước đầu tư (anti-FOMO)

---

## 5. Defensibility — 5 MOAT Check

| MOAT | Hiện trạng | Điểm |
|---|---|---|
| **Whole Financial Life** (TIME → FREEDOM) | Mạnh ở SAVINGS → FREEDOM, đứt ở TIME → INCOME | ⚠️ 3/5 |
| **Future Not Past** | Rất mạnh — Simulation, Goals probability, Safety plan | ✅ 5/5 |
| **Earning Capacity** | Vắng mặt hoàn toàn | ❌ 0/5 |
| **Explainable Decision Engine** | Mạnh — Engine thuần, test đầy đủ, công thức rõ ràng | ✅ 5/5 |
| **Private by Design** | Khá tốt (không gọi LLM), nhưng privacy claim cần sửa | ⚠️ 3.5/5 |

**Tổng: 16.5/25** — Sản phẩm mạnh nhưng cần bổ sung EARN để hoàn thiện thesis.

---

## 6. Demo Strategy (Shenzhen)

### Recommended Flow (3-5 phút)
1. **Hook** (30s): "Bạn biết mình có bao nhiêu tiền. Nhưng bạn có biết mình trụ được bao lâu nếu mất việc?"
2. **Onboarding** (60s): Đăng ký → nhập thu chi + tài sản → Peace Score hiện ngay
3. **Insight** (60s): Dashboard — "Mức an tâm 72/100, cần chú ý" + giải thích 4 yếu tố
4. **Simulation** (60s): Kéo slider "Năm khó khăn" → xem tài sản giảm, mục tiêu chậm → "What if"
5. **Action** (30s): Kế hoạch an toàn → 3 bước cụ thể → áp dụng → score tăng
6. **Close** (30s): "An Tâm AI — Hiểu tiền của bạn. Chuẩn bị cho tương lai."

### Risks to Avoid
- ❌ Không demo EARN (chưa có)
- ❌ Không demo privacy toggle (placebo)
- ❌ Không demo bằng tiếng Trung (chưa có i18n)
- ✅ Demo bằng tiếng Việt, giải thích concept bằng tiếng Anh/Trung
