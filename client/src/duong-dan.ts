// NGUỒN SỰ THẬT DUY NHẤT cho đường dẫn. Mọi link, nút, điều hướng trong app PHẢI dùng DUONG_DAN.
// Không viết tay chuỗi "/..." phân mảnh khắp nơi.

/** Mẫu đường dẫn dùng khi khai báo route trong React Router. */
export const MAU = {
  tongQuan: '/',
  thuChi: '/thu-chi',
  quyAnToan: '/quy-an-toan',
  tangThuNhap: '/tang-thu-nhap',
  luaChon: '/lua-chon',
  danhMuc: '/danh-muc',
  lichAi: '/lich-ai',
  moPhong: '/mo-phong',
  moPhongKetQua: '/mo-phong/ket-qua/:runId',
  aiWorkspace: '/ai-workspace',
  nhatKyAi: '/nhat-ky-ai',
  congDong: '/cong-dong',
  caiDat: '/cai-dat',
  dangNhap: '/dang-nhap',
  dangKy: '/dang-ky',
  batDau: '/bat-dau',
  devPixel: '/dev/pixel',
} as const;

/** Hàm dựng đường dẫn thật chuẩn xác. */
export const DUONG_DAN = {
  tongQuan: () => '/',
  thuChi: (tab?: string) => (tab ? `/thu-chi?tab=${tab}` : '/thu-chi'),
  quyAnToan: (tab?: string) => (tab ? `/quy-an-toan?tab=${tab}` : '/quy-an-toan'),
  tangThuNhap: () => '/tang-thu-nhap',
  luaChon: (kichBanId?: string) => (kichBanId ? `/lua-chon?kb=${kichBanId}` : '/lua-chon'),
  danhMuc: () => '/danh-muc',
  lichAi: () => '/lich-ai',
  moPhong: () => '/mo-phong',
  moPhongKetQua: (runId: string) => `/mo-phong/ket-qua/${runId}`,
  aiWorkspace: () => '/ai-workspace',
  nhatKyAi: () => '/nhat-ky-ai',
  congDong: () => '/cong-dong',
  caiDat: () => '/cai-dat',
  dangNhap: () => '/dang-nhap',
  dangKy: () => '/dang-ky',
  batDau: () => '/bat-dau',
  devPixel: () => '/dev/pixel',
} as const;

/** 5 tab điều hướng chính cố định cho toàn bộ ứng dụng An Tâm. */
export const CAC_TAB = [
  { id: 'tongQuan', nhan: 'Tổng quan', den: DUONG_DAN.tongQuan(), bieuTuong: 'Activity', khop: (p: string) => p === '/' },
  { id: 'quyAnToan', nhan: 'Quỹ an toàn', den: DUONG_DAN.quyAnToan(), bieuTuong: 'ShieldCheck', khop: (p: string) => p.startsWith('/quy-an-toan') },
  { id: 'danhMuc', nhan: 'Danh mục', den: DUONG_DAN.danhMuc(), bieuTuong: 'PieChart', khop: (p: string) => p.startsWith('/danh-muc') },
  { id: 'tangThuNhap', nhan: 'Tăng thu nhập', den: DUONG_DAN.tangThuNhap(), bieuTuong: 'TrendingUp', khop: (p: string) => p.startsWith('/tang-thu-nhap') },
  { id: 'luaChon', nhan: 'Kịch bản sống', den: DUONG_DAN.luaChon(), bieuTuong: 'Sliders', khop: (p: string) => p.startsWith('/lua-chon') || p.startsWith('/mo-phong') },
] as const;
