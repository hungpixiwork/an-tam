import type { AppState, KhoanTaiSan } from '@/state/types';
import {
  chonTaiSanDauTu,
  chonTongTaiSan,
  chonCoPhieuCongTy,
  chonRuiRoTapTrung,
} from '@/state/chon';

/**
 * Phân tích cơ cấu danh mục và phân bổ lớp tài sản
 */
export function tinhCoCauDanhMuc(state: AppState) {
  const tongDauTu = chonTaiSanDauTu(state);
  const tongTaiSan = chonTongTaiSan(state);
  const coPhieuCongTy = chonCoPhieuCongTy(state);
  const ruiRoTapTrung = chonRuiRoTapTrung(state);

  const phanBoLoai: Record<KhoanTaiSan['loai'], number> = {
    tien_mat: 0,
    co_phieu: 0,
    trai_phieu: 0,
    quy_dau_tu: 0,
    khac: 0,
  };

  state.danhSachTaiSan.forEach((ts) => {
    phanBoLoai[ts.loai] = (phanBoLoai[ts.loai] || 0) + ts.giaTri;
  });

  return {
    tongTaiSan,
    tongDauTu,
    coPhieuCongTy,
    ruiRoTapTrung,
    phanBoLoai,
    tyTrongCoPhieu: tongDauTu > 0 ? (phanBoLoai.co_phieu + phanBoLoai.quy_dau_tu) / tongDauTu : 0,
    tyTrongAnToan: tongTaiSan > 0 ? (phanBoLoai.tien_mat + phanBoLoai.trai_phieu) / tongTaiSan : 0,
  };
}

/**
 * Mô phỏng điều chỉnh tái cân bằng danh mục
 */
export function tinhTaiCanBang(danhSach: KhoanTaiSan[], idThayDoi: string, giaTriMoi: number) {
  const danhSachMoi = danhSach.map((ts) => (ts.id === idThayDoi ? { ...ts, giaTri: giaTriMoi } : ts));
  const tongMoi = danhSachMoi.reduce((sum, ts) => sum + ts.giaTri, 0);

  return danhSachMoi.map((ts) => ({
    ...ts,
    tyTrongMoi: tongMoi > 0 ? ts.giaTri / tongMoi : 0,
  }));
}
