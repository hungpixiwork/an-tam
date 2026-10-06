import type { UserProfileData, BackupPayload } from './types';
import { FIXTURE_C_PROFILE, FIXTURE_C_HOLDINGS, FIXTURE_C_GOALS, FIXTURE_C_LIABILITIES } from '../../../../shared/data/canonicalFixtures';
import type { Holding, Goal, Liability } from '../../../../shared/types/domain';

const STORAGE_PREFIX = 'antam:user:';
const ACTIVE_USER_KEY = 'antam:active_user_id';
const USER_PROFILES_INDEX_KEY = 'antam:user_profiles_index';

interface LocalStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getStorage(): LocalStorageLike | null {
  const g = globalThis as any;
  if (typeof g !== 'undefined' && g.localStorage) {
    return g.localStorage;
  }
  return null;
}

function dispatchCustomEvent(name: string, detail: any) {
  const g = globalThis as any;
  if (typeof g.window !== 'undefined' && typeof g.window.dispatchEvent === 'function') {
    try {
      g.window.dispatchEvent(new CustomEvent(name, { detail }));
    } catch {
      // Ignore in non-browser environments
    }
  }
}

/** Khởi tạo dữ liệu người dùng từ Canonical Fixture A (Khởi nghiệp) */
export function createFixtureAData(): UserProfileData {
  const now = new Date().toISOString();
  return {
    version: 1,
    id: 'user_fixture_a',
    email: 'minh.nguyen@antam.vn',
    fullName: 'Nguyễn Văn Minh (Khởi nghiệp)',
    salutation: 'anh',
    createdAt: now,
    updatedAt: now,
    finance: {
      monthlyIncome: 28_500_000,
      monthlyExpense: 21_000_000,
      essentialExpense: 14_000_000,
      emergencyTargetMonths: 3,
      targetSavingsRate: 0.25,
      iscoCode: '2511',
      careerYears: 30,
      careerGrowthRate: 0.05,
      learningHoursWeekly: 5,
    },
    holdings: [
      {
        id: 'h_a1',
        name: 'Tiền mặt & gửi tiết kiệm',
        category: 'cash',
        sector: 'finance',
        value: 45_000_000,
        isInPortfolio: false,
      },
      {
        id: 'h_a2',
        name: 'Quỹ mở cân bằng VEOF',
        category: 'fund',
        sector: 'finance',
        value: 30_000_000,
        isInPortfolio: true,
      },
      {
        id: 'h_a3',
        name: 'Cổ phiếu công nghệ',
        category: 'stock',
        sector: 'technology',
        value: 25_000_000,
        isInPortfolio: true,
      },
    ],
    debts: [],
    goals: [
      {
        id: 'g_a1',
        title: 'Quỹ an toàn 3 tháng',
        category: 'emergency',
        targetAmount: 42_000_000,
        currentAmount: 45_000_000,
        deadlineMonths: 6,
        priority: 'critical',
      },
      {
        id: 'g_a2',
        title: 'Nâng cấp máy tính & phương tiện',
        category: 'custom',
        targetAmount: 50_000_000,
        currentAmount: 15_000_000,
        deadlineMonths: 12,
        priority: 'important',
      },
    ],
    ledger: [
      { id: 'l_a1', occurredOn: '2026-03-01', amount: 28_500_000, type: 'income', category: 'salary', note: 'Lương tháng 03' },
      { id: 'l_a2', occurredOn: '2026-03-05', amount: 6_000_000, type: 'expense', category: 'rent', note: 'Tiền thuê nhà & dịch vụ' },
      { id: 'l_a3', occurredOn: '2026-03-10', amount: 5_000_000, type: 'expense', category: 'food', note: 'Ăn uống & sinh hoạt' },
      { id: 'l_a4', occurredOn: '2026-03-15', amount: 3_000_000, type: 'expense', category: 'transport', note: 'Đi lại & xăng xe' },
      { id: 'l_a5', occurredOn: '2026-03-20', amount: 4_000_000, type: 'expense', category: 'bills', note: 'Điện nước, internet, điện thoại' },
      { id: 'l_a6', occurredOn: '2026-03-25', amount: 3_000_000, type: 'expense', category: 'personal', note: 'Mua sắm cá nhân' },
    ],
    activeChoices: [
      { choiceKey: 'freelance', startedAt: '2026-01-15' },
    ],
    settings: {
      locale: 'vi',
      currency: 'VND',
      notifyGoalDelay: true,
      notifyPortfolioRisk: true,
      notifyWeeklyEmail: true,
      notifyCommunityLessons: true,
    },
  };
}

