import { describe, it, expect } from 'vitest';
import {
  HO_SO_MAU_C,
  HO_SO_MAU_A,
  HO_SO_MAU_B,
} from '../client/src/state/mau';
import {
  chonTongTaiSan,
  chonTongNo,
  chonTaiSanRong,
  chonSoThangAnToan,
  chonCoPhieuCongTy,
  chonRuiRoTapTrung,
  chonDiemAnTam,
  chonGiaTriNgheNghiep,
  chonDongTienThang,
} from '../client/src/state/chon';

describe('Kiến trúc State & Selectors Thuần Việt (Chuẩn nguyenvongai)', () => {
  it('tính toán chính xác các chỉ số tài sản của Fixture C (Long - Kỹ sư AI)', () => {
    const s = HO_SO_MAU_C;
    // Tổng tài sản = 84m + 32m + 112m + 128m + 48m = 404m
    expect(chonTongTaiSan(s)).toBe(404_000_000);
    // Tổng nợ = 60m
    expect(chonTongNo(s)).toBe(60_000_000);
    // Tài sản ròng = 404m - 60m = 344m
    expect(chonTaiSanRong(s)).toBe(344_000_000);
    // Quỹ an toàn = 84m / 14m thiết yếu = 6.0 tháng
    expect(chonSoThangAnToan(s)).toBeCloseTo(6.0, 1);
  });

  it('tính tỷ trọng cổ phiếu công ty và rủi ro tập trung của Fixture C', () => {
    const s = HO_SO_MAU_C;
    const cp = chonCoPhieuCongTy(s);
    expect(cp.giaTri).toBe(112_000_000);
    // Tài sản đầu tư = 32m + 112m + 128m + 48m = 320m
    // Tỷ trọng = 112 / 320 = 35%
    expect(cp.tyTrong).toBeCloseTo(0.35, 2);

    const rr = chonRuiRoTapTrung(s);
    expect(rr.careerOverlap).toBeGreaterThan(0.5); // ~60.59%
  });

  it('tính Điểm An Tâm và khả năng chịu đựng cho Fixture C', () => {
    const s = HO_SO_MAU_C;
    const diem = chonDiemAnTam(s);
    expect(diem.soThangHienTai).toBeCloseTo(6.0, 1);
    expect(diem.diemSo).toBeGreaterThan(60);
    expect(diem.muc).toBe('on_dinh');
  });

  it('tính giá trị nghề nghiệp theo mã ISCO-08 cho Fixture C (2512)', () => {
    const s = HO_SO_MAU_C;
    const nn = chonGiaTriNgheNghiep(s);
    expect(nn.maNghe).toBe('2512');
    expect(nn.nhomIlo).toBe('G3');
    expect(nn.tiLeRuiRoAi).toBe(0.04);
    expect(nn.giaTriSucLaoDong).toBeGreaterThan(1_000_000_000);
  });

  it('tính dòng tiền hàng tháng và khả năng để dành sau nợ', () => {
    const s = HO_SO_MAU_C;
    const dt = chonDongTienThang(s);
    expect(dt.thuNhap).toBe(35_000_000);
    expect(dt.chiTieu).toBe(22_000_000);
    expect(dt.traNo).toBe(2_000_000);
    // Thực nhận sau chi và trả nợ = 35 - 22 - 2 = 11tr
    expect(dt.thucNhan).toBe(11_000_000);
    expect(dt.tyLeTietKiem).toBeCloseTo(11 / 35, 2);
  });

  it('xác minh tính đúng đắn của Fixture A (Khởi nghiệp)', () => {
    const s = HO_SO_MAU_A;
    expect(chonTongTaiSan(s)).toBe(100_000_000); // 45 + 30 + 25
    expect(chonTongNo(s)).toBe(0);
    expect(chonSoThangAnToan(s)).toBeCloseTo(45 / 14, 1);
  });

  it('xác minh tính đúng đắn của Fixture B (Hộ kinh doanh)', () => {
    const s = HO_SO_MAU_B;
    expect(chonTongTaiSan(s)).toBe(300_000_000); // 90 + 150 + 60
    expect(chonTongNo(s)).toBe(120_000_000);
    expect(chonTaiSanRong(s)).toBe(180_000_000);
  });
});
