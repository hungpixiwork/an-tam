import type { AppState } from '@/state/types';
import {
  chonTongTaiSan,
  chonTongNo,
  chonTaiSanRong,
  chonSoThangAnToan,
  chonDiemAnTam,
  chonDongTienThang,
  chonCoPhieuCongTy,
} from '@/state/chon';

/**
 * Tính toán số liệu tổng hợp cho trang Tổng Quan từ AppState cục bộ
 * Đảm bảo UI hiển thị tức thì (<16ms) không phụ thuộc API mạng
 */
export function tinhSoLieuTongQuan(state: AppState) {
  const tongTaiSan = chonTongTaiSan(state);
  const tongNo = chonTongNo(state);
  const taiSanRong = chonTaiSanRong(state);
  const soThangAnToan = chonSoThangAnToan(state);
  const diemAnTam = chonDiemAnTam(state);
  const dongTien = chonDongTienThang(state);
  const coPhieuCongTy = chonCoPhieuCongTy(state);

  return {
    loiChao: `Chào ${state.hoSo.xungHo}`,
    taiSanRong,
    tongTaiSan,
    tongNo,
    soThangAnToan,
    mucTieuThangAnToan: state.hoSo.soThangDuPhongMucTieu || 6,
    diemAnTam: diemAnTam.diemSo,
    mucAnTam: diemAnTam.muc,
    khaNangTietKiemThang: dongTien.thucNhan,
    tyLeTietKiem: dongTien.tyLeTietKiem,
    coPhieuCongTy,
    soLuongMucTieu: state.danhSachMucTieu.length,
    soLuongKhoanNo: state.danhSachKhoanNo.length,
  };
}