/** Khởi tạo dữ liệu người dùng từ Canonical Fixture B (Hộ kinh doanh) */
export function createFixtureBData(): UserProfileData {
  const now = new Date().toISOString();
  return {
    version: 1,
    id: 'user_fixture_b',
    email: 'huong.tran@antam.vn',
    fullName: 'Trần Thị Hương (Hộ kinh doanh)',
    salutation: 'chị',
    createdAt: now,
    updatedAt: now,
    finance: {
      monthlyIncome: 45_000_000,
      monthlyExpense: 32_000_000,
      essentialExpense: 20_000_000,
      emergencyTargetMonths: 6,
      targetSavingsRate: 0.20,
      iscoCode: '2413',
      careerYears: 25,
      careerGrowthRate: 0.04,
      learningHoursWeekly: 3,
    },
    holdings: [
      {
        id: 'h_b1',
        name: 'Tiền mặt & Quỹ khẩn cấp',
        category: 'cash',
        sector: 'finance',
        value: 90_000_000,
        isInPortfolio: false,
      },
      {
        id: 'h_b2',
        name: 'Hàng tồn kho & thiết bị',
        category: 'other',
        sector: 'consumer',
        value: 150_000_000,
        isInPortfolio: true,
      },
      {
        id: 'h_b3',
        name: 'Vàng nhẫn SJC tích lũy',
        category: 'other',
        sector: 'finance',
        value: 60_000_000,
        isInPortfolio: true,
      },
    ],
    debts: [
      {
        id: 'd_b1',
        name: 'Vay vốn kinh doanh ngân hàng',
        balance: 120_000_000,
        interestRate: 0.09,
        monthlyPayment: 8_500_000,
      },
    ],
    goals: [
      {
        id: 'g_b1',
        title: 'Quỹ an toàn 6 tháng',
        category: 'emergency',
        targetAmount: 120_000_000,
        currentAmount: 90_000_000,
        deadlineMonths: 12,
        priority: 'critical',
      },
      {
        id: 'g_b2',
        title: 'Mở rộng điểm bán lẻ thứ hai',
        category: 'custom',
        targetAmount: 200_000_000,
        currentAmount: 40_000_000,
        deadlineMonths: 24,
        priority: 'important',
      },
    ],
    ledger: [
      { id: 'l_b1', occurredOn: '2026-03-01', amount: 45_000_000, type: 'income', category: 'freelance', note: 'Doanh thu kinh doanh tháng 03' },
      { id: 'l_b2', occurredOn: '2026-03-05', amount: 15_000_000, type: 'expense', category: 'bills', note: 'Nhập hàng hóa' },
      { id: 'l_b3', occurredOn: '2026-03-10', amount: 8_500_000, type: 'expense', category: 'debt_payment', note: 'Trả nợ gốc & lãi vay' },
      { id: 'l_b4', occurredOn: '2026-03-15', amount: 8_500_000, type: 'expense', category: 'food', note: 'Chi tiêu sinh hoạt gia đình' },
    ],
    activeChoices: [
      { choiceKey: 'business', startedAt: '2026-02-01' },
    ],
    settings: {
      locale: 'vi',
      currency: 'VND',
      notifyGoalDelay: true,
      notifyPortfolioRisk: true,
      notifyWeeklyEmail: false,
      notifyCommunityLessons: true,
    },
  };
}

