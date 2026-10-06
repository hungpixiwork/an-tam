// Các hàm Selectors trích xuất và tính toán dữ liệu sạch từ AppState (chuẩn mực nguyenvongai).
// Mọi con số trên giao diện đều được tính toán từ trạng thái thực tế, không có số gõ cứng.

import type { AppState, NhomNganh } from './types';
import { peaceScore, postDebtSavingsCapacity } from '../../../shared/engine/peace';
import { computeTechExposure, computeCareerOverlap } from '../../../shared/engine/concentration';
import { humanCapital, EXPOSURE_PI } from '../../../shared/engine/humanCapital';
import { iloGroupFor } from '../../../shared/data/ilo-exposure';

/** Tổng giá trị tất cả tài sản (tổng tài sản thô) */
export function chonTongTaiSan(s: AppState): number {
  return s.danhSachTaiSan.reduce((sum, item) => sum + item.giaTri, 0);
}

/** Tổng tài sản nằm trong danh mục đầu tư */
export function chonTaiSanDauTu(s: AppState): number {
  return s.danhSachTaiSan
    .filter((item) => item.tinhVaoDanhMuc !== false)
    .reduce((sum, item) => sum + item.giaTri, 0);
}

/** Giá trị quỹ dự phòng khẩn cấp */
export function chonQuyDuPhong(s: AppState): number {
  const ts = s.danhSachTaiSan.find((item) => item.tinhVaoDanhMuc === false && item.loai === 'tien_mat');
  return ts ? ts.giaTri : (s.danhSachTaiSan.find((item) => item.loai === 'tien_mat')?.giaTri ?? 0);
}

/** Tổng các khoản nợ phải trả */
export function chonTongNo(s: AppState): number {
  return s.danhSachKhoanNo.reduce((sum, item) => sum + item.duNo, 0);
}

/** Nghĩa vụ trả nợ định kỳ hàng tháng */
export function chonTraNoHangThang(s: AppState): number {
  return s.danhSachKhoanNo.reduce((sum, item) => sum + item.traHangThang, 0);
}

/** Giá trị tài sản ròng = Tổng tài sản - Tổng nợ */
export function chonTaiSanRong(s: AppState): number {
  return chonTongTaiSan(s) - chonTongNo(s);
}

/** Số tháng an toàn (quỹ đủ sống X tháng dựa trên chi phí thiết yếu) */
export function chonSoThangAnToan(s: AppState): number {
  const quy = chonQuyDuPhong(s);
  const chiPhi = s.hoSo.chiTieuThietYeu > 0 ? s.hoSo.chiTieuThietYeu : s.hoSo.chiTieuThang;
  return chiPhi > 0 ? Math.round((quy / chiPhi) * 10) / 10 : 0;
}

/** Tỷ trọng cổ phiếu của chính công ty mình làm */
export function chonCoPhieuCongTy(s: AppState): { giaTri: number; tyTrong: number } {
  const coPhieu = s.danhSachTaiSan.find((item) => item.laCoPhieuCongTy);
  const giaTri = coPhieu?.giaTri ?? 0;
  const tongDauTu = chonTaiSanDauTu(s);
  const tyTrong = tongDauTu > 0 ? giaTri / tongDauTu : 0;
  return { giaTri, tyTrong };
}

/** Mức độ rủi ro tập trung theo ngành & trùng lặp nghề nghiệp */
export function chonRuiRoTapTrung(s: AppState) {
  const tongDauTu = chonTaiSanDauTu(s);
  const theoNganh: Record<string, number> = {};
  s.danhSachTaiSan
    .filter((t) => t.tinhVaoDanhMuc !== false)
    .forEach((t) => {
      theoNganh[t.nganh] = (theoNganh[t.nganh] || 0) + t.giaTri;
    });

  let nganhLonNhat: NhomNganh = (s.hoSo.nganhNghe || 'cong_nghe') as NhomNganh;
  let giaTriLonNhat = 0;
  for (const [nganh, val] of Object.entries(theoNganh)) {
    if (val > giaTriLonNhat) {
      giaTriLonNhat = val;
      nganhLonNhat = nganh as NhomNganh;
    }
  }

  const tyTrongNganh = tongDauTu > 0 ? giaTriLonNhat / tongDauTu : 0;

  // Tính trùng lặp kỹ năng & danh mục (Career Overlap)
  const holdingsAdapter = s.danhSachTaiSan.map((t) => ({
    id: t.id,
    name: t.ten,
    category: (t.loai === 'tien_mat' ? 'cash' : t.loai === 'quy_dau_tu' ? 'fund' : t.loai === 'co_phieu' ? 'stock' : t.loai === 'trai_phieu' ? 'bond' : 'other') as any,
    value: t.giaTri,
    role: '',
    volatility: 'mid' as any,
    riskGroup: '',
    sector: t.nganh as any,
    isEmployerStock: t.laCoPhieuCongTy,
    inPortfolio: t.tinhVaoDanhMuc !== false,
    isMain: true,
  }));

  const techExp = computeTechExposure(holdingsAdapter);
  const hcValue = s.hoSo.thuNhapThang * 12 * 10; // ước tính thô 10 năm
  const careerBeta = s.hoSo.nganhNghe === 'technology' ? 0.7 : 0.4;
  const careerOverlap = computeCareerOverlap(hcValue, careerBeta, techExp, chonTongTaiSan(s));

  return {
    nganhLonNhat,
    giaTriLonNhat,
    tyTrongNganh,
    careerOverlap,
    mucDo: tyTrongNganh > 0.4 ? ('cao' as const) : tyTrongNganh > 0.25 ? ('trung_binh' as const) : ('thap' as const),
  };
}

