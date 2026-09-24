# 06 · Danh mục đầu tư (Portfolio)

## Mục đích
Cung cấp cái nhìn toàn cảnh về phân bổ tài sản hiện tại, xác định rủi ro tập trung, phân tích từng khoản đầu tư, và gợi ý điều chỉnh cân bằng theo mục tiêu.

## Route
`/danh-muc` (không có sub-route)

## Dữ liệu / API
**Hook:** `usePortfolio()` → `PortfolioAnalysis`
- `total`: Giá trị tổng danh mục.
- `slices`: Mảng allocation (category, label, value, pct, color).
- `riskGroups`: Mảng risk concentration (name, pct, value, color).
- `concentration`: Chuỗi cảnh báo nếu 1 nhóm > 30%, null nếu không.
- `holdings`: Mảng holdings chính (id, name, value, role, volatility, category).
- `insights`: 3 dòng phân tích AI (title, body, tone: success/danger/accent).
- `suggestions`: 3 gợi ý điều chỉnh (title, body, tone, to link).

Không có mutation—chỉ đọc dữ liệu.

## Bố cục & các khối
1. **PageHero**: Title "Tiền của bạn đang phân bổ như thế nào?", subtitle "Không cần đọc…", scene HeroLakeCity.
2. **Danh mục hiện tại (Donut)**: DonutChart 200px, thickness 38, center formatVnd(total), legend dots + label + % + value.
3. **Rủi ro tập trung**: Horizontal bars (width = pct, color = group.color, gray track) mỗi nhóm; red rose box với concentration nếu có.
4. **Bảng các khoản chính**: Table (icon | name | giá trị | vai trò badge | volatility badge); hover bg-canvas.
5. **AI giải thích**: 3 bordered rows, IconTile + title (bold) + body.
6. **Gợi ý điều chỉnh**: 3 link card tinted (mint/rose/sky by tone), icon + title + body + arrow.

**Grid XL:** [donut 1.1fr | risk 1fr] / [table 1.6fr | AI 1fr] / suggestions 3 cols full width.

## Tương tác
- Donut chart hiển thị passive (no drill-down).
- Click card gợi ý → navigate to suggestion.to.
- Hover card tint.
- Table: hover row tô nền.

## Trạng thái
- **Loading:** PageSkeleton.
- **Error:** ErrorState với nút Thử lại.
- **No holdings:** Table vẫn render; slices/riskGroups có thể trống.
