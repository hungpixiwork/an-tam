import type { AppState } from '@/state/types';
import { chonGiaTriNgheNghiep, chonDongTienThang } from '@/state/chon';

/**
 * Tính toán triển vọng thu nhập, giá trị nghề nghiệp và tác động của AI
 */
export function tinhTrienVongThuNhap(state: AppState) {
  const giaTriNghe = chonGiaTriNgheNghiep(state);
  const dongTien = chonDongTienThang(state);

  const thuNhapNamHienTai = state.hoSo.thuNhapThang * 12;
  const mucTieuThuNhapNam = thuNhapNamHienTai * 1.2; // Mục tiêu tăng 20%
  const thuNhapPhuDuKien = state.hoSo.thuNhapThang * 0.15; // Ước tính nguồn phụ

  return {
    thuNhapThang: state.hoSo.thuNhapThang,
    thuNhapNamHienTai,
    mucTieuThuNhapNam,
    thuNhapPhuDuKien,
    giaTriSucLaoDong: giaTriNghe.giaTriSucLaoDong,
    mucDoAiThayThe: giaTriNghe.mucDoAiThayThe,
    nhomIlo: giaTriNghe.nhomIlo,
    tiLeRuiRoAi: giaTriNghe.tiLeRuiRoAi,
    diemNgheNghiep: giaTriNghe.diemNgheNghiep,
    soGioHocTuan: giaTriNghe.soGioHocTuan,
    khaNangTietKiemThang: dongTien.thucNhan,
  };
}
