// Mức độ AI có thể tác động tới từng nhóm nghề (ILO Working Paper 140, 2025).
// Hỗ trợ mã ISCO-08 4 chữ số chi tiết (Sheet 09_Human_Capital) và fallback nhóm lớn 1 chữ số.
// Thang 0..4: 0 = rất ít (π=1%), 1 = thấp (π=2%), 2 = trung bình (π=3%), 3 = cao (π=4%), 4 = rất cao (π=5%).
// Nhãn viết bằng tiếng Việt dễ hiểu: tác động ≠ mất việc mà là công việc biến đổi, tự động hóa một phần.

export interface IloOccupation {
  code: string;
  title: string;
  level: 0 | 1 | 2 | 3 | 4;
  meanExposure?: number;
  exposureSd?: number;
}

export interface IloGroup {
  major: string;
  label: string;
  level: 0 | 1 | 2 | 3 | 4;
}

/** Danh mục nghề nghiệp chi tiết chuẩn hóa theo ILO Annex A1 & Sheet 09 */
export const ILO_OCCUPATIONS: Record<string, IloOccupation> = {
  '2413': { code: '2413', title: 'Chuyên viên phân tích tài chính (Financial Analysts)', level: 4, meanExposure: 0.62, exposureSd: 0.06 },
  '2512': { code: '2512', title: 'Kỹ sư phát triển phần mềm (Software Developers)', level: 3, meanExposure: 0.53, exposureSd: 0.07 },
  '4110': { code: '4110', title: 'Nhân viên văn phòng tổng hợp (General Office Clerks)', level: 4, meanExposure: 0.65, exposureSd: 0.05 },
  '1211': { code: '1211', title: 'Giám đốc tài chính & Quản lý (Finance Managers)', level: 2, meanExposure: 0.38, exposureSd: 0.04 },
  '2141': { code: '2141', title: 'Kỹ sư công nghiệp (Industrial Engineers)', level: 2, meanExposure: 0.40, exposureSd: 0.05 },
  '2411': { code: '2411', title: 'Kế toán viên & Kiểm toán viên (Accountants)', level: 4, meanExposure: 0.64, exposureSd: 0.05 },
  '2511': { code: '2511', title: 'Chuyên viên phân tích hệ thống (Systems Analysts)', level: 2, meanExposure: 0.38, exposureSd: 0.04 },
  '3322': { code: '3322', title: 'Đại diện bán hàng thương mại (Sales Reps)', level: 2, meanExposure: 0.35, exposureSd: 0.05 },
  '5223': { code: '5223', title: 'Nhân viên bán lẻ (Shop Sales Assistants)', level: 1, meanExposure: 0.22, exposureSd: 0.04 },
  '7112': { code: '7112', title: 'Thợ xây dựng (Building Construction)', level: 0, meanExposure: 0.08, exposureSd: 0.03 },
  '8332': { code: '8332', title: 'Tài xế xe tải & xe buýt (Heavy Drivers)', level: 1, meanExposure: 0.15, exposureSd: 0.04 },
  '9112': { code: '9112', title: 'Nhân viên vệ sinh (Cleaners & Helpers)', level: 0, meanExposure: 0.05, exposureSd: 0.02 },
};

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

/** Mức mặc định khi chưa có thông tin */
export const DEFAULT_ILO_LEVEL = 2;

export function iloGroupFor(iscoCode?: string | null): { level: 0 | 1 | 2 | 3 | 4; label: string } | undefined {
  if (!iscoCode) return undefined;
  const code = iscoCode.trim();
  
  // Ưu tiên khớp mã 4 chữ số chi tiết
  if (ILO_OCCUPATIONS[code]) {
    const occ = ILO_OCCUPATIONS[code];
    return { level: occ.level, label: occ.title };
  }

  // Khớp theo nhóm 1 chữ số đầu
  const major = code[0];
  const grp = ILO_GROUPS.find((g) => g.major === major);
  if (grp) return { level: grp.level, label: grp.label };

  return undefined;
}
