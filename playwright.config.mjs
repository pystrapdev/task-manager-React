import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir: './tests/browser',
 fullyParallel: false,
 use: { baseURL: 'http://127.0.0.1:4317', channel: 'chrome', headless: true, viewport: { width: 1440, height: 1080 } },
 webServer: { command: 'node tests/serve-static.mjs', url: 'http://127.0.0.1:4317', env: { PORT: '4317', HOST: '127.0.0.1' }, reuseExistingServer: false },
 reporter: 'list'
});
