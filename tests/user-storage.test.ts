import { describe, it, expect, beforeEach } from 'vitest';
import {
  getUserData,
  saveUserData,
  exportUserData,
  importUserData,
  resetUserData,
  listUserProfiles,
  getActiveUserId,
  setActiveUserId,
  deleteUserData,
  createFixtureAData,
  createFixtureBData,
  createFixtureCData,
} from '../client/src/lib/storage';

// Mocking localStorage for Vitest node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('LocalStorage User Isolation & Data Management', () => {
  beforeEach(() => {
    (globalThis as any).localStorage.clear();
  });

  it('khởi tạo Canonical Fixture C với số liệu chuẩn SGK (Long - Kỹ sư AI)', () => {
    const data = createFixtureCData();
    expect(data.id).toBe('user_fixture_c');
    expect(data.finance.monthlyIncome).toBe(35_000_000);
    expect(data.finance.essentialExpense).toBe(14_000_000);
    expect(data.finance.monthlyExpense).toBe(22_000_000);
    expect(data.finance.emergencyTargetMonths).toBe(6);
    expect(data.finance.iscoCode).toBe('2512');
    expect(data.debts[0].balance).toBe(60_000_000);
    expect(data.holdings.find((h) => h.isEmployerStock)?.value).toBe(112_000_000);
  });

  it('khởi tạo Canonical Fixture A và B đúng các chỉ số mẫu', () => {
    const dataA = createFixtureAData();
    expect(dataA.id).toBe('user_fixture_a');
    expect(dataA.finance.monthlyIncome).toBe(28_500_000);
    expect(dataA.finance.emergencyTargetMonths).toBe(3);

    const dataB = createFixtureBData();
    expect(dataB.id).toBe('user_fixture_b');
    expect(dataB.finance.monthlyIncome).toBe(45_000_000);
    expect(dataB.debts[0].balance).toBe(120_000_000);
  });

  it('cô lập hoàn toàn dữ liệu giữa các người dùng trong LocalStorage', () => {
    // Lưu dữ liệu cho User A
    saveUserData('user_fixture_a', {
      finance: {
        monthlyIncome: 28_500_000,
        monthlyExpense: 21_000_000,
        essentialExpense: 14_000_000,
        emergencyTargetMonths: 3,
      },
    });

    // Lưu dữ liệu cho User B
    saveUserData('user_fixture_b', {
      finance: {
        monthlyIncome: 45_000_000,
        monthlyExpense: 32_000_000,
        essentialExpense: 20_000_000,
        emergencyTargetMonths: 6,
      },
    });

    const userA = getUserData('user_fixture_a');
    const userB = getUserData('user_fixture_b');

    expect(userA.finance.monthlyIncome).toBe(28_500_000);
    expect(userB.finance.monthlyIncome).toBe(45_000_000);
    expect(userA.finance.emergencyTargetMonths).toBe(3);
    expect(userB.finance.emergencyTargetMonths).toBe(6);
  });

  it('xuất và khôi phục (Export / Import) bản sao lưu JSON chuẩn xác', () => {
    getUserData('user_fixture_c');
    saveUserData('user_fixture_c', {
      fullName: 'Lê Hoàng Long (Đã chỉnh sửa)',
    });

    const exportedJson = exportUserData('user_fixture_c');
    expect(exportedJson).toContain('an-tam-backup-v1');
    expect(exportedJson).toContain('Lê Hoàng Long (Đã chỉnh sửa)');

    // Reset về mặc định
    resetUserData('user_fixture_c', 'fixture_c');
    expect(getUserData('user_fixture_c').fullName).toBe('Lê Hoàng Long (Kỹ sư AI)');

    // Khôi phục từ JSON
    const res = importUserData('user_fixture_c', exportedJson);
    expect(res.success).toBe(true);
    expect(getUserData('user_fixture_c').fullName).toBe('Lê Hoàng Long (Đã chỉnh sửa)');
  });

  it('xử lý an toàn khi import JSON lỗi hoặc không đúng cấu trúc (Fail-Closed)', () => {
    const res = importUserData('user_fixture_c', '{"invalid": "data"}');
    expect(res.success).toBe(false);
    expect(res.message).toContain('Định dạng file sao lưu không hợp lệ');
  });

  it('quản lý danh sách hồ sơ và chuyển đổi người dùng kích hoạt', () => {
    setActiveUserId('user_fixture_a');
    expect(getActiveUserId()).toBe('user_fixture_a');

    const profiles = listUserProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(3);
    expect(profiles.some((p) => p.id === 'user_fixture_a')).toBe(true);
    expect(profiles.some((p) => p.id === 'user_fixture_b')).toBe(true);
    expect(profiles.some((p) => p.id === 'user_fixture_c')).toBe(true);
  });

  it('xóa hồ sơ tài khoản an toàn không ảnh hưởng tài khoản khác', () => {
    getUserData('user_temp_123');
    saveUserData('user_temp_123', { fullName: 'Tài khoản tạm' });
    expect(getUserData('user_temp_123').fullName).toBe('Tài khoản tạm');

    deleteUserData('user_temp_123');
    // Khi xóa, tài khoản tạm bị xóa khỏi storage
    expect(listUserProfiles().some((p) => p.id === 'user_temp_123')).toBe(false);
  });
});
