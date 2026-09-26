import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getVersionInfo() {
  let commitHash = 'unknown';
  try {
    commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    commitHash = process.env.CF_PAGES_COMMIT_SHA?.slice(0, 7) ||
      process.env.GITHUB_SHA?.slice(0, 7) ||
      process.env.COMMIT_HASH?.slice(0, 7) ||
      'dev-' + Date.now().toString(36);
  }

  let appVersion = '1.0.0';
  try {
    const pkgPath = resolve(__dirname, '../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    if (pkg.version && pkg.version !== '0.0.0') {
      appVersion = pkg.version;
    } else {
      const rootPkgPath = resolve(__dirname, '../../package.json');
      const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'));
      if (rootPkg.version) appVersion = rootPkg.version;
    }
  } catch {
    // fallback default
  }

  const now = new Date();
  return {
    version: appVersion,
    commit: commitHash,
    buildTime: now.toISOString(),
    timestamp: now.getTime(),
  };
}

export function writeVersionFile(targetPath) {
  const versionInfo = getVersionInfo();
  const dir = dirname(targetPath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(targetPath, JSON.stringify(versionInfo, null, 2) + '\n', 'utf-8');
  return versionInfo;
}

// Chạy trực tiếp qua CLI (node scripts/generate-version.mjs)
if (process.argv[1] === __filename) {
  const publicVersionPath = resolve(__dirname, '../public/version.json');
  const info = writeVersionFile(publicVersionPath);
  console.log(`[generate-version] Sinh version.json thành công tại: ${publicVersionPath}`);
  console.log(JSON.stringify(info, null, 2));
}
