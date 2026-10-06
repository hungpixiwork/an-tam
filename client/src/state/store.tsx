// Reactive Store trung tâm lưu trên máy (LocalStorage) theo kiến trúc nguyenvongai.
// Toàn bộ dữ liệu nằm trên thiết bị: không giật lag, không phụ thuộc mạng, phản hồi UI < 16ms.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type {
  AppState,
  HoSoTaiChinh,
  KhoanTaiSan,
  KhoanNo,
  MucTieuTaiChinh,
  GiaoDichThuChi,
  KichBanCuocDoi,
} from './types';
import { HO_SO_MAU_A, HO_SO_MAU_B, HO_SO_MAU_C, TRANG_THAI_BAN_DAU } from './mau';

const KHOA_LUU_TRU = 'antam:app:v1';

let demId = 0;
const taoIdMoi = (tienTo: string) => `${tienTo}_${Date.now().toString(36)}_${(demId++).toString(36)}`;

function doc(): AppState {
  if (typeof window === 'undefined') return TRANG_THAI_BAN_DAU;
  try {
    const raw = localStorage.getItem(KHOA_LUU_TRU);
    if (raw) {
      const daLuu = JSON.parse(raw) as Partial<AppState>;
      if (daLuu && daLuu.phienBan === 1 && daLuu.hoSo) {
        return {
          ...TRANG_THAI_BAN_DAU,
          ...daLuu,
          hoSo: { ...TRANG_THAI_BAN_DAU.hoSo, ...daLuu.hoSo },
          caiDat: { ...TRANG_THAI_BAN_DAU.caiDat, ...(daLuu.caiDat || {}) },
        };
      }
    }
  } catch (err) {
    console.warn('[LocalStorage] Lỗi đọc state, chuyển về mặc định:', err);
  }
  return TRANG_THAI_BAN_DAU;
}

function luu(s: AppState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KHOA_LUU_TRU, JSON.stringify(s));
  } catch (err) {
    console.error('[LocalStorage] Lỗi ghi state:', err);
  }
}

export interface AppCtxValue {
  state: AppState;
  /** Cập nhật thông tin hồ sơ tài chính cá nhân */
  capNhatHoSo: (p: Partial<HoSoTaiChinh>) => void;
  /** Thêm tài sản đầu tư hoặc tiền mặt */
  themTaiSan: (ts: Omit<KhoanTaiSan, 'id' | 'ngayCapNhat'>) => void;
  /** Sửa giá trị hoặc thuộc tính tài sản */
  suaTaiSan: (id: string, ts: Partial<KhoanTaiSan>) => void;
  /** Xóa một tài sản */
  xoaTaiSan: (id: string) => void;
  /** Thêm khoản nợ phải trả */
  themKhoanNo: (no: Omit<KhoanNo, 'id'>) => void;
  /** Xóa khoản nợ */
  xoaKhoanNo: (id: string) => void;
  /** Thêm mục tiêu tài chính */
  themMucTieu: (mt: Omit<MucTieuTaiChinh, 'id'>) => void;
  /** Cập nhật mục tiêu tài chính */
  suaMucTieu: (id: string, mt: Partial<MucTieuTaiChinh>) => void;
  /** Xóa mục tiêu */
  xoaMucTieu: (id: string) => void;
  /** Ghi giao dịch thu hoặc chi vào sổ */
  themGiaoDich: (gd: Omit<GiaoDichThuChi, 'id'>) => void;
  /** Xóa giao dịch thu chi */
  xoaGiaoDich: (id: string) => void;
  /** Cập nhật danh sách kịch bản cuộc đời */
  datKichBan: (ds: KichBanCuocDoi[]) => void;
  /** Cập nhật cài đặt giao diện / thông báo */
  capNhatCaiDat: (cd: Partial<AppState['caiDat']>) => void;
  /** Nạp hồ sơ mẫu chuẩn hóa (Fixture A, B hoặc C) */
  napHoSoMau: (loai: 'fixture_a' | 'fixture_b' | 'fixture_c') => void;
  /** Xuất bản sao lưu dữ liệu toàn phần dạng file JSON */
  xuatJson: () => string;
  /** Khôi phục toàn bộ trạng thái từ chuỗi JSON */
  nhapJson: (chuoiJson: string) => { thanhCong: boolean; thongBao: string };
  /** Đặt lại trạng thái về ban đầu */
  datLaiTrangThai: () => void;
}

