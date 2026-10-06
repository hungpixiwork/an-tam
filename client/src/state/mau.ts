// Các bộ hồ sơ mẫu chuẩn hóa (Canonical Fixtures) cho An Tâm AI.

import type { AppState, HoSoTaiChinh } from './types';

const NGAY_MAU = '2026-10-01';

/** Hồ sơ rỗng an toàn */
export const HO_SO_TRONG: HoSoTaiChinh = {
  id: 'nguoi_dung_moi',
  hoTen: 'Người dùng mới',
  email: 'nguoidung@antam.vn',
  xungHo: 'bạn',
  namSinh: 1998,
  tuoiNghiHuu: 65,
  thuNhapThang: 0,
  chiTieuThang: 0,
  chiTieuThietYeu: 0,
  soThangDuPhongMucTieu: 6,
  maNgheIsco: '2512',
  nganhNghe: 'technology',
  soGioHocTuan: 0,
  tyLeTietKiemMucTieu: 0.2,
};

/**
 * Fixture C: Lê Hoàng Long (Kỹ sư AI / Lập trình phần mềm)
 * - Thu nhập: 35.0 triệu/tháng
 * - Chi tiêu: 22.0 triệu/tháng (Chi thiết yếu: 14.0 triệu/tháng)
 * - Quỹ dự phòng: 84.0 triệu = 6.0 tháng chi tiêu thiết yếu
 * - Tiền mặt đầu tư: 32.0 triệu
 * - Cổ phiếu công ty FPT: 112.0 triệu (Công nghệ)
 * - Quỹ ETF toàn cầu SWDA: 128.0 triệu
 * - Trái phiếu an toàn: 48.0 triệu
 * - Khoản nợ mua sắm: 60.0 triệu (Trả 2.0 triệu/tháng)
 * - Mục tiêu mua nhà: Đã có 180 triệu, đích 500 triệu sau 36 tháng
 * - Tổng tài sản: 404 triệu, Tài sản ròng: 344 triệu
 */
