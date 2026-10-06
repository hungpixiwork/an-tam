import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('docs/anh-chup-giao-dien');
fs.mkdirSync(outDir, { recursive: true });

function run(cmd) {
  try {
    const res = execSync(`agent-browser --session antam ${cmd}`, { stdio: 'pipe', encoding: 'utf-8' });
    return res;
  } catch (err) {
    console.error(`Lỗi thực thi [${cmd}]:`, err.message);
    return null;
  }
}

async function main() {
  console.log('📅 Điều hướng tới /lich-ai...');
  run('open http://localhost:5173/lich-ai');
  run('wait 2000');

  // 1. Mobile 393 x 852 (Target chính theo yêu cầu)
  console.log('📸 Chụp Mobile 393x852...');
  run('set viewport 393 852');
  run('wait 800');
  run(`screenshot "${path.join(outDir, '06_Lich_AI_393x852.png')}"`);
  run(`screenshot "${path.join(outDir, '06_Lich_AI_Mobile.png')}"`);
  run(`screenshot "${path.join(outDir, '06_Lich_AI_Mobile_Full.png')}" --full`);

  // 2. Mobile 375 x 812 (iPhone standard)
  console.log('📸 Chụp Mobile 375x812...');
  run('set viewport 375 812');
  run('wait 600');
  run(`screenshot "${path.join(outDir, '06_Lich_AI_375x812.png')}"`);

  // 3. Mobile 430 x 932 (iPhone Pro Max)
  console.log('📸 Chụp Mobile 430x932...');
  run('set viewport 430 932');
  run('wait 600');
  run(`screenshot "${path.join(outDir, '06_Lich_AI_430x932.png')}"`);

  // 4. Desktop 1440 x 900
  console.log('📸 Chụp Desktop 1440x900...');
  run('set viewport 1440 900');
  run('wait 800');
  run(`screenshot "${path.join(outDir, '06_Lich_AI_Desktop.png')}"`);
  run(`screenshot "${path.join(outDir, '06_Lich_AI_Desktop_Full.png')}" --full`);

  // 5. Test Quick Create Modal trên Mobile 393x852
  console.log('📸 Mở Quick Create Modal trên Mobile...');
  run('set viewport 393 852');
  run('wait 500');
  run('eval "document.querySelector(\'button[aria-label=\\\"Tạo lịch mới\\\"]\')?.click()"');
  run('wait 800');
  run(`screenshot "${path.join(outDir, '06_Lich_AI_Quick_Create_Modal.png')}"`);

  console.log('✨ ĐÃ HOÀN TẤT CHỤP ẢNH TOÀN BỘ!');
}

main();
