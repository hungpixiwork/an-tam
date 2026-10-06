import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('docs/anh-chup-giao-dien');
fs.mkdirSync(outDir, { recursive: true });

function run(cmd) {
  try {
    return execSync(`agent-browser --session antam ${cmd}`, { stdio: 'pipe', encoding: 'utf-8' });
  } catch (err) {
    console.error(`Lỗi thực thi [${cmd}]:`, err.message);
    return null;
  }
}

const VIEWPORTS = [
  { name: 'Mobile_375', w: 375, h: 812 },
  { name: 'Mobile_430', w: 430, h: 932 },
  { name: 'Tablet_768', w: 768, h: 1024 },
  { name: 'Tablet_1024', w: 1024, h: 768 },
  { name: 'Laptop_1280', w: 1280, h: 800 },
  { name: 'Laptop_1366', w: 1366, h: 768 },
  { name: 'Laptop_1440', w: 1440, h: 900 },
  { name: 'Desktop_1536', w: 1536, h: 864 },
  { name: 'Desktop_1920', w: 1920, h: 1080 },
];

const routes = [
  { slug: '01_Tong_Quan', path: '/', title: 'Tổng quan' },
  { slug: '02_So_Thu_Chi_Tong_Quan', path: '/thu-chi', title: 'Sổ thu chi — Tổng quan' },
  { slug: '02_So_Thu_Chi_Giao_Dich', path: '/thu-chi?tab=giao-dich', title: 'Sổ thu chi — Giao dịch' },
  { slug: '02_So_Thu_Chi_Thoi_Quen', path: '/thu-chi?tab=thoi-quen', title: 'Sổ thu chi — Thói quen' },
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
  console.log('🚀 Bắt đầu quy trình chụp ảnh màn hình và audit responsive toàn bộ An Tâm AI...');

  // 1. Mở trang đăng nhập và đăng nhập tài khoản demo
  console.log('🔑 Đang đăng nhập tài khoản demo...');
  run('open http://localhost:5173/dang-nhap');
  run('wait 1000');

  // Điền form và submit bằng JavaScript trong browser
  run(`eval "document.querySelector('input[type=email]').value='hung.demo@antam.vn'; document.querySelector('input[type=email]').dispatchEvent(new Event('input', {bubbles:true})); document.querySelector('input[type=password]').value='demo12345'; document.querySelector('input[type=password]').dispatchEvent(new Event('input', {bubbles:true})); document.querySelector('button[type=submit]').click();"`);
  run('wait 2000');

  // Đặt locale sang tiếng Việt
  run(`eval "localStorage.setItem('antam_locale', 'vi')"`);

  // Kiểm tra URL hiện tại
  const currentUrl = run('eval "location.href"');
  console.log('📍 URL sau đăng nhập:', currentUrl);

  // 2. Chụp từng màn hình trên các viewports chính
  for (const r of routes) {
    console.log(`\n📸 Đang chụp route: [${r.slug}] ${r.title} (${r.path})...`);
    run(`open http://localhost:5173${r.path}`);
    run('wait 1200');

    // Chụp các viewports tiêu biểu
    for (const vp of VIEWPORTS) {
      run(`set viewport ${vp.w} ${vp.h}`);
      run('wait 500');
      const filename = `${r.slug}_${vp.name}.png`;
      run(`screenshot "${path.join(outDir, filename)}"`);
      process.stdout.write(`  ✓ ${vp.name} (${vp.w}x${vp.h}) `);
    }
    console.log('');
  }

  console.log('\n✨ ĐÃ HOÀN TẤT CHỤP ẢNH TOÀN BỘ MÀN HÌNH TẠI docs/anh-chup-giao-dien/');
}

main();