export const HO_SO_MAU_C: AppState = {
  phienBan: 1,
  idNguoiDung: 'ho_so_fixture_c',
  hoSo: {
    id: 'user_long_ai',
    hoTen: 'Lê Hoàng Long (Kỹ sư AI)',
    email: 'long.le@antam.vn',
    xungHo: 'anh',
    namSinh: 1996,
    tuoiNghiHuu: 65,
    thuNhapThang: 35_000_000,
    chiTieuThang: 22_000_000,
    chiTieuThietYeu: 14_000_000,
    soThangDuPhongMucTieu: 6,
    maNgheIsco: '2512',
    nganhNghe: 'technology',
    soGioHocTuan: 6,
    tyLeTietKiemMucTieu: 0.35,
  },
  danhSachTaiSan: [
    {
      id: 'ts_c1',
      ten: 'Quỹ an toàn (Tiền gửi linh hoạt)',
      loai: 'tien_mat',
      nganh: 'finance',
      giaTri: 84_000_000,
      tinhVaoDanhMuc: false,
      mucDoBienDong: 'thap',
      ngayCapNhat: NGAY_MAU,
    },
    {
      id: 'ts_c2',
      ten: 'Tiền mặt đầu tư',
      loai: 'tien_mat',
      nganh: 'finance',
      giaTri: 32_000_000,
      tinhVaoDanhMuc: true,
      mucDoBienDong: 'thap',
      ngayCapNhat: NGAY_MAU,
    },
    {
      id: 'ts_c3',
      ten: 'Cổ phiếu công ty FPT (ESOP)',
      loai: 'co_phieu',
      nganh: 'technology',
      giaTri: 112_000_000,
      laCoPhieuCongTy: true,
      tinhVaoDanhMuc: true,
      mucDoBienDong: 'cao',
      ngayCapNhat: NGAY_MAU,
    },
    {
      id: 'ts_c4',
      ten: 'Quỹ ETF toàn cầu iShares (SWDA)',
      loai: 'quy_dau_tu',
      nganh: 'other',
      giaTri: 128_000_000,
      tinhVaoDanhMuc: true,
      mucDoBienDong: 'trung_binh',
      ngayCapNhat: NGAY_MAU,
    },
    {
      id: 'ts_c5',
      ten: 'Trái phiếu doanh nghiệp uy tín',
      loai: 'trai_phieu',
      nganh: 'finance',
      giaTri: 48_000_000,
      tinhVaoDanhMuc: true,
      mucDoBienDong: 'thap',
      ngayCapNhat: NGAY_MAU,
    },
  ],
  danhSachKhoanNo: [
    {
      id: 'no_c1',
      ten: 'Khoản vay trả góp tiêu dùng',
      loai: 'tieu_dung',
      duNo: 60_000_000,
      laiSuatNam: 0.08,
      traHangThang: 2_000_000,
    },
  ],
  danhSachMucTieu: [
    {
      id: 'mt_c1',
      ten: 'Quỹ an toàn 6 tháng',
      loai: 'quy_an_toan',
      soTienDich: 84_000_000,
      soTienHienCo: 84_000_000,
      thoiHanThang: 6,
      uuTien: 'rat_cao',
      dongGopThang: 0,
    },
    {
      id: 'mt_c2',
      ten: 'Tích lũy mua nhà',
      loai: 'mua_nha',
      soTienDich: 500_000_000,
      soTienHienCo: 180_000_000,
      thoiHanThang: 36,
      uuTien: 'cao',
      dongGopThang: 6_000_000,
    },
  ],
  soThuChi: [
    { id: 'tc_c1', ngay: '2026-09-01', loai: 'thu', soTien: 35_000_000, nhom: 'thiet_yeu', danhMuc: 'Lương kỹ sư AI', ghiChu: 'Lương tháng 09' },
    { id: 'tc_c2', ngay: '2026-09-05', loai: 'chi', soTien: 7_000_000, nhom: 'thiet_yeu', danhMuc: 'Tiền thuê nhà & dịch vụ', ghiChu: 'Nhà ở' },
    { id: 'tc_c3', ngay: '2026-09-10', loai: 'chi', soTien: 4_000_000, nhom: 'thiet_yeu', danhMuc: 'Ăn uống sinh hoạt', ghiChu: 'Siêu thị' },
    { id: 'tc_c4', ngay: '2026-09-15', loai: 'chi', soTien: 2_000_000, nhom: 'tra_no', danhMuc: 'Trả góp xe', ghiChu: 'Gốc + lãi' },
    { id: 'tc_c5', ngay: '2026-09-20', loai: 'chi', soTien: 3_000_000, nhom: 'thiet_yeu', danhMuc: 'Hóa đơn & tiện ích', ghiChu: 'Điện nước net' },
    { id: 'tc_c6', ngay: '2026-09-25', loai: 'chi', soTien: 6_000_000, nhom: 'linh_hoat', danhMuc: 'Phát triển bản thân & giải trí', ghiChu: 'Học tập' },
  ],
  kichBan: [
    {
      maKichBan: 'lam_them_freelance',
      ten: 'Nhận thêm dự án tư vấn AI ngoài giờ',
      ngayBatDau: '2026-08-01',
      dangTheoDoi: true,
      cacBuocDaLam: ['lap_portfolio', 'tim_khach_hang_dau_tien'],
    },
  ],
  caiDat: {
    ngonNgu: 'vi',
    tienTe: 'VND',
    nhacNhoChamTienDo: true,
    nhacNhoRuiRoTapTrung: true,
    nhacNhoHocTap: true,
  },
  ngayCapNhatCuoi: NGAY_MAU,
};

/**
 * Fixture A: Nguyễn Văn Minh (Khởi nghiệp / Công nghệ)
 */
