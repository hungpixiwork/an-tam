// Mức độ AI có thể tác động tới từng nhóm nghề (ILO Working Paper 140, 2025 — theo nhóm nghề ISCO-08 cấp 1).
// Thang 0..4: 0 = rất ít, 4 = nhiều nhất. Tác động ≠ mất việc: phần lớn là công việc thay đổi, không biến mất.
// Nhãn viết bằng tiếng Việt dễ hiểu (ƯỚC TÍNH — dùng để gợi ý, không phải dự báo cho từng người).

export interface IloGroup {
  /** Chữ số đầu của mã ISCO-08. */
  major: string;
  label: string;
  /** 0..4 */
  level: 0 | 1 | 2 | 3 | 4;
}

export const ILO_GROUPS: IloGroup[] = [
  { major: '0', label: 'Lực lượng vũ trang', level: 0 },
  { major: '1', label: 'Quản lý, lãnh đạo', level: 1 },
  { major: '2', label: 'Chuyên gia, chuyên viên', level: 2 },
  { major: '3', label: 'Kỹ thuật viên, chuyên viên hỗ trợ', level: 2 },
  { major: '4', label: 'Nhân viên văn phòng, hành chính', level: 4 },
  { major: '5', label: 'Dịch vụ và bán hàng', level: 1 },
  { major: '6', label: 'Nông, lâm, ngư nghiệp', level: 0 },
  { major: '7', label: 'Thợ thủ công, xây dựng', level: 0 },
  { major: '8', label: 'Vận hành máy móc, lái xe', level: 1 },
  { major: '9', label: 'Lao động giản đơn', level: 1 },
];

/** Khi chưa biết nghề: coi như mức giữa. */
export const DEFAULT_ILO_LEVEL = 2;

export function iloGroupFor(iscoCode?: string | null): IloGroup | undefined {
  const major = iscoCode?.trim()[0];
  return ILO_GROUPS.find((g) => g.major === major);
}
