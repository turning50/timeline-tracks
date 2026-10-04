import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:4173/timeline-tracks/",
    viewport: { width: 390, height: 844 },
    launchOptions: process.env.TT_CHROMIUM_PATH
      ? {
          executablePath: process.env.TT_CHROMIUM_PATH,
          args: [
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--use-gl=angle",
            "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader",
          ],
        }
      : {},
  },
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173/timeline-tracks/",
    reuseExistingServer: false,
  },
  reporter: "list",
});