const AppContext = createContext<AppCtxValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(doc);

  useEffect(() => {
    luu(state);
  }, [state]);

  const capNhatHoSo = useCallback((p: Partial<HoSoTaiChinh>) => {
    setState((s) => ({
      ...s,
      hoSo: { ...s.hoSo, ...p },
      ngayCapNhatCuoi: new Date().toISOString(),
    }));
  }, []);

  const themTaiSan = useCallback((ts: Omit<KhoanTaiSan, 'id' | 'ngayCapNhat'>) => {
    const moi: KhoanTaiSan = {
      ...ts,
      id: taoIdMoi('ts'),
      ngayCapNhat: new Date().toISOString().slice(0, 10),
    };
    setState((s) => ({
      ...s,
      danhSachTaiSan: [moi, ...s.danhSachTaiSan],
      ngayCapNhatCuoi: new Date().toISOString(),
    }));
  }, []);

  const suaTaiSan = useCallback((id: string, ts: Partial<KhoanTaiSan>) => {
    setState((s) => ({
      ...s,
      danhSachTaiSan: s.danhSachTaiSan.map((item) =>
        item.id === id ? { ...item, ...ts, ngayCapNhat: new Date().toISOString().slice(0, 10) } : item,
      ),
      ngayCapNhatCuoi: new Date().toISOString(),
    }));
  }, []);

  const xoaTaiSan = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      danhSachTaiSan: s.danhSachTaiSan.filter((item) => item.id !== id),
      ngayCapNhatCuoi: new Date().toISOString(),
    }));
  }, []);

  const themKhoanNo = useCallback((no: Omit<KhoanNo, 'id'>) => {
    const moi: KhoanNo = { ...no, id: taoIdMoi('no') };
    setState((s) => ({
      ...s,
      danhSachKhoanNo: [...s.danhSachKhoanNo, moi],
      ngayCapNhatCuoi: new Date().toISOString(),
    }));
  }, []);

  const xoaKhoanNo = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      danhSachKhoanNo: s.danhSachKhoanNo.filter((item) => item.id !== id),
      ngayCapNhatCuoi: new Date().toISOString(),
    }));
  }, []);

  const themMucTieu = useCallback((mt: Omit<MucTieuTaiChinh, 'id'>) => {
    const moi: MucTieuTaiChinh = { ...mt, id: taoIdMoi('mt') };
    setState((s) => ({
      ...s,
      danhSachMucTieu: [...s.danhSachMucTieu, moi],
      ngayCapNhatCuoi: new Date().toISOString(),
    }));
  }, []);

  const suaMucTieu = useCallback((id: string, mt: Partial<MucTieuTaiChinh>) => {
    setState((s) => ({
      ...s,
      danhSachMucTieu: s.danhSachMucTieu.map((item) => (item.id === id ? { ...item, ...mt } : item)),
      ngayCapNhatCuoi: new Date().toISOString(),
    }));
  }, []);

  const xoaMucTieu = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      danhSachMucTieu: s.danhSachMucTieu.filter((item) => item.id !== id),
      ngayCapNhatCuoi: new Date().toISOString(),
    }));
  }, []);

  const themGiaoDich = useCallback((gd: Omit<GiaoDichThuChi, 'id'>) => {
    const moi: GiaoDichThuChi = { ...gd, id: taoIdMoi('tc') };
    setState((s) => ({
      ...s,
      soThuChi: [moi, ...s.soThuChi],
      ngayCapNhatCuoi: new Date().toISOString(),
    }));
  }, []);

  const xoaGiaoDich = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      soThuChi: s.soThuChi.filter((item) => item.id !== id),
      ngayCapNhatCuoi: new Date().toISOString(),
    }));
  }, []);

  const datKichBan = useCallback((ds: KichBanCuocDoi[]) => {
    setState((s) => ({ ...s, kichBan: ds, ngayCapNhatCuoi: new Date().toISOString() }));
  }, []);

  const capNhatCaiDat = useCallback((cd: Partial<AppState['caiDat']>) => {
    setState((s) => ({ ...s, caiDat: { ...s.caiDat, ...cd } }));
  }, []);

  const napHoSoMau = useCallback((loai: 'fixture_a' | 'fixture_b' | 'fixture_c') => {
    let mau: AppState;
    if (loai === 'fixture_a') mau = HO_SO_MAU_A;
    else if (loai === 'fixture_b') mau = HO_SO_MAU_B;
    else mau = HO_SO_MAU_C;

    const moi: AppState = { ...mau, ngayCapNhatCuoi: new Date().toISOString() };
    setState(moi);
    luu(moi);
  }, []);

  const xuatJson = useCallback((): string => {
    return JSON.stringify(
      {
        duAn: 'an-tam-ai',
        phienBanSchema: 'v1',
        xuatLuc: new Date().toISOString(),
        duLieu: state,
      },
      null,
      2,
    );
  }, [state]);

  const nhapJson = useCallback((chuoiJson: string): { thanhCong: boolean; thongBao: string } => {
    try {
      const parsed = JSON.parse(chuoiJson);
      if (!parsed || parsed.duAn !== 'an-tam-ai' || !parsed.duLieu?.hoSo) {
        return { thanhCong: false, thongBao: 'File sao lưu không đúng định dạng chuẩn An Tâm AI.' };
      }
      const moi: AppState = {
        ...TRANG_THAI_BAN_DAU,
        ...parsed.duLieu,
        ngayCapNhatCuoi: new Date().toISOString(),
      };
      setState(moi);
      luu(moi);
      return { thanhCong: true, thongBao: 'Khôi phục dữ liệu tài chính cá nhân thành công!' };
    } catch (err: any) {
      return { thanhCong: false, thongBao: `Lỗi đọc file: ${err.message || 'Dữ liệu không hợp lệ'}` };
    }
  }, []);

  const datLaiTrangThai = useCallback(() => {
    setState(TRANG_THAI_BAN_DAU);
    luu(TRANG_THAI_BAN_DAU);
  }, []);

  const value: AppCtxValue = {
    state,
    capNhatHoSo,
    themTaiSan,
    suaTaiSan,
    xoaTaiSan,
    themKhoanNo,
    xoaKhoanNo,
    themMucTieu,
    suaMucTieu,
    xoaMucTieu,
    themGiaoDich,
    xoaGiaoDich,
    datKichBan,
    capNhatCaiDat,
    napHoSoMau,
    xuatJson,
    nhapJson,
    datLaiTrangThai,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppCtxValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp phải nằm trong <AppProvider>');
  return ctx;
}
