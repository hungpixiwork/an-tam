import { execSync } from 'node:child_process'
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function versionPlugin(): Plugin {
  return {
    name: 'vite-plugin-version-info',
    buildStart() {
      try {
        let commitHash = 'unknown'
        try {
          commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
        } catch {
          commitHash = process.env.CF_PAGES_COMMIT_SHA?.slice(0, 7) ||
            process.env.GITHUB_SHA?.slice(0, 7) ||
            process.env.COMMIT_HASH?.slice(0, 7) ||
            'dev-' + Date.now().toString(36)
        }

        let appVersion = '1.0.0'
        try {
          const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'))
          if (pkg.version && pkg.version !== '0.0.0') {
            appVersion = pkg.version
          } else {
            const rootPkg = JSON.parse(readFileSync(resolve(process.cwd(), '../package.json'), 'utf-8'))
            if (rootPkg.version) appVersion = rootPkg.version
          }
        } catch {}

        const now = new Date()
        const versionData = {
          version: appVersion,
          commit: commitHash,
          buildTime: now.toISOString(),
          timestamp: now.getTime(),
        }

        const publicDir = resolve(process.cwd(), 'public')
        mkdirSync(publicDir, { recursive: true })
        writeFileSync(resolve(publicDir, 'version.json'), JSON.stringify(versionData, null, 2) + '\n', 'utf-8')
      } catch (err) {
        console.warn('[vite-plugin-version-info] Không thể tạo public/version.json:', err)
      }
    },
    generateBundle() {
      try {
        const publicVersionPath = resolve(process.cwd(), 'public/version.json')
        const content = readFileSync(publicVersionPath, 'utf-8')
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: content,
        })
      } catch {}
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    versionPlugin(),
  ],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Cho phép import code dùng chung ở ../shared
    fs: { allow: ['..'] },
    // API chạy bằng `wrangler dev` ở cổng 8787
    proxy: { '/api': `http://localhost:${process.env.API_PORT ?? 8787}` },
  },
  build: {
    manifest: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Rolldown: nhóm có ưu tiên — React phải vào vendor-react trước, nếu không nhóm biểu đồ (recharts import React)
        // sẽ kéo cả React vào vendor-charts và mọi trang phải tải sẵn recharts (~117 KB gz).
        advancedChunks: {
          groups: [
            { name: 'vendor-react', priority: 40, test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
            { name: 'vendor-query', priority: 30, test: /[\\/]node_modules[\\/]@tanstack[\\/]/ },
            { name: 'vendor-icons', priority: 30, test: /[\\/]node_modules[\\/]lucide-react[\\/]/ },
            { name: 'vendor-charts', priority: 10, test: /[\\/]node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|react-is|es-toolkit|decimal\.js-light|eventemitter3|@reduxjs|redux|reselect|immer|react-redux|use-sync-external-store|tiny-invariant|clsx)[\\/]/ },
          ],
        },
      },
    },
  },
})
