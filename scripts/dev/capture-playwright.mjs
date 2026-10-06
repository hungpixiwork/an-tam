import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('docs/anh-chup-giao-dien');
fs.mkdirSync(outDir, { recursive: true });

const routes = [
  { slug: '01_Tong_Quan', path: '/', title: 'Tổng quan' },
  { slug: '02_So_Thu_Chi', path: '/thu-chi', title: 'Sổ thu chi' },
  { slug: '03_Quy_An_Toan', path: '/quy-an-toan', title: 'Quỹ an toàn' },
  { slug: '04_Tang_Thu_Nhap', path: '/tang-thu-nhap', title: 'Tăng thu nhập' },
  { slug: '05_Lua_Chon_Cuoc_Doi', path: '/lua-chon', title: 'Lựa chọn cuộc đời' },
  { slug: '06_Lich_AI', path: '/lich-ai', title: 'Lịch AI' },
  { slug: '07_Mo_Phong_Cu_Soc', path: '/mo-phong', title: 'Mô phỏng cú sốc kép' },
  { slug: '08_Danh_Muc_Tai_San', path: '/danh-muc', title: 'Danh mục tài sản' },
  { slug: '09_AI_Workspace', path: '/ai-workspace', title: 'AI Workspace & MCP' },
  { slug: '10_Nhat_Ky_AI', path: '/nhat-ky-ai', title: 'Nhật ký AI & Kiểm toán' },
  { slug: '11_Cai_Dat', path: '/cai-dat', title: 'Cài đặt hệ thống' },
];

async function main() {
  console.log('🚀 Khởi chạy Chromium chụp ảnh...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  // 1. Chụp trang đăng nhập
  console.log('📸 Chụp trang Đăng nhập...');
  await page.goto('http://localhost:5173/dang-nhap', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outDir, '00_Dang_Nhap_Desktop.png') });

  // 2. Thực hiện đăng nhập
  console.log('🔑 Đăng nhập demo...');
  await page.fill('input[type="email"]', 'hung.demo@antam.vn');
  await page.fill('input[type="password"]', 'demo12345');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // 3. Lần lượt chụp từng trang
  for (const r of routes) {
    console.log(`📸 Chụp [${r.slug}] ${r.title}...`);
    
    // Desktop 1440x900
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`http://localhost:5173${r.path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, `${r.slug}_Desktop.png`) });
    await page.screenshot({ path: path.join(outDir, `${r.slug}_Desktop_Full.png`), fullPage: true });

    // Mobile 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, `${r.slug}_Mobile.png`) });
  }

  await browser.close();
  console.log('✨ HOÀN TẤT CHỤP ẢNH TOÀN BỘ GIAO DIỆN!');
}

main().catch((err) => {
  console.error('Lỗi chụp ảnh:', err);
  process.exit(1);
});
