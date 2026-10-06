import type { AppState, MucTieuTaiChinh } from '@/state/types';
import { chonSoThangAnToan, chonQuyDuPhong, chonDongTienThang } from '@/state/chon';

/**
 * Tính toán số liệu quỹ dự phòng và tiến độ mục tiêu tài chính
 */
export function tinhTienDoQuyAnToan(state: AppState) {
  const tienMat = chonQuyDuPhong(state);
  const chiTieu = state.hoSo.chiTieuThietYeu > 0 ? state.hoSo.chiTieuThietYeu : state.hoSo.chiTieuThang;
  const soThangMucTieu = state.hoSo.soThangDuPhongMucTieu || 6;
  const quyCanCo = chiTieu * soThangMucTieu;
  const quyHienCo = tienMat;
  const conThieu = Math.max(0, quyCanCo - quyHienCo);
  const tyLeDat = quyCanCo > 0 ? Math.min(1, quyHienCo / quyCanCo) : 1;
  const dongTien = chonDongTienThang(state);

  // Số tháng cần để hoàn thành quỹ dự phòng với mức tích lũy hiện tại
  const soThangHoanThanh = dongTien.thucNhan > 0 && conThieu > 0
    ? Math.ceil(conThieu / dongTien.thucNhan)
    : 0;

  return {
    chiTieuThietYeuThang: chiTieu,
    soThangMucTieu,
    quyCanCo,
    quyHienCo,
    conThieu,
    tyLeDat,
    soThangHienTai: chonSoThangAnToan(state),
    khaNangDeDanhThang: dongTien.thucNhan,
    soThangHoanThanh,
  };
}

/**
 * Phân tích tiến độ của từng mục tiêu tài chính
 */
export function tinhTienDoTungMucTieu(mucTieu: MucTieuTaiChinh) {
  const tyLeDat = mucTieu.soTienDich > 0 ? Math.min(1, mucTieu.soTienHienCo / mucTieu.soTienDich) : 1;
  const conThieu = Math.max(0, mucTieu.soTienDich - mucTieu.soTienHienCo);
  const soThangCan = mucTieu.dongGopThang > 0 && conThieu > 0
    ? Math.ceil(conThieu / mucTieu.dongGopThang)
    : 0;

  return {
    ...mucTieu,
    tyLeDat,
    conThieu,
    soThangCan,
    daHoanThanh: conThieu <= 0,
  };
}
