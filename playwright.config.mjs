import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir: './tests/browser',
 fullyParallel: false,
 use: { baseURL: 'http://127.0.0.1:4317', channel: 'chrome', headless: true, viewport: { width: 1440, height: 1080 } },
 webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 4317 --strictPort', url: 'http://127.0.0.1:4317', reuseExistingServer: false },
 reporter: 'list'
});
