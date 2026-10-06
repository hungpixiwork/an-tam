// Kiểu dữ liệu nghiệp vụ toàn ứng dụng An Tâm AI (Thuần Việt chuẩn SGK).

export type LoaiTaiSan = 'tien_mat' | 'quy_dau_tu' | 'co_phieu' | 'trai_phieu' | 'khac';
export type NhomNganh = 'technology' | 'finance' | 'real_estate' | 'manufacturing' | 'consumer' | 'healthcare' | 'education_public' | 'other';
export type MucDoBienDong = 'thap' | 'trung_binh' | 'cao';
export type LoaiNo = 'the_tin_dung' | 'tieu_dung' | 'mua_xe' | 'mua_nha' | 'kinh_doanh' | 'khac';
export type LoaiMucTieu = 'quy_an_toan' | 'mua_nha' | 'mua_xe' | 'hoc_tap' | 'nghi_huu' | 'khac';
export type MucUuTien = 'rat_cao' | 'cao' | 'binh_thuong';
export type LoaiGiaoDich = 'thu' | 'chi';
export type NhomChiTieu = 'thiet_yeu' | 'linh_hoat' | 'dau_tu' | 'hoc_tap' | 'tra_no' | 'khac';
export type XungHo = 'anh' | 'chị' | 'bạn';

/** Hồ sơ thu nhập & chi tiêu nền tảng */
export interface HoSoTaiChinh {
  id: string;
  hoTen: string;
  email: string;
  xungHo: XungHo;
  namSinh: number;
  tuoiNghiHuu: number;
  thuNhapThang: number;
  chiTieuThang: number;
  chiTieuThietYeu: number;
  soThangDuPhongMucTieu: number;
  maNgheIsco: string; // Mã chuẩn ISCO-08 (vd: 2512 Lập trình phần mềm, 2413 Tài chính)
  nganhNghe: NhomNganh;
  soGioHocTuan: number;
  tyLeTietKiemMucTieu: number;
}

/** Khoản tài sản trong danh mục */
export interface KhoanTaiSan {
  id: string;
  ten: string;
  loai: LoaiTaiSan;
  nganh: NhomNganh;
  giaTri: number;
  laCoPhieuCongTy?: boolean;
  tinhVaoDanhMuc?: boolean;
  mucDoBienDong?: MucDoBienDong;
  ngayCapNhat: string;
}

/** Khoản nợ phải trả */
export interface KhoanNo {
  id: string;
  ten: string;
  loai: LoaiNo;
  duNo: number;
  laiSuatNam: number; // vd: 0.08 = 8%/năm
  traHangThang: number;
}

/** Mục tiêu tài chính */
export interface MucTieuTaiChinh {
  id: string;
  ten: string;
  loai: LoaiMucTieu;
  soTienDich: number;
  soTienHienCo: number;
  thoiHanThang: number;
  uuTien: MucUuTien;
  dongGopThang: number;
}

/** Bản ghi sổ thu chi */
export interface GiaoDichThuChi {
  id: string;
  ngay: string; // YYYY-MM-DD
  loai: LoaiGiaoDich;
  soTien: number;
  nhom: NhomChiTieu;
  danhMuc: string;
  ghiChu: string;
}

/** Lựa chọn cuộc đời / kịch bản */
export interface KichBanCuocDoi {
  maKichBan: 'nghi_viec_kinh_doanh' | 'lam_them_freelance' | 'sinh_con' | 'mua_nha_vay' | 'hoc_chuyen_nganh';
  ten: string;
  ngayBatDau: string;
  dangTheoDoi: boolean;
  cacBuocDaLam: string[];
}

/** Toàn bộ trạng thái ứng dụng được lưu trữ cô lập trên LocalStorage */
export interface AppState {
  phienBan: 1;
  idNguoiDung: string;
  hoSo: HoSoTaiChinh;
  danhSachTaiSan: KhoanTaiSan[];
  danhSachKhoanNo: KhoanNo[];
  danhSachMucTieu: MucTieuTaiChinh[];
  soThuChi: GiaoDichThuChi[];
  kichBan: KichBanCuocDoi[];
  caiDat: {
    ngonNgu: 'vi' | 'en' | 'zh';
    tienTe: 'VND' | 'USD' | 'CNY';
    nhacNhoChamTienDo: boolean;
    nhacNhoRuiRoTapTrung: boolean;
    nhacNhoHocTap: boolean;
  };
  ngayCapNhatCuoi: string;
}
