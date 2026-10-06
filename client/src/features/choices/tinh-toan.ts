import type { AppState, KichBanCuocDoi } from '@/state/types';
import { chonQuyDuPhong, chonDongTienThang } from '@/state/chon';

export interface ThongSoKichBanThu {
  chiPhiBanDau: number;
  thayDoiThuNhapThang: number;
  thayDoiChiTieuThang: number;
}

/**
 * Tính toán tác động của kịch bản cuộc đời (Mua nhà, Đổi việc, Sinh con...)
 */
export function tinhTacDongKichBan(
  state: AppState,
  _kichBan: KichBanCuocDoi,
  thongSo: ThongSoKichBanThu = { chiPhiBanDau: 0, thayDoiThuNhapThang: 0, thayDoiChiTieuThang: 0 }
) {
  const tienMatHienCo = chonQuyDuPhong(state);
  const dongTien = chonDongTienThang(state);

  const tienMatSauDo = tienMatHienCo - thongSo.chiPhiBanDau;
  const thuNhapSauDo = state.hoSo.thuNhapThang + thongSo.thayDoiThuNhapThang;
  const chiTieuSauDo = state.hoSo.chiTieuThang + thongSo.thayDoiChiTieuThang;
  const khaNangTietKiemSauDo = thuNhapSauDo - chiTieuSauDo - dongTien.traNo;

  const soThangAnToanSauDo = chiTieuSauDo > 0 ? Math.max(0, tienMatSauDo) / chiTieuSauDo : 0;
  const khaThi = tienMatSauDo >= 0 && khaNangTietKiemSauDo >= 0;

  return {
    tienMatTruoc: tienMatHienCo,
    tienMatSauDo,
    thuNhapTruoc: state.hoSo.thuNhapThang,
    thuNhapSauDo,
    chiTieuTruoc: state.hoSo.chiTieuThang,
    chiTieuSauDo,
    khaNangTietKiemSauDo,
    soThangAnToanSauDo,
    khaThi,
  };
}