export const HO_SO_MAU_A: AppState = {
  phienBan: 1,
  idNguoiDung: 'ho_so_fixture_a',
  hoSo: {
    id: 'user_minh_startup',
    hoTen: 'Nguyễn Văn Minh (Khởi nghiệp)',
    email: 'minh.nguyen@antam.vn',
    xungHo: 'anh',
    namSinh: 1998,
    tuoiNghiHuu: 65,
    thuNhapThang: 28_500_000,
    chiTieuThang: 21_000_000,
    chiTieuThietYeu: 14_000_000,
    soThangDuPhongMucTieu: 3,
    maNgheIsco: '2511',
    nganhNghe: 'technology',
    soGioHocTuan: 5,
    tyLeTietKiemMucTieu: 0.25,
  },
  danhSachTaiSan: [
    {
      id: 'ts_a1',
      ten: 'Tiền mặt & Quỹ khẩn cấp',
      loai: 'tien_mat',
      nganh: 'finance',
      giaTri: 45_000_000,
      tinhVaoDanhMuc: false,
      mucDoBienDong: 'thap',
      ngayCapNhat: NGAY_MAU,
    },
    {
      id: 'ts_a2',
      ten: 'Quỹ mở cân bằng VEOF',
      loai: 'quy_dau_tu',
      nganh: 'finance',
      giaTri: 30_000_000,
      tinhVaoDanhMuc: true,
      mucDoBienDong: 'trung_binh',
      ngayCapNhat: NGAY_MAU,
    },
    {
      id: 'ts_a3',
      ten: 'Cổ phiếu công nghệ',
      loai: 'co_phieu',
      nganh: 'technology',
      giaTri: 25_000_000,
      tinhVaoDanhMuc: true,
      mucDoBienDong: 'cao',
      ngayCapNhat: NGAY_MAU,
    },
  ],
  danhSachKhoanNo: [],
  danhSachMucTieu: [
    {
      id: 'mt_a1',
      ten: 'Quỹ an toàn 3 tháng',
      loai: 'quy_an_toan',
      soTienDich: 42_000_000,
      soTienHienCo: 45_000_000,
      thoiHanThang: 3,
      uuTien: 'rat_cao',
      dongGopThang: 0,
    },
    {
      id: 'mt_a2',
      ten: 'Nâng cấp thiết bị làm việc',
      loai: 'khac',
      soTienDich: 50_000_000,
      soTienHienCo: 15_000_000,
      thoiHanThang: 12,
      uuTien: 'cao',
      dongGopThang: 3_000_000,
    },
  ],
  soThuChi: [
    { id: 'tc_a1', ngay: '2026-09-01', loai: 'thu', soTien: 28_500_000, nhom: 'thiet_yeu', danhMuc: 'Thu nhập chính', ghiChu: 'Lương tháng 09' },
    { id: 'tc_a2', ngay: '2026-09-05', loai: 'chi', soTien: 6_000_000, nhom: 'thiet_yeu', danhMuc: 'Tiền nhà', ghiChu: 'Tiền phòng' },
    { id: 'tc_a3', ngay: '2026-09-10', loai: 'chi', soTien: 5_000_000, nhom: 'thiet_yeu', danhMuc: 'Ăn uống', ghiChu: 'Nhu yếu phẩm' },
    { id: 'tc_a4', ngay: '2026-09-15', loai: 'chi', soTien: 4_000_000, nhom: 'thiet_yeu', danhMuc: 'Xăng xe & liên lạc', ghiChu: 'Đi lại' },
    { id: 'tc_a5', ngay: '2026-09-20', loai: 'chi', soTien: 6_000_000, nhom: 'linh_hoat', danhMuc: 'Gặp gỡ đối tác', ghiChu: 'Networking' },
  ],
  kichBan: [],
  caiDat: {
    ngonNgu: 'vi',
    tienTe: 'VND',
    nhacNhoChamTienDo: true,
    nhacNhoRuiRoTapTrung: true,
    nhacNhoHocTap: true,
  },
  ngayCapNhatCuoi: NGAY_MAU,
};

/**
 * Fixture B: Trần Thị Hương (Hộ kinh doanh / Bán lẻ)
 */