/** Khởi tạo dữ liệu người dùng từ Canonical Fixture C (Kỹ sư AI / Lập trình) */
export function createFixtureCData(): UserProfileData {
  const now = new Date().toISOString();
  return {
    version: 1,
    id: 'user_fixture_c',
    email: 'long.le@antam.vn',
    fullName: 'Lê Hoàng Long (Kỹ sư AI)',
    salutation: 'anh',
    createdAt: now,
    updatedAt: now,
    finance: {
      monthlyIncome: 35_000_000,
      monthlyExpense: 22_000_000,
      essentialExpense: FIXTURE_C_PROFILE.essentialExpense || 14_000_000,
      emergencyTargetMonths: FIXTURE_C_PROFILE.emergencyTargetMonths,
      targetSavingsRate: 0.35,
      iscoCode: '2512', // Lập trình phần mềm G3 pi=4%
      careerYears: 28,
      careerGrowthRate: 0.06,
      learningHoursWeekly: 6,
    },
    holdings: FIXTURE_C_HOLDINGS.map((h: Holding, i: number) => ({
      id: h.id || `h_c_${i}`,
      name: h.name,
      category: h.category as any,
      sector: (h.sector as any) || 'finance',
      value: h.value,
      isEmployerStock: h.isEmployerStock,
      isInPortfolio: h.inPortfolio,
    })),
    debts: FIXTURE_C_LIABILITIES.map((l: Liability, i: number) => ({
      id: l.id || `d_c_${i}`,
      name: l.name,
      balance: l.balance,
      interestRate: (l.rateBp || 800) / 10000,
      monthlyPayment: l.monthlyPayment || 2_000_000,
    })),
    goals: FIXTURE_C_GOALS.map((g: Goal, i: number) => ({
      id: g.id || `g_c_${i}`,
      title: g.title,
      category: (g.kind === 'home' ? 'home' : 'emergency'),
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      deadlineMonths: 36,
      priority: g.priority === 1 ? 'critical' : 'important',
    })),
    ledger: [
      { id: 'l_c1', occurredOn: '2026-03-01', amount: 35_000_000, type: 'income', category: 'salary', note: 'Lương kỹ sư AI tháng 03' },
      { id: 'l_c2', occurredOn: '2026-03-05', amount: 7_000_000, type: 'expense', category: 'rent', note: 'Tiền nhà & phí quản lý' },
      { id: 'l_c3', occurredOn: '2026-03-10', amount: 4_000_000, type: 'expense', category: 'food', note: 'Ăn uống & nhu yếu phẩm' },
      { id: 'l_c4', occurredOn: '2026-03-15', amount: 3_500_000, type: 'expense', category: 'debt_payment', note: 'Trả góp xe' },
      { id: 'l_c5', occurredOn: '2026-03-20', amount: 3_000_000, type: 'expense', category: 'bills', note: 'Tiện ích & dịch vụ' },
      { id: 'l_c6', occurredOn: '2026-03-25', amount: 4_500_000, type: 'expense', category: 'personal', note: 'Chi tiêu giải trí & học tập' },
    ],
    activeChoices: [
      { choiceKey: 'side_job', startedAt: '2026-01-10' },
    ],
    settings: {
      locale: 'vi',
      currency: 'VND',
      notifyGoalDelay: true,
      notifyPortfolioRisk: true,
      notifyWeeklyEmail: true,
      notifyCommunityLessons: true,
    },
  };
}

/** Lấy default data cho một userId */
function getDefaultData(userId: string): UserProfileData {
  if (userId === 'user_fixture_a') return createFixtureAData();
  if (userId === 'user_fixture_b') return createFixtureBData();
  return { ...createFixtureCData(), id: userId };
}

/** Lấy danh sách hồ sơ người dùng đã lưu trong LocalStorage */
export function listUserProfiles(): Array<{ id: string; name: string; email: string; updatedAt: string }> {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(USER_PROFILES_INDEX_KEY);
    if (!raw) {
      const defaultProfiles = [
        { id: 'user_fixture_c', name: 'Lê Hoàng Long (Kỹ sư AI)', email: 'long.le@antam.vn', updatedAt: new Date().toISOString() },
        { id: 'user_fixture_a', name: 'Nguyễn Văn Minh (Khởi nghiệp)', email: 'minh.nguyen@antam.vn', updatedAt: new Date().toISOString() },
        { id: 'user_fixture_b', name: 'Trần Thị Hương (Hộ kinh doanh)', email: 'huong.tran@antam.vn', updatedAt: new Date().toISOString() },
      ];
      storage.setItem(USER_PROFILES_INDEX_KEY, JSON.stringify(defaultProfiles));
      return defaultProfiles;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** Cập nhật index danh sách hồ sơ */
function updateProfilesIndex(profile: { id: string; name: string; email: string; updatedAt: string }) {
  const storage = getStorage();
  if (!storage) return;
  try {
    const profiles = listUserProfiles();
    const existingIndex = profiles.findIndex((p) => p.id === profile.id);
    if (existingIndex >= 0) {
      profiles[existingIndex] = profile;
    } else {
      profiles.unshift(profile);
    }
    storage.setItem(USER_PROFILES_INDEX_KEY, JSON.stringify(profiles));
  } catch (err) {
    console.warn('[LocalStorage] Không thể cập nhật danh mục hồ sơ:', err);
  }
}

/** Lấy ID của người dùng đang được kích hoạt */
export function getActiveUserId(): string {
  const storage = getStorage();
  if (!storage) return 'user_fixture_c';
  try {
    const id = storage.getItem(ACTIVE_USER_KEY);
    return id || 'user_fixture_c';
  } catch {
    return 'user_fixture_c';
  }
}

/** Đổi người dùng kích hoạt */
export function setActiveUserId(userId: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(ACTIVE_USER_KEY, userId);
    dispatchCustomEvent('antam:user_switched', { userId });
  } catch (err) {
    console.warn('[LocalStorage] Không thể đặt active user:', err);
  }
}

/** Đọc dữ liệu người dùng từ LocalStorage (Fail-Closed & Khởi tạo an toàn) */
export function getUserData(userId: string = getActiveUserId()): UserProfileData {
  const storage = getStorage();
  if (!storage) {
    return getDefaultData(userId);
  }
  try {
    const raw = storage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as UserProfileData;
      if (parsed && parsed.version === 1 && parsed.id) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`[LocalStorage] Lỗi đọc dữ liệu cho user ${userId}:`, err);
  }

  // Khởi tạo và ghi trực tiếp
  const initialData = getDefaultData(userId);
  try {
    storage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(initialData));
    updateProfilesIndex({
      id: initialData.id,
      name: initialData.fullName,
      email: initialData.email,
      updatedAt: initialData.updatedAt,
    });
  } catch (err) {
    console.error(`[LocalStorage] Lỗi ghi khởi tạo user ${userId}:`, err);
  }

  return initialData;
}

