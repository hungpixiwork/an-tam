import type { AppState, GiaoDichThuChi } from '@/state/types';
import { chonDongTienThang } from '@/state/chon';

/**
 * Tính toán thu chi thực tế theo danh mục từ sổ giao dịch
 */
export function tinhThongKeThuChi(giaoDich: GiaoDichThuChi[]) {
  let tongThu = 0;
  let tongChi = 0;
  const theoDanhMucChi: Record<string, number> = {};
  const theoDanhMucThu: Record<string, number> = {};

  giaoDich.forEach((gd) => {
    if (gd.loai === 'thu') {
      tongThu += gd.soTien;
      theoDanhMucThu[gd.danhMuc] = (theoDanhMucThu[gd.danhMuc] || 0) + gd.soTien;
    } else {
      tongChi += gd.soTien;
      theoDanhMucChi[gd.danhMuc] = (theoDanhMucChi[gd.danhMuc] || 0) + gd.soTien;
    }
  });

  return {
    tongThu,
    tongChi,
    thangDu: tongThu - tongChi,
    theoDanhMucChi,
    theoDanhMucThu,
  };
}

/**
 * So sánh ngân sách kế hoạch và chi tiêu thực tế
 */
export function tinhSoSanhNganSach(state: AppState) {
  const dongTien = chonDongTienThang(state);
  const keHoachThu = state.hoSo.thuNhapThang;
  const keHoachChi = state.hoSo.chiTieuThang;

  const thongKeSo = tinhThongKeThuChi(state.soThuChi);

  return {
    keHoachThu,
    keHoachChi,
    thucTeThu: thongKeSo.tongThu || keHoachThu,
    thucTeChi: thongKeSo.tongChi || keHoachChi,
    khaNangDeDanhSauNo: dongTien.thucNhan,
    tyLeTietKiem: dongTien.tyLeTietKiem,
  };
}