export const HO_SO_MAU_B: AppState = {
  phienBan: 1,
  idNguoiDung: 'ho_so_fixture_b',
  hoSo: {
    id: 'user_huong_kinhdoanh',
    hoTen: 'Trần Thị Hương (Hộ kinh doanh)',
    email: 'huong.tran@antam.vn',
    xungHo: 'chị',
    namSinh: 1992,
    tuoiNghiHuu: 60,
    thuNhapThang: 45_000_000,
    chiTieuThang: 32_000_000,
    chiTieuThietYeu: 20_000_000,
    soThangDuPhongMucTieu: 6,
    maNgheIsco: '2413',
    nganhNghe: 'consumer',
    soGioHocTuan: 3,
    tyLeTietKiemMucTieu: 0.2,
  },
  danhSachTaiSan: [
    {
      id: 'ts_b1',
      ten: 'Tiền mặt & Quỹ khẩn cấp kinh doanh',
      loai: 'tien_mat',
      nganh: 'finance',
      giaTri: 90_000_000,
      tinhVaoDanhMuc: false,
      mucDoBienDong: 'thap',
      ngayCapNhat: NGAY_MAU,
    },
    {
      id: 'ts_b2',
      ten: 'Hàng tồn kho & trang thiết bị quầy hàng',
      loai: 'khac',
      nganh: 'consumer',
      giaTri: 150_000_000,
      tinhVaoDanhMuc: true,
      mucDoBienDong: 'trung_binh',
      ngayCapNhat: NGAY_MAU,
    },
    {
      id: 'ts_b3',
      ten: 'Vàng nhẫn tròn trơn SJC',
      loai: 'khac',
      nganh: 'finance',
      giaTri: 60_000_000,
      tinhVaoDanhMuc: true,
      mucDoBienDong: 'thap',
      ngayCapNhat: NGAY_MAU,
    },
  ],
  danhSachKhoanNo: [
    {
      id: 'no_b1',
      ten: 'Khoản vay vốn lưu động kinh doanh',
      loai: 'kinh_doanh',
      duNo: 120_000_000,
      laiSuatNam: 0.09,
      traHangThang: 8_500_000,
    },
  ],
  danhSachMucTieu: [
    {
      id: 'mt_b1',
      ten: 'Quỹ an toàn 6 tháng',
      loai: 'quy_an_toan',
      soTienDich: 120_000_000,
      soTienHienCo: 90_000_000,
      thoiHanThang: 12,
      uuTien: 'rat_cao',
      dongGopThang: 2_500_000,
    },
    {
      id: 'mt_b2',
      ten: 'Mở rộng quầy bán lẻ thứ 2',
      loai: 'khac',
      soTienDich: 200_000_000,
      soTienHienCo: 40_000_000,
      thoiHanThang: 24,
      uuTien: 'cao',
      dongGopThang: 5_000_000,
    },
  ],
  soThuChi: [
    { id: 'tc_b1', ngay: '2026-09-01', loai: 'thu', soTien: 45_000_000, nhom: 'thiet_yeu', danhMuc: 'Doanh thu bán lẻ', ghiChu: 'Doanh thu tháng 09' },
    { id: 'tc_b2', ngay: '2026-09-05', loai: 'chi', soTien: 15_000_000, nhom: 'thiet_yeu', danhMuc: 'Nhập hàng', ghiChu: 'Hàng tiêu dùng' },
    { id: 'tc_b3', ngay: '2026-09-10', loai: 'chi', soTien: 8_500_000, nhom: 'tra_no', danhMuc: 'Trả nợ ngân hàng', ghiChu: 'Vay kinh doanh' },
    { id: 'tc_b4', ngay: '2026-09-15', loai: 'chi', soTien: 8_500_000, nhom: 'thiet_yeu', danhMuc: 'Chi tiêu gia đình', ghiChu: 'Sinh hoạt' },
  ],
  kichBan: [
    {
      maKichBan: 'nghi_viec_kinh_doanh',
      ten: 'Chuyển sang chuỗi cửa hàng tự động',
      ngayBatDau: '2026-07-01',
      dangTheoDoi: true,
      cacBuocDaLam: ['nghien_cuu_mat_bang'],
    },
  ],
  caiDat: {
    ngonNgu: 'vi',
    tienTe: 'VND',
    nhacNhoChamTienDo: true,
    nhacNhoRuiRoTapTrung: true,
    nhacNhoHocTap: false,
  },
  ngayCapNhatCuoi: NGAY_MAU,
};

/** Mặc định ban đầu của ứng dụng: Fixture C (Long - Kỹ sư AI) */
export const TRANG_THAI_BAN_DAU: AppState = HO_SO_MAU_C;