/** Lưu dữ liệu người dùng vào LocalStorage */
export function saveUserData(userId: string, data: Partial<UserProfileData>): UserProfileData {
  const storage = getStorage();
  const raw = storage?.getItem(`${STORAGE_PREFIX}${userId}`);
  let existing: UserProfileData;
  if (raw) {
    try {
      existing = JSON.parse(raw);
    } catch {
      existing = getDefaultData(userId);
    }
  } else {
    existing = getDefaultData(userId);
  }

  const updated: UserProfileData = {
    ...existing,
    ...data,
    id: userId,
    finance: {
      ...existing.finance,
      ...(data.finance || {}),
    },
    settings: {
      ...existing.settings,
      ...(data.settings || {}),
    },
    updatedAt: new Date().toISOString(),
  };

  if (storage) {
    try {
      storage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(updated));
      updateProfilesIndex({
        id: updated.id,
        name: updated.fullName,
        email: updated.email,
        updatedAt: updated.updatedAt,
      });
      dispatchCustomEvent('antam:data_updated', { userId });
    } catch (err) {
      console.error(`[LocalStorage] Lỗi ghi dữ liệu cho user ${userId}:`, err);
    }
  }

  return updated;
}

/** Xuất bản sao lưu dữ liệu dạng file JSON */
export function exportUserData(userId: string = getActiveUserId()): string {
  const data = getUserData(userId);
  const payload: BackupPayload = {
    schema: 'an-tam-backup-v1',
    exportedAt: new Date().toISOString(),
    appVersion: '1.0.0',
    userData: data,
  };
  return JSON.stringify(payload, null, 2);
}

/** Khôi phục dữ liệu từ chuỗi JSON */
export function importUserData(userId: string, jsonString: string): { success: boolean; message: string } {
  try {
    const payload = JSON.parse(jsonString) as BackupPayload;
    if (!payload || payload.schema !== 'an-tam-backup-v1' || !payload.userData) {
      return { success: false, message: 'Định dạng file sao lưu không hợp lệ. Vui lòng chọn file JSON chuẩn An Tâm AI.' };
    }
    const importedData = payload.userData;
    saveUserData(userId, { ...importedData, id: userId, updatedAt: new Date().toISOString() });
    return { success: true, message: 'Khôi phục dữ liệu tài chính cá nhân thành công!' };
  } catch (err: any) {
    return { success: false, message: `Lỗi đọc file sao lưu: ${err.message || 'Dữ liệu không đúng cấu trúc'}` };
  }
}

/** Đặt lại dữ liệu về mặc định (hoặc theo Canonical Fixture) */
export function resetUserData(userId: string, fixtureKey: 'fixture_a' | 'fixture_b' | 'fixture_c' = 'fixture_c'): UserProfileData {
  let fresh: UserProfileData;
  if (fixtureKey === 'fixture_a') {
    fresh = { ...createFixtureAData(), id: userId };
  } else if (fixtureKey === 'fixture_b') {
    fresh = { ...createFixtureBData(), id: userId };
  } else {
    fresh = { ...createFixtureCData(), id: userId };
  }
  return saveUserData(userId, fresh);
}

/** Xóa hoàn toàn dữ liệu của một tài khoản */
export function deleteUserData(userId: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(`${STORAGE_PREFIX}${userId}`);
    const profiles = listUserProfiles().filter((p) => p.id !== userId);
    storage.setItem(USER_PROFILES_INDEX_KEY, JSON.stringify(profiles));
    if (getActiveUserId() === userId) {
      const nextId = profiles[0]?.id || 'user_fixture_c';
      setActiveUserId(nextId);
    }
    dispatchCustomEvent('antam:data_updated', { userId });
  } catch (err) {
    console.error(`[LocalStorage] Lỗi xóa dữ liệu user ${userId}:`, err);
  }
}