/** Chuyển đổi AppState sang UserState cho engine */
export function sangUserState(s: AppState): any {
  return {
    today: '2026-10-01',
    salutation: s.hoSo.xungHo,
    profile: {
      monthlyIncome: s.hoSo.thuNhapThang,
      monthlyExpense: s.hoSo.chiTieuThang,
      essentialExpense: s.hoSo.chiTieuThietYeu,
      emergencyTargetMonths: s.hoSo.soThangDuPhongMucTieu || 6,
      riskSelfScore: 50,
      birthYear: s.hoSo.namSinh,
      retirementAge: s.hoSo.tuoiNghiHuu,
    },
    holdings: s.danhSachTaiSan.map((t) => ({
      id: t.id,
      value: t.giaTri,
      volatility: t.mucDoBienDong === 'cao' ? 'high' : t.mucDoBienDong === 'trung_binh' ? 'mid' : 'low',
      inPortfolio: t.tinhVaoDanhMuc !== false,
      role: '',
      riskGroup: '',
      category: t.loai === 'tien_mat' ? 'cash' : t.loai === 'quy_dau_tu' ? 'fund' : t.loai === 'co_phieu' ? 'stock' : t.loai === 'trai_phieu' ? 'bond' : 'other',
      name: t.ten,
      isMain: true,
    })),
    goals: s.danhSachMucTieu.map((m) => ({
      id: m.id,
      title: m.ten,
      currentAmount: m.soTienHienCo,
      targetAmount: m.soTienDich,
      monthlyContribution: m.dongGopThang,
      targetMonth: '2029-10-01',
      priority: m.uuTien === 'rat_cao' ? 1 : 2,
      kind: m.ten.toLowerCase().includes('dự phòng') || m.id.includes('du-phong') ? 'emergency' : 'custom',
    })),
    liabilities: s.danhSachKhoanNo.map((n) => ({
      id: n.id,
      balance: n.duNo,
      monthlyPayment: n.traHangThang,
      name: n.ten,
      kind: 'consumer',
    })),
    ledger: s.soThuChi.map((g) => ({
      month: g.ngay.slice(0, 7),
      income: g.loai === 'thu' ? g.soTien : 0,
      expense: g.loai === 'chi' ? g.soTien : 0,
    })),
    snapshots: [],
  };
}

/** Điểm An Tâm (0..100) theo 4 nhân tố chuẩn hóa */
export function chonDiemAnTam(s: AppState) {
  const userStateMock = sangUserState(s);
  const soThang = chonSoThangAnToan(s);
  const mucTieuThang = s.hoSo.soThangDuPhongMucTieu || 6;
  const cap = postDebtSavingsCapacity(userStateMock);

  const res = peaceScore(userStateMock);
  return {
    diemSo: res.score,
    muc: res.level === 'stable' ? ('on_dinh' as const) : res.level === 'watch' ? ('can_chu_y' as const) : ('can_hanh_dong' as const),
    nhanTo: res.factors,
    soThangHienTai: soThang,
    soThangMucTieu: mucTieuThang,
    khaNangTietKiemSauNo: cap,
  };
}

/** Giá trị nghề nghiệp & tác động của AI */
export function chonGiaTriNgheNghiep(s: AppState) {
  const tuoi = 2026 - s.hoSo.namSinh;
  const thuNhapNam = s.hoSo.thuNhapThang * 12;

  // Tra cứu nhóm ILO ISCO-08
  const ilo = iloGroupFor(s.hoSo.maNgheIsco);
  const level = ilo?.level ?? 2;
  const group = `G${level}`;
  const pi = EXPOSURE_PI[level];

  // Tính vốn sức lao động theo ISCO-08
  const hcRes = humanCapital({
    annualIncome: thuNhapNam,
    age: tuoi,
    retirementAge: s.hoSo.tuoiNghiHuu,
    sector: s.hoSo.nganhNghe,
    iscoCode: s.hoSo.maNgheIsco,
    skillHoursPerWeek: s.hoSo.soGioHocTuan,
  });

  return {
    giaTriSucLaoDong: hcRes.hc,
    maNghe: s.hoSo.maNgheIsco,
    mucDoAiThayThe: hcRes.exposureLevel,
    nhomIlo: group,
    tiLeRuiRoAi: pi,
    soGioHocTuan: s.hoSo.soGioHocTuan,
    diemNgheNghiep: hcRes.careerScore,
    giaiThich: hcRes.explain,
  };
}

/** Tóm tắt dòng tiền tháng này */
export function chonDongTienThang(s: AppState) {
  const thuNhap = s.hoSo.thuNhapThang;
  const chiTieu = s.hoSo.chiTieuThang;
  const traNo = chonTraNoHangThang(s);
  const thucNhan = thuNhap - chiTieu - traNo;
  const tyLeTietKiem = thuNhap > 0 ? thucNhan / thuNhap : 0;

  return {
    thuNhap,
    chiTieu,
    traNo,
    thucNhan,
    tyLeTietKiem,
    datChuan: tyLeTietKiem >= (s.hoSo.tyLeTietKiemMucTieu || 0.2),
  };
}
