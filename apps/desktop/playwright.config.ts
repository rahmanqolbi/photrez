import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["line"]],
  use: {
    baseURL: "http://127.0.0.1:1420",
    trace: "on-first-retry",
    launchOptions: {
      args: ["--use-gl=angle", "--use-angle=swiftshader-webgl"],
    },
  },
  webServer: {
    command: process.env.CI
      ? "bun run preview -- --port 1420 --host 127.0.0.1"
      : "bun run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:1420",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1366, height: 820 },
      },
    },
  ],
});
